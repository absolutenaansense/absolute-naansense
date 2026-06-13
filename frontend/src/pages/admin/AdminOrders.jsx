import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, ChevronDown, ChevronUp, RefreshCw, Printer, Timer, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatIST } from '../../utils/dateIST'
import { etaInfo } from '../../utils/eta'
import { getOrderMeta, itemNote } from '../../utils/orderNotes'
import { printTicket, printBill } from '../../utils/printKot'
import AdminLayout from '../../components/admin/AdminLayout'
import { ordersApi } from '../../services/api'

const STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'payment_received', label: 'Awaiting confirm' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_NEXT = {
  confirmed: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'delivered',
}

const statusStyle = {
  pending: 'bg-stone-100 text-stone-600',
  payment_received: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const statusLabel = (s) => ({
  pending: 'Awaiting payment',
  payment_received: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}[s] || s)

function OrderCard({ order, refetch, now }) {
  const [expanded, setExpanded] = useState(order.status === 'payment_received')
  const [loading, setLoading] = useState(false)
  const nextStatus = STATUS_NEXT[order.status]

  const active = !['delivered', 'cancelled', 'payment_received', 'pending'].includes(order.status)
  const eta = active ? etaInfo(order.confirmedAt, now) : null

  const meta = getOrderMeta(order)
  const subtotal = (order.items || []).reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const gst = Math.round(subtotal * 0.05)
  const delivery = Math.max(0, Math.round(parseFloat(order.total) - subtotal - gst))

  const orderKot = (o, kotNo) => printTicket({ ...o, kotNo: kotNo ?? o.items?.[0]?.kotNo }, { title: 'KOT', showPrices: false })

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const { kotNo } = await ordersApi.confirmOrder(order.id)
      orderKot(order, kotNo)                               // print clean KOT to connected printer
      await ordersApi.updateStatus(order.id, 'preparing')  // confirm => preparing
      toast.success('Confirmed — KOT sent to printer')
      refetch()
    } catch { toast.error('Failed to confirm') }
    finally { setLoading(false) }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      await ordersApi.cancelOrder(order.id)
      toast.success('Order cancelled')
      refetch()
    } catch { toast.error('Failed to cancel') }
    finally { setLoading(false) }
  }

  const handleAdvance = async () => {
    setLoading(true)
    try {
      await ordersApi.updateStatus(order.id, nextStatus)
      toast.success(`Marked as ${statusLabel(nextStatus)}`)
      refetch()
    } catch { toast.error('Failed to update') }
    finally { setLoading(false) }
  }

  return (
    <div className={`card mb-3 overflow-hidden ${order.status === 'payment_received' ? 'border-2 border-amber-300' : ''}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-stone-800">
              #{order.id?.substring(0, 8).toUpperCase()}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[order.status] || 'bg-stone-100 text-stone-600'}`}>
              {statusLabel(order.status)}
            </span>
            {order.status === 'payment_received' && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                Action needed
              </span>
            )}
            {eta && (
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${eta.overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                <Timer size={11} /> ETA {eta.label}
              </span>
            )}
          </div>
          <div className="text-xs text-stone-400">
            {order.user?.name} · {order.user?.phone} · {formatIST(order.createdAt, 'dd MMM, h:mm a IST')}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
          {expanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 p-4 space-y-4">
          {/* Items */}
          <div>
            <div className="text-xs font-semibold text-stone-400 uppercase mb-2">Items</div>
            <div className="space-y-1.5">
              {order.items?.map(item => {
                const note = itemNote(order, item)
                return (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-700">{item.menuItem?.name} × {item.quantity}</span>
                      <span className="text-stone-900 font-medium">₹{(parseFloat(item.price) * item.quantity).toFixed(0)}</span>
                    </div>
                    {note && <div className="text-xs text-amber-600 italic pl-1">↳ {note}</div>}
                  </div>
                )
              })}
            </div>
            <div className="border-t border-stone-100 mt-2 pt-2 space-y-0.5">
              <div className="flex justify-between text-xs text-stone-500"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              {delivery > 0 && <div className="flex justify-between text-xs text-stone-500"><span>Delivery</span><span>₹{delivery}</span></div>}
              <div className="flex justify-between text-xs text-stone-500"><span>GST (5%)</span><span>₹{gst}</span></div>
              <div className="flex justify-between text-sm font-semibold pt-0.5"><span>Total</span><span>₹{parseFloat(order.total).toFixed(0)}</span></div>
            </div>
          </div>

          {meta.address && (
            <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600">
              <span className="text-stone-400">Deliver to: </span>{meta.address}
            </div>
          )}

          {/* Payment info */}
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500 flex justify-between">
            <span>Payment: <strong>{order.paymentMethod === 'QR_UPI' ? 'UPI / Prepaid' : 'Cash on delivery'}</strong></span>
            <span>Status: <strong className={order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}>{order.paymentStatus}</strong></span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {order.status === 'payment_received' && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 btn-primary justify-center py-2.5 rounded-xl"
                >
                  <Check size={15} /> Confirm &amp; print KOT
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium"
                >
                  <X size={15} />
                </button>
              </>
            )}
            {nextStatus && order.status !== 'payment_received' && (
              <button
                onClick={handleAdvance}
                disabled={loading}
                className="flex-1 btn-primary justify-center py-2.5 rounded-xl"
              >
                Mark as {statusLabel(nextStatus)}
              </button>
            )}
            {['confirmed', 'preparing', 'out_for_delivery', 'delivered'].includes(order.status) && (
              <>
                <button
                  onClick={() => orderKot(order)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium flex items-center gap-1.5"
                >
                  <Printer size={15} /> KOT
                </button>
                <button
                  onClick={() => printBill(order)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium flex items-center gap-1.5"
                >
                  <Receipt size={15} /> Bill
                </button>
              </>
            )}
            {['confirmed', 'preparing', 'out_for_delivery'].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminOrders() {
  const [filter, setFilter] = useState('')
  const [now, setNow] = useState(Date.now())
  const queryClient = useQueryClient()

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.allOrders().then(r => r.data),
    refetchInterval: 15000, // auto-refresh every 15 seconds
  })

  // POS floor/counter orders (tables + take-away) are managed in the Dine-in page.
  // Customer "dine-in" (no tableLabel) still belongs here.
  const onlineOrders = orders.filter(o => !o.tableLabel && getOrderMeta(o).type !== 'TAKEAWAY')
  const filtered = filter ? onlineOrders.filter(o => o.status === filter) : onlineOrders
  const pendingCount = onlineOrders.filter(o => o.status === 'payment_received').length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Orders</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 font-medium">{pendingCount} order{pendingCount > 1 ? 's' : ''} awaiting confirmation</p>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filter === f.value
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
            }`}
          >
            {f.label}
            {f.value === 'payment_received' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-16 text-stone-400">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No orders found.</div>
      ) : (
        filtered.map(order => (
          <OrderCard key={order.id} order={order} refetch={refetch} now={now} />
        ))
      )}
    </AdminLayout>
  )
}
