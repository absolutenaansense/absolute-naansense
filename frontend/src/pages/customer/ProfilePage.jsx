import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { User, MapPin, Plus, Trash2, LogOut, Phone, Mail, Shield, AlertTriangle, Lock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { useAuthStore } from '../../store/authStore'
import { addressApi, authApi } from '../../services/api'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: 'Home', line1: '', line2: '', city: '', pincode: '' })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })

  const handleChangePassword = async () => {
    if (pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return }
    setPwSaving(true)
    try {
      await authApi.changePassword({ userId: user.id, currentPassword: pw.current, newPassword: pw.next })
      toast.success('Password changed'); setPwOpen(false); setPw({ current: '', next: '', confirm: '' })
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to change password') } finally { setPwSaving(false) }
  }

  const { data: addresses = [], refetch } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => addressApi.getAddresses(user?.id).then(r => r.data),
    enabled: !!user?.id,
  })

  const handleAddAddress = async () => {
    if (!newAddr.line1 || !newAddr.city || !newAddr.pincode) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await addressApi.addAddress({ userId: user.id, ...newAddr })
      await refetch()
      setShowAdd(false)
      setNewAddr({ label: 'Home', line1: '', line2: '', city: '', pincode: '' })
      toast.success('Address saved')
    } catch { toast.error('Failed to save address') }
  }

  const handleDelete = async (id) => {
    try {
      await addressApi.deleteAddress(id)
      await refetch()
      toast.success('Address removed')
    } catch { toast.error('Failed to remove address') }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await authApi.deleteAccount(user.id)
      toast.success('Your account and personal data have been deleted')
      logout()
      navigate('/register')
    } catch {
      toast.error('Failed to delete account. Please try again or contact us.')
      setDeleting(false)
    }
  }

  return (
    <CustomerLayout showBack title="My profile">
      <div className="px-4 py-4 space-y-4">
        {/* User info */}
        <div className="card p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center">
              <span className="text-brand-600 font-semibold text-lg">{user?.name?.[0]}</span>
            </div>
            <div>
              <div className="font-semibold text-stone-800">{user?.name}</div>
              {user?.isReturning && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-1">
                  <Shield size={10} /> Returning customer — COD unlocked
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Phone size={14} className="text-stone-400" /> {user?.phone}
            </div>
            {user?.email && (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Mail size={14} className="text-stone-400" /> {user.email}
              </div>
            )}
          </div>
          <button onClick={() => setPwOpen(true)} className="btn-secondary w-full justify-center mt-4 text-sm">
            <Lock size={15} /> Change password
          </button>
        </div>

        {/* Addresses */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Saved addresses</div>
            <button onClick={() => setShowAdd(s => !s)} className="btn-ghost text-brand-500 text-xs py-1">
              <Plus size={13} /> Add address
            </button>
          </div>

          {addresses.length === 0 && !showAdd && (
            <p className="text-sm text-stone-400 text-center py-4">No saved addresses yet.</p>
          )}

          {addresses.map(addr => (
            <div key={addr.id} className="flex items-start justify-between py-3 border-b border-stone-50 last:border-0">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-stone-800">{addr.label}</div>
                  <div className="text-xs text-stone-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>
                  <div className="text-xs text-stone-500">{addr.city} — {addr.pincode}</div>
                </div>
              </div>
              <button onClick={() => handleDelete(addr.id)} className="text-stone-300 hover:text-red-400 p-1 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {showAdd && (
            <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Label</label>
                  <select className="input" value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))}>
                    <option>Home</option><option>Office</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input className="input" placeholder="231218" maxLength={6} value={newAddr.pincode} onChange={e => setNewAddr(p => ({ ...p, pincode: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Address line 1</label>
                <input className="input" placeholder="House / flat / building" value={newAddr.line1} onChange={e => setNewAddr(p => ({ ...p, line1: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Landmark</label>
                  <input className="input" placeholder="Optional" value={newAddr.line2} onChange={e => setNewAddr(p => ({ ...p, line2: e.target.value }))} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" placeholder="Renukoot" value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddAddress} className="btn-primary flex-1 justify-center">Save</button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="btn-secondary w-full justify-center text-stone-600"
        >
          <LogOut size={16} /> Sign out
        </button>

        {/* Privacy & account controls */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Privacy & data</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm mb-4">
            <Link to="/contact" className="text-brand-600 font-medium hover:underline">Contact Us</Link>
            <Link to="/terms" className="text-brand-600 font-medium hover:underline">Terms & Conditions</Link>
            <Link to="/refund" className="text-brand-600 font-medium hover:underline">Cancellation & Refund</Link>
            <Link to="/privacy" className="text-brand-600 font-medium hover:underline">Privacy Policy</Link>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed mb-3">
            Under the DPDP Act, 2023 you may delete your account and personal data at any time. Records
            we must keep for tax and legal compliance are retained in anonymised form.
          </p>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn-secondary w-full justify-center text-red-500 border-red-100 hover:bg-red-50"
          >
            <Trash2 size={16} /> Delete my account
          </button>
        </div>
      </div>

      {/* Delete account confirmation */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pwSaving && setPwOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Change password</h3>
              <button onClick={() => setPwOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Current password</label><input className="input" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} /></div>
              <div><label className="label">New password</label><input className="input" type="password" placeholder="Min 6 chars" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></div>
              <div><label className="label">Confirm new password</label><input className="input" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPwOpen(false)} disabled={pwSaving} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleChangePassword} disabled={pwSaving} className="btn-primary flex-1 justify-center">{pwSaving ? 'Saving…' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setDeleteOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-stone-900">Delete your account?</h3>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-4">
              This permanently erases your personal data — your name, contact details and saved
              addresses. Order and tax-invoice records that we are legally required to keep are
              retained in anonymised form. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteOpen(false)} disabled={deleting} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn-primary flex-1 justify-center bg-red-500 hover:bg-red-600 active:bg-red-700">
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
