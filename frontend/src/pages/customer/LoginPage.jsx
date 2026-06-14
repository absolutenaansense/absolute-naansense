import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function LoginPage() {
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      setUser(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-24 w-24 rounded-full object-cover mx-auto mb-3 ring-1 ring-stone-200 shadow-sm" />
          <h1 className="text-2xl font-semibold text-stone-900">
            Absolute <span className="text-brand-500">Naansense</span>
          </h1>
          <p className="text-sm text-stone-500 mt-1">Renukoot's finest — delivered to you</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-5">Sign in to order</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Mobile number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="input pl-9"
                  type="tel"
                  placeholder="98765 43210"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="input pl-9"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-5">
            New here?{' '}
            <Link to="/register" className="text-brand-500 font-medium hover:text-brand-600">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}
