// petpooja-push
// Pushes a confirmed order to PetPooja's Save Order API so the KOT prints.
//
// Trigger options (see supabase/functions/README.md):
//   A) Supabase Database Webhook on UPDATE of "Order" -> POSTs the changed row here.
//   B) Direct invoke with JSON body { "orderId": "<uuid>" }.
//
// Only pushes when status === 'confirmed' and the order hasn't been pushed yet.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildSaveOrderPayload, type OrderRow } from '../_shared/petpooja.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PP = {
  appKey: Deno.env.get('PETPOOJA_APP_KEY') ?? '',
  appSecret: Deno.env.get('PETPOOJA_APP_SECRET') ?? '',
  accessToken: Deno.env.get('PETPOOJA_ACCESS_TOKEN') ?? '',
  restID: Deno.env.get('PETPOOJA_RESTID') ?? '',
  callbackUrl: Deno.env.get('PETPOOJA_CALLBACK_URL') ?? '',
}
const SAVE_ORDER_URL = Deno.env.get('PETPOOJA_SAVE_ORDER_URL') ?? ''
const WEBHOOK_SECRET = Deno.env.get('PETPOOJA_PUSH_SECRET') ?? ''

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  // Shared-secret guard (the DB webhook / caller sends this header).
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: any = {}
  try { payload = await req.json() } catch { /* empty body */ }

  // Accept either a DB webhook payload ({ type, record, old_record }) or { orderId }.
  const record = payload.record ?? null
  const orderId: string | undefined = payload.orderId ?? record?.id
  if (!orderId) return json({ error: 'no orderId' }, 400)

  // If invoked by a DB webhook, only act on the transition into 'confirmed'.
  if (record && record.status !== 'confirmed') {
    return json({ skipped: `status is ${record.status}, not confirmed` })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: order, error } = await supabase
    .from('Order')
    .select('*, user:User(name, phone, email), items:OrderItem(quantity, price, menuItem:MenuItem(name, petpoojaItemId))')
    .eq('id', orderId)
    .single<OrderRow & { status: string }>()

  if (error || !order) return json({ error: error?.message ?? 'order not found' }, 404)
  if ((order as any).status !== 'confirmed') return json({ skipped: 'order not confirmed' })
  if (order.petpoojaOrderId) return json({ skipped: 'already pushed', petpoojaOrderId: order.petpoojaOrderId })

  const body = buildSaveOrderPayload(order, PP)

  let ppResp: any
  try {
    const r = await fetch(SAVE_ORDER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    ppResp = await r.json().catch(() => ({}))
  } catch (e) {
    return json({ error: 'petpooja request failed', detail: String(e) }, 502)
  }

  // TODO(petpooja): success shape varies — confirm the success flag + id field name.
  const ok = ppResp?.success === '1' || ppResp?.success === 1 || ppResp?.status === 'success'
  const petpoojaOrderId = ppResp?.orderID ?? ppResp?.order_id ?? ppResp?.restID ?? null

  if (!ok) {
    return json({ error: 'petpooja rejected order', petpoojaResponse: ppResp }, 502)
  }

  await supabase
    .from('Order')
    .update({ petpoojaOrderId: String(petpoojaOrderId ?? order.id), updatedAt: new Date().toISOString() })
    .eq('id', order.id)

  return json({ ok: true, petpoojaOrderId, petpoojaResponse: ppResp })
})
