import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { formatIST } from '../../utils/dateIST'
import { etaInfo } from '../../utils/eta'
import { Package, Clock, CheckCircle2, Truck, XCircle, ChevronDown, ChevronUp, Timer, Receipt } from 'lucide-react'
import LiveOrderTracker from '../../components/customer/LiveOrderTracker'
import PayAheadQR from '../../components/customer/PayAheadQR'
import { printBill } from '../../utils/printKot'
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
  const [expanded, setExpanded] = useState(false)

  // Subscribe to real-time status updates for this order
  useEffect(() => {
    setLiveStatus(order.status) // sync when parent refreshes
    const channel = supabase
      .channel(`order-badge-${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'Order',
        filter: `id=eq.${order.id}`,
      }, (payload) => setLiveStatus(payload.new.status))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [order.id, order.status])

  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const cfg = statusConfig[liveStatus] || statusConfig.pending
  const Icon = cfg.icon
  const isActive = !['delivered', 'cancelled'].includes(liveStatus)
  const eta = (isActive && !['pending', 'payment_received'].includes(liveStatus)) ? etaInfo(order.confirmedAt, now) : null

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
          {order.items?.slice(0, 2).map(i => `${i.menuItem?.name} × ${i.quantity}`).join(', ')}
          {order.items?.length > 2 && ` +${order.items.length - 2} more`}
        </div>
        <div className="flex items-center justify-between border-t border-stone-50 pt-3">
          <span className="text-xs text-stone-500">{order.orderType === 'TAKEAWAY' ? 'Takeaway · Cash' : order.paymentMethod === 'QR_UPI' ? 'UPI · Prepaid' : 'Cash on delivery'}</span>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
            <button onClick={() => printBill(order)} className="text-stone-500 text-xs flex items-center gap-0.5 hover:text-stone-800">
              <Receipt size={13} /> Bill
            </button>
            {isActive && (
              <button onClick={() => setExpanded(e => !e)} className="text-brand-500 text-xs flex items-center gap-0.5">
                Track {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && isActive && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-3">
          <LiveOrderTracker orderId={order.id} />
          {order.paymentStatus !== 'paid' && <PayAheadQR amount={order.total} />}
        </div>
      )}
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
