import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw, Receipt, Eye, Printer, Pencil, Trash2, X, Minus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { reportsApi, dineApi, ordersApi } from '../../services/api'
import { getOrderMeta } from '../../utils/orderNotes'
import { formatIST } from '../../utils/dateIST'
import { printBill } from '../../utils/printKot'

const nameOf = (it) => it.menuItem?.name || it.itemName || ''

const CGST_RATE = 0.025, SGST_RATE = 0.025
const istDay = (d) => formatIST(d, 'yyyy-MM-dd')
const todayIST = () => formatIST(new Date().toISOString(), 'yyyy-MM-dd')
const yesterdayIST = () => formatIST(new Date(Date.now() - 86400000).toISOString(), 'yyyy-MM-dd')

const typeLabel = (m) => m.type === 'DINE_IN' ? `Dine-in${m.table ? ` (${m.table})` : ''}` : m.type === 'TAKEAWAY' ? 'Take Away' : 'Delivery'
const payLabel = (o) => o.paymentMethod === 'QR_UPI' ? 'UPI'
  : o.paymentMethod === 'SPLIT' ? 'Split'
  : o.paymentMethod === 'COMPLIMENTARY' ? 'Comp'
  : 'Cash'

export default function AdminReports() {
  const [preset, setPreset] = useState('today')
  const [from, setFrom] = useState(todayIST())
  const [to, setTo] = useState(todayIST())
  const [billNo, setBillNo] = useState('')

  const [viewOrder, setViewOrder] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  const [draft, setDraft] = useState([])
  const [busy, setBusy] = useState(false)

  const viewBill = async () => {
    if (!billNo) return
    try {
      const { data } = await reportsApi.byBillNo(Number(billNo))
      if (!data) { toast.error(`No tax invoice #${billNo}`); return }
      printBill(data)
    } catch { toast.error('Lookup failed') }
  }

  const startEdit = (r) => { setEditOrder(r); setDraft(r.items.map(it => ({ id: it.id, quantity: it.quantity, it }))) }
  const dQty = (id, d) => setDraft(arr => arr.map(x => x.id === id ? { ...x, quantity: Math.max(1, x.quantity + d) } : x))
  const dRemove = (id) => setDraft(arr => arr.filter(x => x.id !== id))
  const saveEdit = async () => {
    setBusy(true)
    try {
      const keptIds = draft.map(x => x.id)
      const removeIds = editOrder.items.map(i => i.id).filter(id => !keptIds.includes(id))
      const updates = draft.filter(x => { const o = editOrder.items.find(i => i.id === x.id); return o && o.quantity !== x.quantity }).map(x => ({ id: x.id, quantity: x.quantity }))
      await dineApi.updateOrderItems({ orderId: editOrder.id, updates, removeIds })
      toast.success('Tax invoice modified'); setEditOrder(null); await refetch()
    } catch { toast.error('Failed to modify') } finally { setBusy(false) }
  }
  const cancelBill = async (r) => {
    if (!confirm(`Cancel tax invoice ${r.billNo ?? ''}? This marks the order cancelled.`)) return
    try { await ordersApi.cancelOrder(r.id); toast.success('Tax invoice cancelled'); await refetch() }
    catch { toast.error('Failed to cancel') }
  }

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['report-orders'],
    queryFn: () => reportsApi.forReports().then(r => r.data),
  })

  const applyPreset = (p) => {
    setPreset(p)
    if (p === 'today') { setFrom(todayIST()); setTo(todayIST()) }
    else if (p === 'yesterday') { setFrom(yesterdayIST()); setTo(yesterdayIST()) }
    else if (p === 'month') { setFrom(formatIST(new Date().toISOString(), 'yyyy-MM') + '-01'); setTo(todayIST()) }
  }

  const rows = useMemo(() => {
    return orders
      .filter(o => { const d = istDay(o.createdAt); return d >= from && d <= to })
      .map(o => {
        const meta = getOrderMeta(o)
        const subtotal = (o.items || []).reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
        const cgst = subtotal * CGST_RATE, sgst = subtotal * SGST_RATE
        return { ...o, meta, subtotal, cgst, sgst, grand: parseFloat(o.total) }
      })
  }, [orders, from, to])

  const sales = rows.filter(r => r.status !== 'cancelled')
  const tot = sales.reduce((a, r) => ({
    subtotal: a.subtotal + r.subtotal, cgst: a.cgst + r.cgst, sgst: a.sgst + r.sgst, grand: a.grand + r.grand,
  }), { subtotal: 0, cgst: 0, sgst: 0, grand: 0 })
  const cashTotal = sales.filter(r => payLabel(r) === 'Cash' && r.paymentStatus === 'paid').reduce((a, r) => a + r.grand, 0)
  const upiTotal = sales.filter(r => payLabel(r) === 'UPI' && r.paymentStatus === 'paid').reduce((a, r) => a + r.grand, 0)

  const statusCounts = useMemo(() => {
    const m = {}
    rows.forEach(r => { m[r.status] = (m[r.status] || 0) + 1 })
    return m
  }, [rows])

  const exportCsv = () => {
    const head = ['Bill No', 'Date', 'Order Type', 'Payment', 'Status', 'Sub Total', 'CGST', 'SGST', 'Total']
    const lines = sales.map(r => [
      r.billNo ?? '', formatIST(r.createdAt, 'dd-MM-yyyy HH:mm'), typeLabel(r.meta), payLabel(r), r.paymentStatus,
      r.subtotal.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.grand.toFixed(2),
    ])
    const csv = [head, ...lines].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sales_${from}_to_${to}.csv`
    a.click()
  }

  return (
    <AdminLayout title="Reports">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-stone-900">Sales Report</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {[['today', 'Today'], ['yesterday', 'Yesterday'], ['month', 'This Month']].map(([k, label]) => (
            <button key={k} onClick={() => applyPreset(k)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${preset === k ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>{label}</button>
          ))}
          <input type="date" value={from} onChange={e => { setPreset('custom'); setFrom(e.target.value) }} className="text-xs border border-stone-200 rounded-lg px-2 py-1.5" />
          <span className="text-stone-400 text-xs">to</span>
          <input type="date" value={to} onChange={e => { setPreset('custom'); setTo(e.target.value) }} className="text-xs border border-stone-200 rounded-lg px-2 py-1.5" />
          <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm"><RefreshCw size={14} /></button>
          <button onClick={exportCsv} className="btn-primary py-1.5 px-3 rounded-xl text-xs"><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {/* Bill lookup */}
      <div className="card p-3 mb-5 flex items-center gap-2">
        <Receipt size={16} className="text-stone-400" />
        <span className="text-sm text-stone-500">View tax invoice by number:</span>
        <input type="number" value={billNo} onChange={e => setBillNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && viewBill()}
          placeholder="Invoice No." className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 w-32" />
        <button onClick={viewBill} className="btn-primary py-1.5 px-3 rounded-xl text-xs">View / Print</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          ['Total Sales', `₹${tot.grand.toFixed(0)}`],
          ['Orders', String(sales.length)],
          ['Cash (paid)', `₹${cashTotal.toFixed(0)}`],
          ['UPI (paid)', `₹${upiTotal.toFixed(0)}`],
        ].map(([label, val]) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-stone-400">{label}</div>
            <div className="text-xl font-semibold text-stone-900 mt-1">{val}</div>
          </div>
        ))}
      </div>

      {/* Tax summary */}
      <div className="card p-4 mb-5">
        <div className="text-xs font-semibold text-stone-400 uppercase mb-2">Tax summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-stone-400 text-xs">Sub Total</div><div className="font-semibold">₹{tot.subtotal.toFixed(2)}</div></div>
          <div><div className="text-stone-400 text-xs">CGST 2.5%</div><div className="font-semibold">₹{tot.cgst.toFixed(2)}</div></div>
          <div><div className="text-stone-400 text-xs">SGST 2.5%</div><div className="font-semibold">₹{tot.sgst.toFixed(2)}</div></div>
          <div><div className="text-stone-400 text-xs">Grand Total</div><div className="font-semibold">₹{tot.grand.toFixed(2)}</div></div>
        </div>
      </div>

      {/* Sales table */}
      <div className="card overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs">
              <tr>
                {['Bill No', 'Date', 'Type', 'Payment', 'Status', 'Sub Total', 'CGST', 'SGST', 'Total', 'Actions'].map(h => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-8 text-stone-400">Loading…</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-stone-400">No sales in this period</td></tr>
              ) : sales.map(r => (
                <tr key={r.id} className="border-t border-stone-50">
                  <td className="px-3 py-2 font-mono">{r.billNo ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-stone-500">{formatIST(r.createdAt, 'dd MMM, h:mm a')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{typeLabel(r.meta)}</td>
                  <td className="px-3 py-2">{payLabel(r)}</td>
                  <td className="px-3 py-2"><span className={r.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}>{r.paymentStatus}</span></td>
                  <td className="px-3 py-2">₹{r.subtotal.toFixed(2)}</td>
                  <td className="px-3 py-2">₹{r.cgst.toFixed(2)}</td>
                  <td className="px-3 py-2">₹{r.sgst.toFixed(2)}</td>
                  <td className="px-3 py-2 font-semibold">₹{r.grand.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewOrder(r)} title="View" className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50"><Eye size={14} /></button>
                      <button onClick={() => printBill(r)} title="Print" className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50"><Printer size={14} /></button>
                      <button onClick={() => startEdit(r)} title="Modify" className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50"><Pencil size={14} /></button>
                      <button onClick={() => cancelBill(r)} title="Cancel" className="w-7 h-7 flex items-center justify-center rounded-md border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {sales.length > 0 && (
              <tfoot className="bg-stone-50 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={5}>Total ({sales.length})</td>
                  <td className="px-3 py-2">₹{tot.subtotal.toFixed(2)}</td>
                  <td className="px-3 py-2">₹{tot.cgst.toFixed(2)}</td>
                  <td className="px-3 py-2">₹{tot.sgst.toFixed(2)}</td>
                  <td className="px-3 py-2">₹{tot.grand.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Order status summary + KOT listing */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-4">
          <div className="text-xs font-semibold text-stone-400 uppercase mb-3">Order status</div>
          {Object.keys(statusCounts).length === 0 ? <div className="text-stone-400 text-sm">—</div> : (
            <div className="space-y-1.5 text-sm">
              {Object.entries(statusCounts).map(([s, n]) => (
                <div key={s} className="flex justify-between"><span className="text-stone-600 capitalize">{s.replace(/_/g, ' ')}</span><span className="font-medium">{n}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-stone-400 uppercase mb-3">KOT listing</div>
          <div className="space-y-1.5 text-sm max-h-64 overflow-y-auto">
            {rows.length === 0 ? <div className="text-stone-400">—</div> : rows.map(r => (
              <div key={r.id} className="flex justify-between gap-2">
                <span className="text-stone-600 truncate">#{r.billNo ?? r.id.slice(0, 6)} · {typeLabel(r.meta)}</span>
                <span className="text-stone-400 whitespace-nowrap">{(r.items || []).reduce((s, i) => s + i.quantity, 0)} items · {formatIST(r.createdAt, 'h:mm a')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View bill modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setViewOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
              <span className="font-semibold text-stone-900">Tax invoice #{viewOrder.billNo ?? '—'} · {typeLabel(viewOrder.meta)}</span>
              <button onClick={() => setViewOrder(null)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-1.5 text-sm max-h-[60vh] overflow-y-auto">
              <div className="text-xs text-stone-400">{formatIST(viewOrder.createdAt, 'dd MMM yyyy, h:mm a')} · {payLabel(viewOrder)} · {viewOrder.paymentStatus}</div>
              {(viewOrder.items || []).map(it => (
                <div key={it.id} className="flex justify-between"><span className="text-stone-700">{nameOf(it)} × {it.quantity}</span><span className="font-medium">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span></div>
              ))}
              <div className="border-t border-stone-100 pt-2 mt-1 space-y-1">
                <div className="flex justify-between text-stone-500"><span>Sub Total</span><span>₹{viewOrder.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-stone-500"><span>CGST 2.5%</span><span>₹{viewOrder.cgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-stone-500"><span>SGST 2.5%</span><span>₹{viewOrder.sgst.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>₹{viewOrder.grand.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-stone-100">
              <button onClick={() => setViewOrder(null)} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm">Close</button>
              <button onClick={() => printBill(viewOrder)} className="btn-primary px-4 py-2 rounded-xl text-sm"><Printer size={14} /> Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Modify bill modal */}
      {editOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setEditOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
              <span className="font-semibold text-stone-900">Modify tax invoice #{editOrder.billNo ?? '—'}</span>
              <button onClick={() => setEditOrder(null)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
              {draft.length === 0 && <div className="text-sm text-stone-400 text-center py-4">No items left</div>}
              {draft.map(x => (
                <div key={x.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 truncate text-stone-700">{nameOf(x.it)}</span>
                  <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1">
                    <button onClick={() => dQty(x.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Minus size={13} /></button>
                    <span className="w-5 text-center">{x.quantity}</span>
                    <button onClick={() => dQty(x.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => dRemove(x.id)} className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-stone-100">
              <button onClick={() => setEditOrder(null)} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm">Cancel</button>
              <button disabled={busy || draft.length === 0} onClick={saveEdit} className="btn-primary px-4 py-2 rounded-xl text-sm">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
