import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X, RefreshCw, ConciergeBell } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { ordersApi, captainApi } from '../../services/api'
import { getOrderMeta, itemNote, orderFees } from '../../utils/orderNotes'
import { formatIST } from '../../utils/dateIST'
import { printTicket } from '../../utils/printKot'
import { useStaff } from '../../staff/StaffContext'

function CaptainCard({ order, refetch }) {
  const [busy, setBusy] = useState(false)
  const meta = getOrderMeta(order)
  const { total } = orderFees(order)

  const confirm = async () => {
    setBusy(true)
    try {
      const { data, kotNo } = await captainApi.confirm(order.id)
      printTicket({ ...data, kotNo }, { title: 'KOT', showPrices: false })
      toast.success('Confirmed — KOT printed')
      refetch()
    } catch { toast.error('Failed to confirm') } finally { setBusy(false) }
  }
  const cancel = async () => {
    const remark = window.prompt('Cancellation reason (optional):')
    if (remark === null) return
    setBusy(true)
    try { await ordersApi.cancelOrder(order.id, remark.trim()); toast.success('Order cancelled'); refetch() }
    catch { toast.error('Failed to cancel') } finally { setBusy(false) }
  }

  return (
    <div className="card mb-3 p-4 border-2 border-amber-300">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-stone-900">Table {order.tableLabel} <span className="text-xs font-normal text-stone-400">· #{order.id.slice(0, 8).toUpperCase()}</span></div>
          <div className="text-xs text-stone-400">{meta.captain ? `Captain: ${meta.captain} · ` : ''}{order.customerPhone ? `${order.customerPhone} · ` : ''}{formatIST(order.createdAt, 'h:mm a')}</div>
        </div>
        <span className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
      </div>
      <div className="space-y-1 border-t border-stone-100 pt-2">
        {(order.items || []).map(it => {
          const note = itemNote(order, it)
          return (
            <div key={it.id} className="text-sm">
              <div className="flex justify-between"><span className="text-stone-700">{it.menuItem?.name || it.itemName} × {it.quantity}</span><span className="text-stone-500">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span></div>
              {note && <div className="text-xs font-semibold text-amber-700 pl-1">★ {note}</div>}
            </div>
          )
        })}
      </div>
      {meta.note && <div className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Note: {meta.note}</div>}
      <div className="flex gap-2 mt-3">
        <button disabled={busy} onClick={cancel} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"><X size={15} className="inline" /> Cancel</button>
        <button disabled={busy} onClick={confirm} className="flex-1 btn-primary justify-center py-2.5 rounded-xl"><Check size={15} /> Confirm &amp; print KOT</button>
      </div>
    </div>
  )
}

export default function CaptainQueue() {
  const staff = useStaff()
  const outlet = staff?.outlet || 'renukoot'
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.allOrders().then(r => r.data),
    refetchInterval: 4000,
  })
  // Captain orders awaiting the biller's confirmation (dine-in + payment_received).
  const queue = orders.filter(o => (o.outlet || 'renukoot') === outlet && o.tableLabel && o.status === 'payment_received' && getOrderMeta(o).source === 'captain')

  return (
    <AdminLayout title="Captain Orders">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2"><ConciergeBell size={18} /> Captain orders</h2>
          {queue.length > 0 && <p className="text-sm text-amber-600 font-medium">{queue.length} awaiting confirmation</p>}
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>
      {isLoading ? (
        <div className="text-center py-16 text-stone-400">Loading…</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No captain orders awaiting confirmation. Confirmed orders run on the Dine-in floor.</div>
      ) : queue.map(o => <CaptainCard key={o.id} order={o} refetch={refetch} />)}
    </AdminLayout>
  )
}
