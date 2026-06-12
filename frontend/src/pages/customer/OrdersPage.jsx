import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { format } from 'date-fns'
import { Package, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react'

const statusConfig = {
  pending: { label: 'Awaiting payment', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  payment_received: { label: 'Payment received', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  preparing: { label: 'Preparing', icon: Package, color: 'text-brand-600 bg-brand-50' },
  out_for_delivery: { label: 'On the way', icon: Truck, color: 'text-blue-600 bg-blue-50' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' },
}

function OrderCard({ order }) {
  const cfg = statusConfig[order.status] || statusConfig.pending
  const Icon = cfg.icon
  return (
    <div className="card p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-sm font-semibold text-stone-700">#{order.id?.substring(0,8).toUpperCase()}</div>
          <div className="text-xs text-stone-400 mt-0.5">{format(new Date(order.createdAt), 'dd MMM yyyy · h:mm a')}</div>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
          <Icon size={12} /> {cfg.label}
        </span>
      </div>
      <div className="text-sm text-stone-600 mb-3">
        {order.items.slice(0, 2).map(i => `${i.menuItem.name} × ${i.quantity}`).join(', ')}
        {order.items.length > 2 && ` +${order.items.length - 2} more`}
      </div>
      <div className="flex items-center justify-between border-t border-stone-50 pt-3">
        <span className="text-xs text-stone-500">{order.paymentMethod === 'QR_UPI' ? 'UPI' : 'Cash on delivery'} · {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'Prepaid'}</span>
        <span className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
      </div>
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
