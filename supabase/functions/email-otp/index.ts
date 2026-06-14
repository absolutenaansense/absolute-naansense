// Forgot-password email OTP. action 'send' emails a 6-digit code (via Resend) to
// a registered email; action 'verify' validates it. Password hashing/update stays
// client-side (matches the app's existing bcryptjs reset), gated by a verified OTP.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Absolute Naansense <onboarding@resend.dev>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const OTP_TTL_MIN = 10

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const norm = (e: string) => (e || '').trim().toLowerCase()
const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000))

async function sendEmail(to: string, code: string) {
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#b45309">Absolute Naansense — Password reset</h2>
      <p>Use this code to reset your password. It expires in ${OTP_TTL_MIN} minutes.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;text-align:center;color:#9a3412">${code}</div>
      <p style="color:#78716c;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject: `Your password reset code: ${code}`, html }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || 'email send failed')
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (!RESEND_API_KEY) return json({ error: 'Email not configured' }, 400)
    const { action, email, code } = await req.json()
    const e = norm(email)
    if (!e) return json({ error: 'Email required' }, 400)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    if (action === 'send') {
      const { data: user } = await admin.from('User').select('id').ilike('email', e).maybeSingle()
      if (!user) return json({ error: 'No account is registered with that email' }, 404)
      const otp = sixDigits()
      const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60000).toISOString()
      await admin.from('PasswordOtp').delete().ilike('email', e)   // clear old codes
      const { error: insErr } = await admin.from('PasswordOtp').insert([{ email: e, code: otp, expiresAt }])
      if (insErr) return json({ error: insErr.message }, 400)
      try { await sendEmail(e, otp) } catch (err) { console.error('resend send failed:', err); return json({ error: "We couldn't send the code right now. Please try again shortly or contact us on WhatsApp." }, 400) }
      return json({ sent: true })
    }

    if (action === 'verify') {
      if (!code) return json({ error: 'Code required' }, 400)
      const { data: row } = await admin.from('PasswordOtp').select('*').ilike('email', e).eq('used', false).order('createdAt', { ascending: false }).limit(1).maybeSingle()
      if (!row) return json({ error: 'No active code — please request a new one' }, 400)
      if (new Date(row.expiresAt).getTime() < Date.now()) return json({ error: 'Code expired — request a new one' }, 400)
      if (row.attempts >= 5) return json({ error: 'Too many attempts — request a new code' }, 400)
      if (String(row.code) !== String(code).trim()) {
        await admin.from('PasswordOtp').update({ attempts: row.attempts + 1 }).eq('id', row.id)
        return json({ error: 'Incorrect code' }, 400)
      }
      await admin.from('PasswordOtp').update({ used: true }).eq('id', row.id)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
