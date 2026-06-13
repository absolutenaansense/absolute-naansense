import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw, UserRound } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { customersApi } from '../../services/api'
import { formatIST } from '../../utils/dateIST'

export default function AdminCustomers() {
  const [search, setSearch] = useState('')
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list().then(r => r.data),
  })

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
                {['Name', 'Phone', 'Email', 'Type', 'Orders', 'Joined'].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10 text-stone-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-stone-400">No customers found</td></tr>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
