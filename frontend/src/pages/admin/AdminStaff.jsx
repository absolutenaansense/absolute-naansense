import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, Trash2, RefreshCw, Plus, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { staffApi } from '../../services/api'
import { useStaff } from '../../staff/StaffContext'

const ROLES = [
  { value: 'captain', label: 'Captain (table orders)' },
  { value: 'biller', label: 'Biller (billing app)' },
  { value: 'outlet_admin', label: 'Outlet admin' },
]
const OUTLETS = [['renukoot', 'Renukoot'], ['renusagar', 'Renusagar']]
const roleLabel = (r) => ({ super_admin: 'Super admin', outlet_admin: 'Outlet admin', biller: 'Biller', captain: 'Captain' }[r] || r)
const panelPath = (a) => a.role === 'captain' ? `/${a.outlet}_captain` : a.role === 'biller' ? `/${a.outlet}_biller` : a.role === 'outlet_admin' ? `/${a.outlet}_admin` : '/super_admin'

export default function AdminStaff() {
  const staff = useStaff()
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'captain', outlet: 'renukoot' })
  const [busy, setBusy] = useState(false)
  const { data: list = [], isLoading, refetch } = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list().then(r => r.data) })

  if (!staff?.isSuper) {
    return <AdminLayout title="Staff & logins"><div className="text-center py-16 text-stone-400 flex flex-col items-center gap-2"><ShieldAlert size={28} /> Only the super admin can manage logins.</div></AdminLayout>
  }

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })

  const create = async () => {
    if (!form.email.trim() || form.password.length < 4) { toast.error('Enter a login ID and a password (min 4 chars)'); return }
    setBusy(true)
    try {
      await staffApi.create({ email: form.email, name: form.name, password: form.password, role: form.role, outlet: form.role === 'super_admin' ? null : form.outlet })
      toast.success('Login created')
      setForm({ email: '', name: '', password: '', role: 'captain', outlet: form.outlet })
      await refetch()
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to create') } finally { setBusy(false) }
  }

  const resetPw = async (a) => {
    const pw = window.prompt(`New password for ${a.email}:`)
    if (!pw) return
    try { await staffApi.setPassword(a.id, pw); toast.success('Password updated') } catch { toast.error('Failed') }
  }
  const remove = async (a) => {
    if (a.role === 'super_admin') { toast.error("Can't delete the super admin"); return }
    if (!confirm(`Delete login ${a.email}?`)) return
    try { await staffApi.remove(a.id); toast.success('Login deleted'); await refetch() } catch (e) { toast.error(e.response?.data?.error || 'Failed') }
  }

  return (
    <AdminLayout title="Staff & logins">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2"><KeyRound size={18} /> Staff &amp; logins</h2>
          <p className="text-sm text-stone-500">Create captain / biller logins for each outlet.</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm"><RefreshCw size={14} /></button>
      </div>

      {/* Create */}
      <div className="card p-4 mb-5">
        <div className="text-xs font-semibold text-stone-400 uppercase mb-3">Create a login</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="label">Login ID</label><input className="input" placeholder="e.g. renukoot_captain1" {...f('email')} /></div>
          <div><label className="label">Name <span className="text-stone-400 font-normal">(optional)</span></label><input className="input" placeholder="e.g. Rahul" {...f('name')} /></div>
          <div><label className="label">Password</label><input className="input" type="text" placeholder="Set a password" {...f('password')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Role</label><select className="input" {...f('role')}>{ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div><label className="label">Outlet</label><select className="input" {...f('outlet')}>{OUTLETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
        </div>
        <button disabled={busy} onClick={create} className="btn-primary mt-3 py-2.5 px-4 rounded-xl"><Plus size={15} /> Create login</button>
        <p className="text-[11px] text-stone-400 mt-2">Captain logs in at <span className="font-mono">absolutenaansense.in/&lt;outlet&gt;_captain</span> with this ID + password.</p>
      </div>

      {/* List */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs">
            <tr>{['Login ID', 'Name', 'Role', 'Outlet', 'Panel', ''].map(h => <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="text-center py-10 text-stone-400">Loading…</td></tr>
              : list.map(a => (
                <tr key={a.id} className="border-t border-stone-50">
                  <td className="px-4 py-2.5 font-mono text-stone-700">{a.email}</td>
                  <td className="px-4 py-2.5 text-stone-600">{a.name || '—'}</td>
                  <td className="px-4 py-2.5"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{roleLabel(a.role)}</span></td>
                  <td className="px-4 py-2.5 text-stone-500 capitalize">{a.outlet || '—'}</td>
                  <td className="px-4 py-2.5 text-stone-400 font-mono text-xs">{panelPath(a)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => resetPw(a)} title="Reset password" className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50"><KeyRound size={14} /></button>
                      {a.role !== 'super_admin' && <button onClick={() => remove(a)} title="Delete" className="w-7 h-7 flex items-center justify-center rounded-md border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
