import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Plug, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { adminApi, authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function AdminSettings() {
  const { admin } = useAuthStore()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const changePassword = async () => {
    if (pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return }
    setPwSaving(true)
    try {
      await authApi.adminChangePassword({ adminId: admin.id, currentPassword: pw.current, newPassword: pw.next })
      toast.success('Password changed'); setPw({ current: '', next: '', confirm: '' })
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to change password') } finally { setPwSaving(false) }
  }
  const [petpoojaStatus, setPetpoojaStatus] = useState(null) // null | 'testing' | 'ok' | 'fail'
  const [petpoojaConfig, setPetpoojaConfig] = useState({
    appKey: '',
    appSecret: '',
    accessToken: '',
    restaurantId: '',
  })

  const testPetpooja = async () => {
    setPetpoojaStatus('testing')
    try {
      const { data } = await adminApi.testPetpooja()
      if (data.connected) {
        setPetpoojaStatus('ok')
        toast.success(`Connected! Restaurant: ${data.restaurantName}`)
      } else {
        setPetpoojaStatus('fail')
        toast.error('PetPooja connection failed: ' + data.error)
      }
    } catch {
      setPetpoojaStatus('fail')
      toast.error('Connection failed — check credentials')
    }
  }

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

        {/* PetPooja */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-800">PetPooja POS integration</h3>
              <p className="text-xs text-stone-400 mt-0.5">KOTs are pushed automatically when you confirm an order</p>
            </div>
            {petpoojaStatus === 'ok' && <CheckCircle2 size={20} className="text-green-500" />}
            {petpoojaStatus === 'fail' && <XCircle size={20} className="text-red-400" />}
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="label">App key</label>
              <input className="input font-mono text-sm" placeholder="From PetPooja dashboard → Settings → API" value={petpoojaConfig.appKey} onChange={e => setPetpoojaConfig(p => ({ ...p, appKey: e.target.value }))} />
            </div>
            <div>
              <label className="label">App secret</label>
              <input className="input font-mono text-sm" type="password" value={petpoojaConfig.appSecret} onChange={e => setPetpoojaConfig(p => ({ ...p, appSecret: e.target.value }))} />
            </div>
            <div>
              <label className="label">Access token</label>
              <input className="input font-mono text-sm" type="password" value={petpoojaConfig.accessToken} onChange={e => setPetpoojaConfig(p => ({ ...p, accessToken: e.target.value }))} />
            </div>
            <div>
              <label className="label">Restaurant ID</label>
              <input className="input font-mono text-sm" placeholder="e.g. ABN_RNK_001" value={petpoojaConfig.restaurantId} onChange={e => setPetpoojaConfig(p => ({ ...p, restaurantId: e.target.value }))} />
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-4 mb-4 text-xs text-stone-500">
            <strong className="text-stone-700">How to get these credentials:</strong>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>Log into your PetPooja dashboard</li>
              <li>Go to Settings → API Integration</li>
              <li>Copy App Key, App Secret, and Access Token</li>
              <li>Your Restaurant ID is shown in your PetPooja account settings</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button className="btn-primary text-sm">Save credentials</button>
            <button
              onClick={testPetpooja}
              disabled={petpoojaStatus === 'testing'}
              className="btn-secondary text-sm"
            >
              {petpoojaStatus === 'testing' ? (
                <><Loader2 size={14} className="animate-spin" /> Testing…</>
              ) : (
                <><Plug size={14} /> Test connection</>
              )}
            </button>
          </div>
        </div>

        {/* KOT flow */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-4">KOT flow</h3>
          <div className="space-y-4">
            {[
              { n: 1, title: 'Customer places order', desc: 'Order is created and payment is initiated' },
              { n: 2, title: 'Payment confirmed', desc: 'Via Razorpay webhook (auto) or admin manual confirm' },
              { n: 3, title: 'Admin clicks "Confirm & send KOT"', desc: 'This triggers POST to PetPooja /create-order' },
              { n: 4, title: 'KOT printed at kitchen', desc: 'PetPooja routes to your kitchen printer automatically' },
              { n: 5, title: 'Order status synced back', desc: 'Optional webhook from PetPooja updates order status in your app' },
            ].map(step => (
              <div key={step.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div>
                  <div className="text-sm font-medium text-stone-800">{step.title}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Razorpay */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-1">Razorpay payments</h3>
          <p className="text-xs text-stone-400 mb-4">Configured via backend environment variables. Webhook URL to add in Razorpay dashboard:</p>
          <div className="bg-stone-900 text-green-400 rounded-xl px-4 py-3 font-mono text-xs">
            https://your-backend.railway.app/api/payments/webhook
          </div>
          <div className="mt-3 text-xs text-stone-500">Select event: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">payment.captured</code></div>
        </div>
      </div>
    </AdminLayout>
  )
}
