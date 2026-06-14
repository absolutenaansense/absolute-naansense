import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { accountCanAccess } from './panels'

// Branded login for a specific staff panel. Authenticates, then verifies the
// account's role + outlet matches this panel before granting access.
export default function StaffLoginPage({ panel }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAdmin } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.adminLogin(form)
      if (!accountCanAccess(data.admin, panel)) {
        toast.error(`This login is for ${panel.title}. Use the correct staff account.`)
        return
      }
      setAdmin(data.admin, data.token)
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
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-20 w-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-stone-700" />
          <h1 className="text-xl font-semibold text-white">{panel.title}</h1>
          <p className="text-stone-400 text-sm mt-1">Absolute Naansense · {panel.subtitle}</p>
        </div>

        <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">User ID</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="Your login ID"
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
