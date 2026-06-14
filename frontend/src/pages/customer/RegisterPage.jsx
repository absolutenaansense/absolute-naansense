import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, Phone, Mail, Lock, ArrowRight, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!agreed) {
      toast.error('Please accept the Terms & Conditions and Privacy Policy to continue')
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.register({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
      })
      setUser(data.user, data.token)
      toast.success('Account created! Welcome to Absolute Naansense.')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })),
  })

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-24 w-24 rounded-full object-cover mx-auto mb-3 ring-1 ring-stone-200 shadow-sm" />
          <h1 className="text-2xl font-semibold text-stone-900">
            Absolute <span className="text-brand-500">Naansense</span>
          </h1>
          <p className="text-sm text-stone-500 mt-1">Create your account to start ordering</p>
        </div>

        {/* Registration notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mb-4 flex gap-3">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Registration is required to place orders. Your details help us confirm delivery and keep you updated.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-5">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input pl-9" placeholder="Priya Mehta" required {...field('name')} />
              </div>
            </div>

            <div>
              <label className="label">Mobile number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input pl-9" type="tel" placeholder="98765 43210" maxLength={10} required {...field('phone')} />
              </div>
            </div>

            <div>
              <label className="label">Email <span className="text-stone-400 font-normal">(optional)</span></label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input className="input pl-9" type="email" placeholder="priya@email.com" {...field('email')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Min 6 chars" required {...field('password')} />
              </div>
              <div>
                <label className="label">Confirm</label>
                <input className="input" type="password" placeholder="Repeat" required {...field('confirmPassword')} />
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
              />
              <span className="text-xs text-stone-500 leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="text-brand-600 font-medium hover:underline">Terms &amp; Conditions</Link>
                {' '}and{' '}
                <Link to="/privacy" target="_blank" className="text-brand-600 font-medium hover:underline">Privacy Policy</Link>
                {' '}of Absolute Naansense, and consent to the processing of my personal data under the DPDP Act, 2023.
              </span>
            </label>

            <button type="submit" disabled={loading || !agreed} className="btn-primary w-full justify-center mt-2">
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-5">
            Already registered?{' '}
            <Link to="/login" state={{ from }} className="text-brand-500 font-medium hover:text-brand-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
