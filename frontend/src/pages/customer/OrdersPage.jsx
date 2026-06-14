import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ordersApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { formatIST } from '../../utils/dateIST'
import { etaInfo } from '../../utils/eta'
import { Package, Clock, CheckCircle2, Truck, XCircle, ChevronDown, ChevronUp, Timer, Receipt, RotateCcw, ListTree } from 'lucide-react'
import LiveOrderTracker from '../../components/customer/LiveOrderTracker'
import PayAheadQR from '../../components/customer/PayAheadQR'
import TaxInvoiceModal from '../../components/TaxInvoiceModal'
import { parseOrderNotes, getOrderMeta, orderFees } from '../../utils/orderNotes'
import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'

const statusConfig = {
  pending: { label: 'Awaiting payment', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  payment_received: { label: 'Awaiting confirmation', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  preparing: { label: 'Preparing', icon: Package, color: 'text-brand-600 bg-brand-50' },
  out_for_delivery: { label: 'On the way', icon: Truck, color: 'text-blue-600 bg-blue-50' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' },
}

function OrderCard({ order }) {
  const [liveStatus, setLiveStatus] = useState(order.status)
  const [liveNotes, setLiveNotes] = useState(order.notes)
  const [expanded, setExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const navigate = useNavigate()

  // Re-order: drop this order's items back into the cart for the same outlet.
  const reorder = () => {
    const cart = useCartStore.getState()
    cart.setOutlet(order.outlet || 'renukoot')   // empties cart if a different outlet
    ;(order.items || []).forEach(it => {
      const item = {
        id: it.menuItemId || `ext-${(it.menuItem?.name || it.itemName || 'item')}`,
        name: it.menuItem?.name || it.itemName, price: parseFloat(it.price), external: !it.menuItemId,
      }
      for (let i = 0; i < it.quantity; i++) cart.addItem(item)
    })
    toast.success('Items added to cart')
    navigate('/menu')
  }

  // Subscribe to real-time status updates for this order
  useEffect(() => {
    setLiveStatus(order.status) // sync when parent refreshes
    setLiveNotes(order.notes)
    const channel = supabase
      .channel(`order-badge-${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'Order',
        filter: `id=eq.${order.id}`,
      }, (payload) => { setLiveStatus(payload.new.status); setLiveNotes(payload.new.notes) })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [order.id, order.status, order.notes])

  const cancelRemark = liveStatus === 'cancelled' ? parseOrderNotes(liveNotes).cancelRemark : null

  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const cfg = statusConfig[liveStatus] || statusConfig.pending
  const Icon = cfg.icon
  const isActive = !['delivered', 'cancelled'].includes(liveStatus)
  const eta = (isActive && !['pending', 'payment_received'].includes(liveStatus)) ? etaInfo(order.confirmedAt, now) : null

  const meta = getOrderMeta(order)
  const { subtotal, gst, delivery, convenience } = orderFees(order)

  return (
    <div className="card mb-3 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-sm font-semibold text-stone-700">#{order.id?.substring(0,8).toUpperCase()}</div>
            <div className="text-xs text-stone-400 mt-0.5">{formatIST(order.createdAt, 'dd MMM yyyy · h:mm a')}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
              <Icon size={12} /> {cfg.label}
            </span>
            {eta && (
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${eta.overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                <Timer size={11} /> {eta.overdue ? 'Arriving soon' : `ETA ${eta.label}`}
              </span>
            )}
          </div>
        </div>
        <div className="text-sm text-stone-600 mb-3">
          {order.items?.slice(0, 2).map(i => `${i.menuItem?.name || i.itemName} × ${i.quantity}`).join(', ')}
          {order.items?.length > 2 && ` +${order.items.length - 2} more`}
        </div>
        {liveStatus === 'cancelled' && (
          <div className="mb-3 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
            <span className="font-medium text-red-500">Order cancelled{cancelRemark ? ' — ' : ''}</span>{cancelRemark || ' by the restaurant.'}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-stone-50 pt-3">
          <span className="text-xs text-stone-500">{order.orderType === 'TAKEAWAY' ? 'Takeaway · Cash' : order.paymentMethod === 'QR_UPI' ? 'UPI · Prepaid' : 'Cash on delivery'}</span>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
            <button onClick={() => setDetailsOpen(d => !d)} className="text-stone-500 text-xs flex items-center gap-0.5 hover:text-stone-800">
              <ListTree size={13} /> Details {detailsOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            </button>
            <button onClick={() => setInvoiceOpen(true)} className="text-stone-500 text-xs flex items-center gap-0.5 hover:text-stone-800">
              <Receipt size={13} /> Invoice
            </button>
            {isActive && (
              <button onClick={() => setExpanded(e => !e)} className="text-brand-500 text-xs flex items-center gap-0.5">
                Track {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full order details */}
      {detailsOpen && (
        <div className="border-t border-stone-100 p-4 space-y-3 bg-stone-50/50">
          <div>
            <div className="text-xs font-semibold text-stone-400 uppercase mb-1.5">Items</div>
            <div className="space-y-1">
              {(order.items || []).map(it => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-stone-700">{it.menuItem?.name || it.itemName} × {it.quantity}</span>
                  <span className="text-stone-600">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 mt-2 pt-2 space-y-0.5 text-xs text-stone-500">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              {delivery > 0 && <div className="flex justify-between"><span>Delivery</span><span>₹{delivery}</span></div>}
              {convenience > 0 && <div className="flex justify-between"><span>Delivery convenience</span><span>₹{convenience}</span></div>}
              <div className="flex justify-between"><span>GST (5%)</span><span>₹{gst}</span></div>
              <div className="flex justify-between text-sm font-semibold text-stone-900 pt-0.5"><span>Total</span><span>₹{parseFloat(order.total).toFixed(0)}</span></div>
            </div>
          </div>
          {meta.address && <div className="text-xs text-stone-500"><span className="text-stone-400">Deliver to: </span>{meta.address}</div>}
          {meta.note && <div className="text-xs text-amber-600"><span className="text-amber-500">Note: </span>{meta.note}</div>}
          <button onClick={reorder} className="btn-primary w-full justify-center py-2.5 rounded-xl text-sm"><RotateCcw size={14} /> Re-order these items</button>
        </div>
      )}
      {expanded && isActive && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-3">
          <LiveOrderTracker orderId={order.id} />
          {order.paymentStatus !== 'paid' && <PayAheadQR amount={order.total} />}
        </div>
      )}
      {invoiceOpen && <TaxInvoiceModal order={order} onClose={() => setInvoiceOpen(false)} />}
    </div>
  )
}

export default function OrdersPage() {
  const { user } = useAuthStore()
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => ordersApi.myOrders(user?.id).then(r => r.data),
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return (
    <CustomerLayout showBack title="My orders">
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="text-center py-16 text-stone-400 text-sm">Loading orders…</div>
        ) : !orders?.length ? (
          <div className="text-center py-16">
            <Package size={40} className="text-stone-200 mx-auto mb-3" />
            <div className="text-stone-400 text-sm">No orders yet. Go explore the menu!</div>
          </div>
        ) : (
          orders.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </CustomerLayout>
  )
}
