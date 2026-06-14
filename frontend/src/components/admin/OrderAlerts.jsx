import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useStaff } from '../../staff/StaffContext'
import { ordersApi } from '../../services/api'
import { printTicket } from '../../utils/printKot'
import { getOrderMeta, itemNote } from '../../utils/orderNotes'
import { formatIST } from '../../utils/dateIST'
import { playRing, notify, requestNotifyPermission, armAudio, flashTitle, isAway } from '../../utils/notify'

// Mounted once per biller app. When a new online order lands (any screen), it
// rings + raises a Chrome notification AND pops a center-screen confirm dialog
// with the full order. The biller confirms (prints the KOT) or cancels.
export default function OrderAlerts() {
  const staff = useStaff()
  const outlet = staff?.outlet || 'renukoot'
  const qc = useQueryClient()
  const seen = useRef(new Set())     // order ids already alerted/queued (dedupe)
  const [queue, setQueue] = useState([])   // full orders awaiting the biller's decision
  const [busy, setBusy] = useState(false)
  const [cancelMode, setCancelMode] = useState(false)   // remark field revealed
  const [cancelRemark, setCancelRemark] = useState('')

  useEffect(() => { armAudio(); requestNotifyPermission() }, [])

  const mine = (row) => (row.outlet || 'renukoot') === outlet && !row.tableLabel

  // Ring + notify + queue the order for the confirm popup (once per order).
  const raise = async (row) => {
    if (!mine(row) || row.status !== 'payment_received' || seen.current.has(row.id)) return
    seen.current.add(row.id)
    const away = isAway()                       // biller not looking at the tab?
    playRing()
    if (away) setTimeout(playRing, 1500)        // ring twice when away
    notify('🔔 New online order — confirm now', `#${String(row.id).slice(0, 8).toUpperCase()} · ₹${parseFloat(row.total).toFixed(0)}`, `${import.meta.env.BASE_URL}logo.jpg`, away)
    if (away) flashTitle('🔔 NEW ORDER!')
    qc.invalidateQueries({ queryKey: ['admin-orders'] })
    try {
      const { data } = await ordersApi.getOrder(row.id)
      if (data && data.status === 'payment_received') setQueue(q => q.some(o => o.id === data.id) ? q : [...q, data])
    } catch { /* ignore */ }
  }

  // Realtime: COD orders arrive as INSERT(payment_received); prepaid flip via UPDATE.
  useEffect(() => {
    const ch = supabase
      .channel('biller-order-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Order' }, (p) => raise(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Order' }, (p) => {
        if (p.new.status === 'payment_received' && p.old?.status !== 'payment_received') raise(p.new)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [outlet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Safety net: catch orders that arrived while the tab was closed / realtime missed.
  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.allOrders().then(r => r.data),
    refetchInterval: 20000,
  })
  useEffect(() => {
    orders.filter(o => mine(o) && o.status === 'payment_received').forEach(o => { if (!seen.current.has(o.id)) raise(o) })
  }, [orders]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue[0]
  const drop = (id) => { setQueue(q => q.filter(o => o.id !== id)); setCancelMode(false); setCancelRemark('') }

  const doConfirm = async () => {
    if (!current) return
    setBusy(true)
    try {
      await ordersApi.confirmOrder(current.id)
      await ordersApi.updateStatus(current.id, 'preparing')
      printTicket({ ...current, kotNo: current.items?.[0]?.kotNo }, { title: 'KOT', showPrices: false })
      toast.success('Order confirmed — KOT printed')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      drop(current.id)
    } catch { toast.error('Failed to confirm') } finally { setBusy(false) }
  }

  const doCancel = async () => {
    if (!current) return
    setBusy(true)
    try {
      await ordersApi.cancelOrder(current.id, cancelRemark.trim())
      toast.success('Order cancelled')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      drop(current.id)
    } catch { toast.error('Failed to cancel') } finally { setBusy(false) }
  }

  if (!current) return null
  const o = current
  const meta = getOrderMeta(o)
  const subtotal = (o.items || []).reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const gst = Math.round(subtotal * 0.05)
  const delivery = Math.max(0, Math.round(parseFloat(o.total) - subtotal - gst))
  const where = meta.type === 'TAKEAWAY' ? 'Take Away' : meta.type === 'DINE_IN' ? `Dine-in ${meta.table || ''}` : 'Delivery'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-stone-100 bg-amber-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide animate-pulse">● New online order</span>
            <div className="flex items-center gap-2">
              {queue.length > 1 && <span className="text-xs text-stone-500">+{queue.length - 1} more</span>}
              <button onClick={() => drop(o.id)} title="Later" className="p-1 text-stone-400 hover:text-stone-700"><X size={16} /></button>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono font-semibold text-stone-900">#{o.id.slice(0, 8).toUpperCase()}</span>
            <span className="text-lg font-bold text-stone-900">₹{parseFloat(o.total).toFixed(0)}</span>
          </div>
          <div className="text-xs text-stone-500 mt-0.5">{where} · {o.customerName || o.user?.name || ''} · {o.customerPhone || o.user?.phone || ''} · {formatIST(o.createdAt, 'h:mm a')}</div>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-stone-400 uppercase mb-1.5">Items</div>
            <div className="space-y-1.5">
              {(o.items || []).map(it => {
                const note = itemNote(o, it)
                return (
                  <div key={it.id} className="text-sm">
                    <div className="flex justify-between"><span className="text-stone-700">{it.menuItem?.name || it.itemName} × {it.quantity}</span><span className="font-medium">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span></div>
                    {note && <div className="text-xs text-amber-600 italic pl-1">↳ {note}</div>}
                  </div>
                )
              })}
            </div>
            <div className="border-t border-stone-100 mt-2 pt-2 space-y-0.5 text-xs text-stone-500">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              {delivery > 0 && <div className="flex justify-between"><span>Delivery</span><span>₹{delivery}</span></div>}
              <div className="flex justify-between"><span>GST (5%)</span><span>₹{gst}</span></div>
              <div className="flex justify-between text-sm font-semibold text-stone-900 pt-0.5"><span>Total</span><span>₹{parseFloat(o.total).toFixed(0)}</span></div>
            </div>
          </div>
          {meta.address && <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600"><span className="text-stone-400">Deliver to: </span>{meta.address}</div>}
          {meta.type === 'TAKEAWAY' && o.pickupAt && <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700"><span className="text-amber-500">Pickup at: </span>{formatIST(o.pickupAt, 'dd MMM, h:mm a')}</div>}
          {meta.note && <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700"><span className="text-amber-500">Note: </span>{meta.note}</div>}
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500 flex justify-between">
            <span>Payment: <strong>{o.paymentMethod === 'QR_UPI' ? 'UPI / Prepaid' : 'Cash on delivery'}</strong></span>
            <span>Status: <strong className={o.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}>{o.paymentStatus}</strong></span>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-stone-100">
          {cancelMode ? (
            <div className="space-y-2">
              <textarea autoFocus value={cancelRemark} onChange={e => setCancelRemark(e.target.value)} rows={2}
                placeholder="Cancellation reason (e.g. item out of stock, address unreachable)…"
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 resize-none" />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => setCancelMode(false)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm">← Back</button>
                <button disabled={busy} onClick={doCancel} className="flex-1 justify-center py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-1.5"><X size={16} /> Confirm cancellation</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => setCancelMode(true)} className="px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium flex items-center gap-1.5"><X size={16} /> Cancel</button>
              <button disabled={busy} onClick={doConfirm} className="flex-1 btn-primary justify-center py-3 rounded-xl"><Check size={16} /> Confirm &amp; print KOT</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
