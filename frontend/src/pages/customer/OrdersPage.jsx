import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '../../services/api'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { format } from 'date-fns'
import { Package, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react'

const statusConfig = {
  PENDING_PAYMENT: { label: 'Awaiting payment', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  PAYMENT_RECEIVED: { label: 'Payment received', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  CONFIRMED: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  PREPARING: { label: 'Preparing', icon: Package, color: 'text-brand-600 bg-brand-50' },
  OUT_FOR_DELIVERY: { label: 'On the way', icon: Truck, color: 'text-blue-600 bg-blue-50' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' },
}

function OrderCard({ order }) {
  const cfg = statusConfig[order.status] || statusConfig.CONFIRMED
  const Icon = cfg.icon
  return (
    <div className="card p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-sm font-semibold text-stone-700">{order.orderNumber}</div>
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
        <span className="text-xs text-stone-500">{order.paymentMethod === 'QR_UPI' ? 'UPI' : 'Cash on delivery'} · {order.type === 'DELIVERY' ? 'Delivery' : 'Dine-in'}</span>
        <span className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.myOrders().then(r => r.data),
    refetchInterval: 30000, // Poll every 30s for status updates
  })

  return (
    <CustomerLayout showBack title="My orders">
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="text-center py-16 text-stone-400 text-sm">Loading orders…</div>
        ) : !data?.orders?.length ? (
          <div className="text-center py-16">
            <Package size={40} className="text-stone-200 mx-auto mb-3" />
            <div className="text-stone-400 text-sm">No orders yet. Go explore the menu!</div>
          </div>
        ) : (
          data.orders.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </CustomerLayout>
  )
}
