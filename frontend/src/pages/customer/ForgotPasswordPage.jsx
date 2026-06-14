import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Mail, Lock, ArrowRight, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/api'

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ phone: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const field = (key) => ({ value: form[key], onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })) })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await authApi.resetPassword({ phone: form.phone, email: form.email, newPassword: form.password })
      toast.success('Password reset! Please sign in with your new password.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-20 w-20 rounded-full object-cover mx-auto mb-3 ring-1 ring-stone-200 shadow-sm" />
          <h1 className="text-2xl font-semibold text-stone-900">Reset password</h1>
          <p className="text-sm text-stone-500 mt-1">Verify your registered mobile and email to set a new password.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Registered mobile number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input pl-9" type="tel" placeholder="98765 43210" maxLength={10} required {...field('phone')} />
              </div>
            </div>
            <div>
              <label className="label">Registered email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input pl-9" type="email" placeholder="you@email.com" required {...field('email')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">New password</label>
                <input className="input" type="password" placeholder="Min 6 chars" required {...field('password')} />
              </div>
              <div>
                <label className="label">Confirm</label>
                <input className="input" type="password" placeholder="Repeat" required {...field('confirm')} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? 'Resetting…' : 'Reset password'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

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
