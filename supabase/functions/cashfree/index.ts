// Cashfree Payment Gateway — server-side order creation + verification.
// Secret keys live only here (Supabase secrets), never in the browser.
//
//   action: 'create' { orderId }  -> creates a Cashfree order, returns payment_session_id
//   action: 'status' { orderId }  -> checks Cashfree, marks our Order paid if so
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CF_BASE = 'https://api.cashfree.com/pg'
const CF_ID = Deno.env.get('CASHFREE_CLIENT_ID') ?? ''
const CF_SECRET = Deno.env.get('CASHFREE_CLIENT_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const cfHeaders = {
  'x-client-id': CF_ID,
  'x-client-secret': CF_SECRET,
  'x-api-version': '2023-08-01',
  'Content-Type': 'application/json',
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const sanitizePhone = (p: string) => {
  const d = (p || '').replace(/\D/g, '')
  return d.length >= 10 ? d.slice(-10) : '9999999999'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const action = body.action
    const orderId = String(body.orderId || '')
    if (!orderId) return json({ error: 'orderId required' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    if (action === 'create') {
      const { data: order, error } = await admin
        .from('Order')
        .select('id, total, outlet, user:User(name, phone, email)')
        .eq('id', orderId)
        .single()
      if (error || !order) return json({ error: 'Order not found' }, 404)

      const cust = (order as any).user || {}
      const payload = {
        order_id: order.id,
        order_amount: Number(order.total),
        order_currency: 'INR',
        customer_details: {
          customer_id: String(order.id).slice(0, 45),
          customer_phone: sanitizePhone(cust.phone),
          customer_name: cust.name || 'Customer',
          customer_email: cust.email || 'orders@absolutenaansense.com',
        },
        order_meta: {
          return_url: `https://absolutenaansense.com/checkout?cf_order=${order.id}`,
        },
        order_note: `Absolute Naansense (${order.outlet || 'renukoot'})`,
      }
      const res = await fetch(`${CF_BASE}/orders`, { method: 'POST', headers: cfHeaders, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) return json({ error: data.message || 'Cashfree order creation failed', details: data }, 400)
      return json({ paymentSessionId: data.payment_session_id, cfOrderId: data.cf_order_id, orderId: order.id })
    }

    if (action === 'status') {
      const res = await fetch(`${CF_BASE}/orders/${orderId}`, { headers: cfHeaders })
      const data = await res.json()
      if (!res.ok) return json({ error: data.message || 'Cashfree status lookup failed' }, 400)
      const paid = data.order_status === 'PAID'
      if (paid) {
        // Mark paid + push into the biller's confirm queue (only if still pending).
        await admin
          .from('Order')
          .update({ paymentStatus: 'paid', status: 'payment_received', paymentMethod: 'QR_UPI', updatedAt: new Date().toISOString() })
          .eq('id', orderId)
          .eq('paymentStatus', 'pending')
      }
      return json({ status: data.order_status, paid })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
