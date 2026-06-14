import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw, UserRound, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { customersApi } from '../../services/api'
import { formatIST } from '../../utils/dateIST'

export default function AdminCustomers() {
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState(null)   // { id, name, phone, email }
  const [saving, setSaving] = useState(false)
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list().then(r => r.data),
  })

  const saveEdit = async () => {
    if (!edit.name || !edit.phone) { toast.error('Name and phone are required'); return }
    setSaving(true)
    try {
      await customersApi.update(edit.id, { name: edit.name, phone: edit.phone, email: edit.email })
      toast.success('Customer updated'); setEdit(null); await refetch()
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to update') } finally { setSaving(false) }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers
      .map(c => ({ ...c, orderCount: c.orders?.[0]?.count ?? 0 }))
      .filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q))
  }, [customers, search])

  const returning = filtered.filter(c => c.isReturning).length

  return (
    <AdminLayout title="Customers">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Customers</h2>
          <p className="text-sm text-stone-500">{filtered.length} total · {returning} returning</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / phone / email…"
              className="text-sm bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 w-72" />
          </div>
          <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs">
              <tr>
                {['Name', 'Phone', 'Email', 'Type', 'Orders', 'Joined', ''].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10 text-stone-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-stone-400">No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t border-stone-50 hover:bg-stone-50/50">
                  <td className="px-4 py-2.5 font-medium text-stone-800 flex items-center gap-2"><UserRound size={14} className="text-stone-300" /> {c.name || '—'}</td>
                  <td className="px-4 py-2.5 text-stone-600 font-mono">{c.phone}</td>
                  <td className="px-4 py-2.5 text-stone-500">{c.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isReturning ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {c.isReturning ? 'Returning' : 'New'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-stone-700">{c.orderCount}</td>
                  <td className="px-4 py-2.5 text-stone-500 whitespace-nowrap">{c.createdAt ? formatIST(c.createdAt, 'dd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setEdit({ id: c.id, name: c.name || '', phone: c.phone || '', email: c.email || '' })} title="Edit" className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Edit customer</h3>
              <button onClick={() => setEdit(null)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Name</label><input className="input" value={edit.name} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="label">Phone</label><input className="input" value={edit.phone} onChange={e => setEdit(p => ({ ...p, phone: e.target.value }))} maxLength={10} /></div>
              <div><label className="label">Email</label><input className="input" value={edit.email} onChange={e => setEdit(p => ({ ...p, email: e.target.value }))} placeholder="optional" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEdit(null)} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
