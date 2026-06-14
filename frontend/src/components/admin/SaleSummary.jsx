import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, IndianRupee } from 'lucide-react'
import { reportsApi } from '../../services/api'
import { useStaff } from '../../staff/StaffContext'
import { formatIST } from '../../utils/dateIST'
import { TIMELINE_PRESETS, rangeFor, inRange } from '../../utils/timeline'

const CGST_RATE = 0.025, SGST_RATE = 0.025
const payLabel = (o) => o.paymentMethod === 'QR_UPI' ? 'UPI' : o.paymentMethod === 'SPLIT' ? 'Split' : o.paymentMethod === 'COMPLIMENTARY' ? 'Comp' : 'Cash'
const outletName = (o) => o === 'renusagar' ? 'Renusagar' : o === 'renukoot' ? 'Renukoot' : 'All outlets'

function Stat({ label, value }) {
  return (
    <div className="bg-stone-50 rounded-xl p-3">
      <div className="text-lg font-semibold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  )
}

// Quick sale summary — opens on Ctrl+S for the current outlet.
export default function SaleSummary() {
  const staff = useStaff()
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('today')
  const activeOutlet = staff?.outlet || 'all'

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { data: orders = [] } = useQuery({
    queryKey: ['sale-summary'],
    queryFn: () => reportsApi.forReports().then(r => r.data),
    enabled: open,
    refetchInterval: open ? 20000 : false,
  })

  const range = rangeFor(preset)
  const s = useMemo(() => {
    const rows = orders
      .filter(o => activeOutlet === 'all' || (o.outlet || 'renukoot') === activeOutlet)
      .filter(o => inRange(o.createdAt, range.from, range.to))
      .map(o => {
        const subtotal = (o.items || []).reduce((a, it) => a + parseFloat(it.price) * it.quantity, 0)
        return { ...o, subtotal, cgst: subtotal * CGST_RATE, sgst: subtotal * SGST_RATE, grand: parseFloat(o.total) }
      })
    const sales = rows.filter(r => r.status !== 'cancelled')
    const sum = (arr, f) => arr.reduce((a, r) => a + f(r), 0)
    return {
      orders: sales.length,
      cancelled: rows.filter(r => r.status === 'cancelled').length,
      totalSales: sum(sales, r => r.grand),
      cash: sum(sales.filter(r => payLabel(r) === 'Cash' && r.paymentStatus === 'paid'), r => r.grand),
      upi: sum(sales.filter(r => payLabel(r) === 'UPI' && r.paymentStatus === 'paid'), r => r.grand),
      pending: sales.filter(r => r.paymentStatus !== 'paid').length,
      subtotal: sum(sales, r => r.subtotal),
      cgst: sum(sales, r => r.cgst),
      sgst: sum(sales, r => r.sgst),
    }
  }, [orders, activeOutlet, range.from, range.to])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-16" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-brand-500" />
            <span className="font-semibold text-stone-900">Sale summary · {outletName(activeOutlet)}</span>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <select value={preset} onChange={e => setPreset(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5">
            {TIMELINE_PRESETS.filter(p => p.key !== 'custom').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total sales" value={`₹${s.totalSales.toFixed(0)}`} />
            <Stat label="Orders" value={s.orders} />
            <Stat label="Cash (paid)" value={`₹${s.cash.toFixed(0)}`} />
            <Stat label="UPI (paid)" value={`₹${s.upi.toFixed(0)}`} />
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-500"><span>Sub Total</span><span>₹{s.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-stone-500"><span>CGST 2.5%</span><span>₹{s.cgst.toFixed(2)}</span></div>
            <div className="flex justify-between text-stone-500"><span>SGST 2.5%</span><span>₹{s.sgst.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-stone-900 pt-1"><span>Grand Total</span><span>₹{(s.subtotal + s.cgst + s.sgst).toFixed(2)}</span></div>
          </div>

          <div className="flex gap-4 text-xs text-stone-400">
            <span>Pending payment: {s.pending}</span>
            <span>Cancelled: {s.cancelled}</span>
          </div>
        </div>

        <div className="px-5 py-2 border-t border-stone-100 text-[11px] text-stone-400 text-center">Ctrl/⌘+S to toggle · Esc to close</div>
      </div>
    </div>
  )
}
