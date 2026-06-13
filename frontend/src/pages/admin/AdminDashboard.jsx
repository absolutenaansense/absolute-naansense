import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, IndianRupee, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { ordersApi } from '../../services/api'
import { formatIST, isTodayIST } from '../../utils/dateIST'

const statusColors = {
  pending: 'bg-stone-100 text-stone-600',
  payment_received: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${accent}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-stone-900">{value ?? '—'}</div>
      <div className="text-sm text-stone-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: orders = [], refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.allOrders().then(r => r.data),
    refetchInterval: 15000,
  })

  const todayOrders = orders.filter(o => isTodayIST(o.createdAt))
  // Fulfilled = delivered orders (cancelled orders are never counted).
  const fulfilledToday = todayOrders.filter(o => o.status === 'delivered').length
  // Revenue counts only fulfilled orders: paid and not cancelled.
  const todayRevenue = todayOrders.filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled').reduce((s, o) => s + parseFloat(o.total), 0)
  const pendingConfirm = orders.filter(o => o.status === 'payment_received').length

  return (
    <AdminLayout>
      <h2 className="text-lg font-semibold text-stone-900 mb-4">Dashboard</h2>

      {pendingConfirm > 0 && (
        <Link to="/admin/orders" className="block mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 font-medium">
          🔔 {pendingConfirm} order{pendingConfirm > 1 ? 's' : ''} awaiting your confirmation → Go to Orders
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Fulfilled orders today" value={fulfilledToday} icon={ShoppingBag} accent="bg-brand-500" />
        <StatCard label="Revenue today" value={`₹${todayRevenue.toFixed(0)}`} icon={IndianRupee} accent="bg-green-500" />
        <StatCard label="Pending confirm" value={pendingConfirm} icon={Clock} accent="bg-amber-500" />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Recent orders</div>
          <Link to="/admin/orders" className="text-xs text-brand-500 font-medium">View all →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">No orders yet</p>
        ) : (
          orders.slice(0, 8).map(order => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
              <div>
                <div className="text-sm font-medium text-stone-800">#{order.id?.substring(0,8).toUpperCase()}</div>
                <div className="text-xs text-stone-400">
                  {order.user?.name} · {formatIST(order.createdAt, 'h:mm a IST')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-stone-100 text-stone-600'}`}>
                  {order.status?.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  )
}
