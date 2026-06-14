// Sends an online order's details to the restaurant's WhatsApp via the WhatsApp
// Cloud API. Runs server-side (token is a Supabase secret). Triggered for every
// online order (Renukoot + Renusagar) when it enters the confirm queue.
//
// WhatsApp rule: to message a number that hasn't messaged the business in the
// last 24h, you must use an APPROVED template. So this sends a template with a
// single body parameter ({{1}}) = the one-line order summary.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v21.0'
const TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID') ?? ''
const TO = Deno.env.get('WHATSAPP_TO') ?? ''
const TEMPLATE = Deno.env.get('WHATSAPP_TEMPLATE') ?? 'online_order'
const TEMPLATE_LANG = Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'en'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const outletName = (o: string) => o === 'renusagar' ? 'Renusagar' : 'Renukoot'

// One-line summary (no newlines/tabs — WhatsApp template params forbid them).
function summarize(order: any): string {
  let notes: any = {}
  try { notes = order.notes ? JSON.parse(order.notes) : {} } catch { notes = {} }
  const type = order.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'
  const items = (order.items || []).map((it: any) => `${it.quantity}x ${it.menuItem?.name || it.itemName || 'Item'}`).join(', ')
  const pay = order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'Paid online'
  const cust = order.user?.name || order.customerName || 'Customer'
  const phone = order.user?.phone || order.customerPhone || ''
  const where = order.deliveryAddress ? ` | Address: ${order.deliveryAddress}` : ''
  const note = notes.text ? ` | Note: ${notes.text}` : ''
  return `${outletName(order.outlet)} | ${type} | #${String(order.id).slice(0, 8).toUpperCase()} | ₹${parseFloat(order.total).toFixed(0)} | ${pay} | ${cust} ${phone} | Items: ${items}${where}${note}`.replace(/\s+/g, ' ').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (!TOKEN || !PHONE_ID || !TO) return json({ error: 'WhatsApp not configured (missing token/phone id/recipient)' }, 400)
    const { orderId } = await req.json()
    if (!orderId) return json({ error: 'orderId required' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: order, error } = await admin
      .from('Order')
      .select('id, total, outlet, orderType, deliveryAddress, customerName, customerPhone, paymentMethod, notes, tableLabel, user:User(name, phone), items:OrderItem(quantity, itemName, menuItem:MenuItem(name))')
      .eq('id', orderId)
      .single()
    if (error || !order) return json({ error: 'Order not found' }, 404)
    if (order.tableLabel) return json({ skipped: 'POS order' }) // online only

    const body = {
      messaging_product: 'whatsapp',
      to: TO,
      type: 'template',
      template: {
        name: TEMPLATE,
        language: { code: TEMPLATE_LANG },
        components: [{ type: 'body', parameters: [{ type: 'text', text: summarize(order) }] }],
      },
    }
    const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: 'WhatsApp send failed', details: data }, 400)
    return json({ sent: true, id: data.messages?.[0]?.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
