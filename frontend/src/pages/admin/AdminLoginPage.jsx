import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAdmin } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.adminLogin(form)
      setAdmin(data.admin, data.token)
      navigate('/admin')
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-3">🏪</div>
          <h1 className="text-xl font-semibold text-white">Admin panel</h1>
          <p className="text-stone-400 text-sm mt-1">Absolute Naansense</p>
        </div>

        <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  type="email"
                  placeholder="admin@absolutenaansense.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-xl transition-all mt-2 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
