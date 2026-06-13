// petpooja-callback
// Public endpoint PetPooja POSTs to when an order's status changes.
// On "Accepted" (KOT printed) we set the order to 'preparing'; later statuses
// advance it further. Register this function's URL with PetPooja as the
// integration callback URL (it is also sent per-order as `callback_url`).
//
// Deployed with verify_jwt = false (see supabase/config.toml) because PetPooja
// cannot send Supabase auth. We guard with a shared secret in the query string.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mapPetpoojaStatus } from '../_shared/petpooja.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CALLBACK_SECRET = Deno.env.get('PETPOOJA_CALLBACK_SECRET') ?? ''

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  // Guard: require ?secret=... to match (register the URL with this query param).
  if (CALLBACK_SECRET) {
    const url = new URL(req.url)
    if (url.searchParams.get('secret') !== CALLBACK_SECRET) {
      return json({ status: 'error', message: 'unauthorized' }, 401)
    }
  }

  let body: any = {}
  try { body = await req.json() } catch { return json({ status: 'error', message: 'bad json' }, 400) }

  // TODO(petpooja): confirm the field names PetPooja sends in the callback.
  // Common shape: { restID, orderID, status, cancel_reason, minimum_prep_time, ... }
  const orderID: string | undefined = body.orderID ?? body.order_id ?? body.orderId
  const rawStatus = body.status ?? body.order_status
  if (!orderID || rawStatus === undefined) {
    return json({ status: 'error', message: 'missing orderID/status' }, 400)
  }

  const mapped = mapPetpoojaStatus(rawStatus)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Match either our order id (we send orderID = our id) or the stored PetPooja id.
  const update: Record<string, unknown> = {
    petpoojaStatus: String(rawStatus),
    updatedAt: new Date().toISOString(),
  }
  if (mapped) update.status = mapped

  const { data, error } = await supabase
    .from('Order')
    .update(update)
    .or(`id.eq.${orderID},petpoojaOrderId.eq.${orderID}`)
    .select('id, status')

  if (error) return json({ status: 'error', message: error.message }, 500)
  if (!data || data.length === 0) return json({ status: 'error', message: 'order not found' }, 404)

  // TODO(petpooja): PetPooja may expect a specific ack body — adjust if their doc requires it.
  return json({ status: 'success' })
})
