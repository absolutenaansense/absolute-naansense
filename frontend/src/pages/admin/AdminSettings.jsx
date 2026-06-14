import { useState } from 'react'
import { Lock, Palette, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { getTheme, applyTheme } from '../../utils/theme'

export default function AdminSettings() {
  const { admin } = useAuthStore()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [theme, setTheme] = useState(getTheme())

  const changePassword = async () => {
    if (pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return }
    setPwSaving(true)
    try {
      await authApi.adminChangePassword({ adminId: admin.id, currentPassword: pw.current, newPassword: pw.next })
      toast.success('Password changed'); setPw({ current: '', next: '', confirm: '' })
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to change password') } finally { setPwSaving(false) }
  }

  const pickTheme = (t) => { setTheme(t); applyTheme(t); toast.success(`${t === 'dark' ? 'Dark' : 'Light'} theme applied`) }

  const THEMES = [
    { key: 'light', label: 'Light · Olive green', icon: Sun, swatch: 'bg-brand-500' },
    { key: 'dark', label: 'Dark mode', icon: Moon, swatch: 'bg-stone-800' },
  ]

  return (
    <AdminLayout title="Settings">
      <div className="max-w-xl space-y-5">
        {/* Change password */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-stone-800">Change password</h3>
          </div>
          <p className="text-xs text-stone-400 mb-4">{admin?.email}</p>
          <div className="space-y-3 mb-4">
            <div><label className="label">Current password</label><input className="input" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">New password</label><input className="input" type="password" placeholder="Min 6 chars" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></div>
              <div><label className="label">Confirm</label><input className="input" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
          </div>
          <button onClick={changePassword} disabled={pwSaving} className="btn-primary text-sm">{pwSaving ? 'Saving…' : 'Update password'}</button>
        </div>

        {/* Theme */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-stone-800">Theme</h3>
          </div>
          <p className="text-xs text-stone-400 mb-4">Applies to this device.</p>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(({ key, label, icon: Icon, swatch }) => (
              <button key={key} onClick={() => pickTheme(key)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${theme === key ? 'border-brand-500 bg-brand-50' : 'border-stone-200 hover:border-stone-300'}`}>
                <span className={`w-8 h-8 rounded-lg ${swatch} flex items-center justify-center text-white`}><Icon size={16} /></span>
                <span className="text-sm font-medium text-stone-800">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
