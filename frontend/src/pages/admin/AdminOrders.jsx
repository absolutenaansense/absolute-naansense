import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X, ChevronDown, ChevronUp, RefreshCw, Printer, Timer, Receipt, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatIST } from '../../utils/dateIST'
import { etaInfo } from '../../utils/eta'
import { getOrderMeta, itemNote } from '../../utils/orderNotes'
import { printTicket } from '../../utils/printKot'
import { sendKotWhatsApp } from '../../utils/whatsappKot'
import AdminLayout from '../../components/admin/AdminLayout'
import TaxInvoiceModal from '../../components/TaxInvoiceModal'
import { useStaff } from '../../staff/StaffContext'
import { ordersApi } from '../../services/api'

// Active work-queue statuses (awaiting confirmation → out for delivery). Delivered
// and cancelled orders leave the queue and live in Reports.
const QUEUE_STATUSES = ['payment_received', 'confirmed', 'preparing', 'out_for_delivery']

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
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelRemark, setCancelRemark] = useState('')
  const nextStatus = STATUS_NEXT[order.status]

  const active = !['delivered', 'cancelled', 'payment_received', 'pending'].includes(order.status)
  const eta = active ? etaInfo(order.confirmedAt, now) : null

  const meta = getOrderMeta(order)
  const subtotal = (order.items || []).reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const gst = Math.round(subtotal * 0.05)
  const delivery = Math.max(0, Math.round(parseFloat(order.total) - subtotal - gst))

  const orderKot = (o) => printTicket({ ...o, kotNo: o.items?.[0]?.kotNo }, { title: 'KOT', showPrices: false })

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await ordersApi.confirmOrder(order.id)
      await ordersApi.updateStatus(order.id, 'preparing')
      orderKot(order)   // print the KOT on confirmation
      toast.success('Order confirmed — KOT printed')
      refetch()
    } catch { toast.error('Failed to confirm') }
    finally { setLoading(false) }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      await ordersApi.cancelOrder(order.id, cancelRemark)
      toast.success('Order cancelled')
      setCancelOpen(false)
      setCancelRemark('')
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
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
              {meta.outlet === 'renusagar' ? 'Renusagar' : 'Renukoot'}
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
                      <span className="text-stone-700">{item.menuItem?.name || item.itemName} × {item.quantity}</span>
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
          {meta.type === 'TAKEAWAY' && order.pickupAt && (
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 font-medium">
              <span className="text-amber-500">Pickup at: </span>{formatIST(order.pickupAt, 'dd MMM, h:mm a')}
            </div>
          )}
          {meta.note && (
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
              <span className="text-amber-500">Special request: </span>{meta.note}
            </div>
          )}
          {order.status === 'cancelled' && meta.cancelRemark && (
            <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700">
              <span className="text-red-500">Cancellation remark: </span>{meta.cancelRemark}
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
                  <Check size={15} /> Confirm order
                </button>
                <button
                  onClick={() => setCancelOpen(true)}
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
                  onClick={() => setInvoiceOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium flex items-center gap-1.5"
                >
                  <Receipt size={15} /> Tax invoice
                </button>
                <button
                  onClick={() => sendKotWhatsApp(order)}
                  className="px-4 py-2.5 rounded-xl border border-green-200 text-green-600 hover:bg-green-50 text-sm font-medium flex items-center gap-1.5"
                >
                  <MessageCircle size={15} /> WhatsApp KOT
                </button>
              </>
            )}
            {['confirmed', 'preparing', 'out_for_delivery'].includes(order.status) && (
              <button
                onClick={() => setCancelOpen(true)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      {invoiceOpen && <TaxInvoiceModal order={order} printable onClose={() => setInvoiceOpen(false)} />}

      {cancelOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => !loading && setCancelOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-stone-900 mb-1">Cancel order</h3>
            <p className="text-sm text-stone-500 mb-3">#{order.id?.substring(0, 8).toUpperCase()} · ₹{parseFloat(order.total).toFixed(0)}</p>
            <label className="label">Cancellation remark <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea
              value={cancelRemark}
              onChange={e => setCancelRemark(e.target.value)}
              rows={3}
              placeholder="e.g. Item out of stock, customer requested, address unreachable…"
              className="input resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setCancelOpen(false)} disabled={loading} className="btn-secondary flex-1 justify-center">Keep order</button>
              <button onClick={handleCancel} disabled={loading} className="btn-primary flex-1 justify-center bg-red-500 hover:bg-red-600 active:bg-red-700">
                {loading ? 'Cancelling…' : 'Cancel order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminOrders() {
  const staff = useStaff()
  const outlet = staff?.outlet || 'renukoot'
  const [now, setNow] = useState(Date.now())

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  // New-order alerts + KOT auto-print run app-wide in <OrderAlerts/> (BillerApp),
  // so they fire on any screen. Here we just poll the queue fast during open hours.
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.allOrders().then(r => r.data),
    refetchInterval: () => {
      const [h, m] = formatIST(new Date().toISOString(), 'HH:mm').split(':').map(Number)
      const mins = h * 60 + m
      return (mins >= 600 && mins <= 1410) ? 2000 : 30000 // 10:00 AM–11:30 PM IST → 2s, else 30s
    },
  })

  // Live queue: this outlet's online (delivery + takeaway) orders that still need
  // handling — from awaiting confirmation through out-for-delivery. Delivered &
  // cancelled orders drop off here (they're in Reports). POS orders are on Dine-in.
  const queue = orders
    .filter(o => !o.tableLabel && o.user?.phone !== '0000000000' && (o.outlet || 'renukoot') === outlet)
    .filter(o => QUEUE_STATUSES.includes(o.status))
  const pendingCount = queue.filter(o => o.status === 'payment_received').length

  return (
    <AdminLayout title="Online Orders">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Online orders queue</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 font-medium">{pendingCount} order{pendingCount > 1 ? 's' : ''} awaiting confirmation</p>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-stone-500 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Orders queue */}
      {isLoading ? (
        <div className="text-center py-16 text-stone-400">Loading orders…</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No active orders. Delivered orders are in Reports.</div>
      ) : (
        queue.map(order => (
          <OrderCard key={order.id} order={order} refetch={refetch} now={now} />
        ))
      )}
    </AdminLayout>
  )
}
