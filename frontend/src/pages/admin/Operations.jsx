import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { opsApi } from '../../services/api'
import { useStaff } from '../../staff/StaffContext'
import { formatIST } from '../../utils/dateIST'
import { TIMELINE_PRESETS, rangeFor, inRange } from '../../utils/timeline'

const ACTION = {
  kot_add: { label: 'KOT added', color: 'bg-blue-50 text-blue-700' },
  kot_modify: { label: 'KOT modified', color: 'bg-amber-50 text-amber-700' },
  kot_cancel: { label: 'KOT cancelled', color: 'bg-red-50 text-red-600' },
  item_add_after_print: { label: 'Item added after print', color: 'bg-orange-50 text-orange-700' },
  bill_modify: { label: 'Bill modified', color: 'bg-amber-50 text-amber-700' },
  bill_delete: { label: 'Bill deleted', color: 'bg-red-50 text-red-600' },
  reprint: { label: 'Bill re-printed', color: 'bg-stone-100 text-stone-700' },
  waive_off: { label: 'Waived off', color: 'bg-purple-50 text-purple-700' },
  order_cancel: { label: 'Order cancelled', color: 'bg-red-50 text-red-600' },
  settle: { label: 'Settled', color: 'bg-green-50 text-green-700' },
}
const outletName = (o) => o === 'renusagar' ? 'Renusagar' : 'Renukoot'

function Tile({ label, value }) {
  return (
    <div className="card p-3">
      <div className="text-xl font-semibold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function Operations() {
  const staff = useStaff()
  const [preset, setPreset] = useState('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // Super admin can pick any outlet; outlet admins are pinned to their outlet.
  const [outletFilter, setOutletFilter] = useState(staff?.outlet || 'all')
  const activeOutlet = staff?.outlet || outletFilter

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['ops-log'],
    queryFn: () => opsApi.list().then(r => r.data),
    refetchInterval: 30000,
  })

  const range = preset === 'custom' ? { from: from || rangeFor('today').from, to: to || rangeFor('today').to } : rangeFor(preset)

  const filtered = useMemo(() => logs.filter(l =>
    (activeOutlet === 'all' || l.outlet === activeOutlet) && inRange(l.createdAt, range.from, range.to)
  ), [logs, activeOutlet, range.from, range.to])

  const count = (a) => filtered.filter(l => l.action === a).length

  return (
    <AdminLayout title="Operations">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-stone-900">Operations log</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {!staff?.outlet && (
            <select value={outletFilter} onChange={e => setOutletFilter(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5">
              <option value="all">All outlets</option>
              <option value="renukoot">Renukoot</option>
              <option value="renusagar">Renusagar</option>
            </select>
          )}
          <select value={preset} onChange={e => setPreset(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5">
            {TIMELINE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          {preset === 'custom' && (
            <>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2 py-1.5" />
              <span className="text-stone-400 text-sm">to</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2 py-1.5" />
            </>
          )}
          <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
        <Tile label="KOTs cancelled" value={count('kot_cancel')} />
        <Tile label="KOTs modified" value={count('kot_modify')} />
        <Tile label="Items added after print" value={count('item_add_after_print')} />
        <Tile label="Bills modified" value={count('bill_modify') + count('bill_delete')} />
        <Tile label="Re-prints / waive-offs" value={count('reprint') + count('waive_off')} />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-stone-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">No operations in this period.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {filtered.map(l => {
              const a = ACTION[l.action] || { label: l.action, color: 'bg-stone-100 text-stone-700' }
              return (
                <div key={l.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.color}`}>{a.label}</span>
                      <span className="text-xs text-stone-400">{outletName(l.outlet)}</span>
                      {l.billNo != null && <span className="text-xs text-stone-500">Bill #{l.billNo}</span>}
                      {l.kotNo != null && <span className="text-xs text-stone-500">KOT {l.kotNo}</span>}
                    </div>
                    {l.detail && (
                      <div className="text-xs text-stone-500 truncate">{typeof l.detail === 'string' ? l.detail : JSON.stringify(l.detail)}</div>
                    )}
                    {l.actor && <div className="text-[11px] text-stone-400 mt-0.5">by {l.actor}</div>}
                  </div>
                  <div className="text-xs text-stone-400 whitespace-nowrap">{formatIST(l.createdAt, 'dd MMM, h:mm a')}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
