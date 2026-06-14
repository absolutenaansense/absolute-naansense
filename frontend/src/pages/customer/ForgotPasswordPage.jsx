import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, MessageCircle, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/api'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1)   // 1 = enter email, 2 = enter code + new password
  const [form, setForm] = useState({ email: '', code: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const field = (key) => ({ value: form[key], onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })) })

  const sendCode = async (e) => {
    e?.preventDefault()
    if (!form.email) { toast.error('Enter your registered email'); return }
    setLoading(true)
    try {
      await authApi.sendResetOtp(form.email.trim())
      toast.success('Code sent — check your email')
      setStep(2)
    } catch (err) { toast.error(err.response?.data?.error || 'Could not send code') }
    finally { setLoading(false) }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(form.code.trim())) { toast.error('Enter the 6-digit code from your email'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await authApi.resetWithOtp({ email: form.email.trim(), code: form.code.trim(), newPassword: form.password })
      toast.success('Password reset! Please sign in with your new password.')
      navigate('/login')
    } catch (err) { toast.error(err.response?.data?.error || 'Could not reset password') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-20 w-20 rounded-full object-cover mx-auto mb-3 ring-1 ring-stone-200 shadow-sm" />
          <h1 className="text-2xl font-semibold text-stone-900">Reset password</h1>
          <p className="text-sm text-stone-500 mt-1">{step === 1 ? "We'll email you a verification code." : 'Enter the code from your email and a new password.'}</p>
        </div>

        <div className="card p-6">
          {step === 1 ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label className="label">Registered email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input className="input pl-9" type="email" placeholder="you@email.com" required {...field('email')} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
                {loading ? 'Sending…' : 'Send code'}{!loading && <ArrowRight size={16} />}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">Code sent to <span className="font-medium text-stone-700">{form.email}</span></div>
              <div>
                <label className="label">6-digit code</label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input className="input pl-9 tracking-[0.4em] font-mono" inputMode="numeric" maxLength={6} placeholder="••••••" required {...field('code')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">New password</label><input className="input" type="password" placeholder="Min 6 chars" required {...field('password')} /></div>
                <div><label className="label">Confirm</label><input className="input" type="password" placeholder="Repeat" required {...field('confirm')} /></div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
                {loading ? 'Resetting…' : 'Reset password'}{!loading && <ArrowRight size={16} />}
              </button>
              <button type="button" onClick={sendCode} disabled={loading} className="w-full text-center text-xs text-stone-500 hover:text-stone-700">Didn't get it? Resend code</button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 mb-2">No email on your account? We'll reset it for you.</p>
            <a href="https://wa.me/918299018895?text=Hi,%20I%20need%20to%20reset%20my%20Absolute%20Naansense%20password" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <MessageCircle size={15} /> Contact us on WhatsApp
            </a>
          </div>

          <p className="text-center text-sm text-stone-500 mt-5">
            Remembered it? <Link to="/login" className="text-brand-500 font-medium hover:text-brand-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
