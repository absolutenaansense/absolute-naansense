// Notifies the restaurant about a new ONLINE order (delivery/takeaway): an email
// to the outlet's address (via Resend) + a best-effort WhatsApp. Runs server-side,
// triggered when an online order enters the confirm queue. POS/captain (dine-in,
// tableLabel) orders are skipped.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v21.0'
const TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID') ?? ''
const TO = Deno.env.get('WHATSAPP_TO') ?? ''
const TEMPLATE = Deno.env.get('WHATSAPP_TEMPLATE') ?? 'online_order'
const TEMPLATE_LANG = Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'en'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Absolute Naansense <noreply@absolutenaansense.com>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// New online order alerts go to the outlet's inbox.
const OUTLET_EMAIL: Record<string, string> = {
  renukoot: 'naansense.absolute@gmail.com',
  renusagar: 'naansense.50hz@gmail.com',
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const outletName = (o: string) => o === 'renusagar' ? 'Renusagar' : 'Renukoot'
const istTime = (iso: string) => { try { return new Date(/[Z+]/.test(iso) ? iso : iso + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso } }

function notesOf(order: any) { try { return order.notes ? JSON.parse(order.notes) : {} } catch { return {} } }

// One-line summary (no newlines — WhatsApp template params forbid them).
function summarize(order: any): string {
  const n = notesOf(order)
  const type = order.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'
  const items = (order.items || []).map((it: any) => `${it.quantity}x ${it.menuItem?.name || it.itemName || 'Item'}`).join(', ')
  const pay = order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'Paid online'
  const cust = order.user?.name || order.customerName || 'Customer'
  const phone = order.user?.phone || order.customerPhone || ''
  const where = order.deliveryAddress ? ` | Address: ${order.deliveryAddress}` : ''
  const note = n.text ? ` | Note: ${n.text}` : ''
  return `${outletName(order.outlet)} | ${type} | #${String(order.id).slice(0, 8).toUpperCase()} | ₹${parseFloat(order.total).toFixed(0)} | ${pay} | ${cust} ${phone} | Items: ${items}${where}${note}`.replace(/\s+/g, ' ').trim()
}

// Plain-text order details (the copyable block).
function detailsText(order: any): string {
  const n = notesOf(order)
  const lines: string[] = []
  lines.push(`Order #${String(order.id).slice(0, 8).toUpperCase()}`)
  lines.push(`Outlet: ${outletName(order.outlet)}`)
  lines.push(`Type: ${order.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'}`)
  lines.push(`Time: ${istTime(order.createdAt)}`)
  lines.push(`Customer: ${order.user?.name || order.customerName || '-'}  ${order.user?.phone || order.customerPhone || ''}`)
  if (order.deliveryAddress) lines.push(`Address: ${order.deliveryAddress}`)
  lines.push(`Payment: ${order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'Paid online'} (${order.paymentStatus})`)
  lines.push('')
  lines.push('Items:')
  for (const it of order.items || []) {
    lines.push(`  ${it.quantity} x ${it.menuItem?.name || it.itemName || 'Item'}  -  Rs ${(parseFloat(it.price) * it.quantity).toFixed(0)}`)
    if (it.specialRequest) lines.push(`      * ${it.specialRequest}`)
  }
  if (n.deliveryFee != null || n.convenienceFee != null) {
    if (n.deliveryFee) lines.push(`Delivery: Rs ${n.deliveryFee}`)
    if (n.convenienceFee) lines.push(`Delivery convenience: Rs ${n.convenienceFee}`)
  }
  lines.push(`TOTAL: Rs ${parseFloat(order.total).toFixed(0)}`)
  if (n.text) lines.push(`Note: ${n.text}`)
  return lines.join('\n')
}

async function sendEmail(to: string, order: any) {
  const subj = `New ${order.orderType === 'TAKEAWAY' ? 'takeaway' : 'delivery'} order — ${outletName(order.outlet)} — ₹${parseFloat(order.total).toFixed(0)}`
  const block = detailsText(order)
  const copyUrl = `https://absolutenaansense.in/copy#${encodeURIComponent(block)}`
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto;color:#1c1917">
      <h2 style="color:#4d7c0f;margin-bottom:4px">🔔 New online order — ${esc(outletName(order.outlet))}</h2>
      <p style="color:#78716c;margin-top:0">${esc(istTime(order.createdAt))}</p>
      <a href="${copyUrl}" style="display:inline-block;background:#4d7c0f;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:10px;margin:10px 0">📋 Copy order details</a>
      <p style="margin:10px 0 6px;color:#78716c;font-size:13px">…or select the box below and copy:</p>
      <pre style="white-space:pre-wrap;background:#f5f5f4;border:1px solid #e7e5e4;border-radius:10px;padding:14px;font-size:13px;line-height:1.5;user-select:all;-webkit-user-select:all">${esc(block)}</pre>
      <p style="color:#a8a29e;font-size:12px">Absolute Naansense — automated order notification.</p>
    </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject: subj, html, text: block }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || 'email failed')
  return data
}

async function sendWhatsApp(order: any) {
  if (!TOKEN || !PHONE_ID || !TO) return { ok: false, reason: 'not configured' }
  const text = summarize(order)
  const send = (payload: unknown) => fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  let res = await send({ messaging_product: 'whatsapp', to: TO, type: 'template', template: { name: TEMPLATE, language: { code: TEMPLATE_LANG }, components: [{ type: 'body', parameters: [{ type: 'text', text }] }] } })
  let data = await res.json()
  if (!res.ok && [132000, 132001, 132015, 132007].includes(data?.error?.code)) {
    res = await send({ messaging_product: 'whatsapp', to: TO, type: 'text', text: { body: `🔔 New online order\n\n${text}\n\n— Absolute Naansense` } })
    data = await res.json()
  }
  return { ok: res.ok, data }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { orderId } = await req.json()
    if (!orderId) return json({ error: 'orderId required' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: order, error } = await admin
      .from('Order')
      .select('id, total, outlet, orderType, deliveryAddress, customerName, customerPhone, paymentMethod, paymentStatus, notes, tableLabel, createdAt, user:User(name, phone), items:OrderItem(quantity, price, itemName, specialRequest, menuItem:MenuItem(name))')
      .eq('id', orderId).single()
    if (error || !order) return json({ error: 'Order not found' }, 404)
    if (order.tableLabel) return json({ skipped: 'POS/captain order' })   // online only

    const result: Record<string, unknown> = {}
    // Email the outlet (primary, reliable).
    const to = OUTLET_EMAIL[order.outlet || 'renukoot'] || OUTLET_EMAIL.renukoot
    if (RESEND_API_KEY) {
      try { await sendEmail(to, order); result.emailSent = true; result.emailTo = to }
      catch (e) { result.emailSent = false; result.emailError = String((e as Error).message || e) }
    }
    // WhatsApp (best-effort; may be down if token expired).
    try { const w = await sendWhatsApp(order); result.whatsappSent = w.ok } catch { result.whatsappSent = false }

    return json(result)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
