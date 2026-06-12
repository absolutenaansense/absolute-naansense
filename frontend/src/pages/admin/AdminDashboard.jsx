import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, IndianRupee, Users, Clock, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { adminApi, ordersApi } from '../../services/api'

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${accent}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-stone-900">{value}</div>
      <div className="text-sm text-stone-500 mt-0.5">{label}</div>
    </div>
  )
}

function OrderRow({ order }) {
  const statusColors = {
    PAYMENT_RECEIVED: 'bg-amber-50 text-amber-700',
    CONFIRMED: 'bg-green-50 text-green-700',
    PREPARING: 'bg-blue-50 text-blue-700',
    PENDING_PAYMENT: 'bg-stone-100 text-stone-600',
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
      <div>
        <div className="text-sm font-medium text-stone-800">{order.orderNumber}</div>
        <div className="text-xs text-stone-400">{order.user.name} · {order.items.map(i => i.menuItem.name).slice(0, 2).join(', ')}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-stone-100 text-stone-600'}`}>
          {order.status.replace(/_/g, ' ').toLowerCase()}
        </span>
        <span className="text-sm font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</span>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.dashboard().then(r => r.data.stats),
    refetchInterval: 30000,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders-recent'],
    queryFn: () => ordersApi.allOrders({ page: 1 }).then(r => r.data),
    refetchInterval: 15000,
  })

  return (
    <AdminLayout title="Dashboard">
      {stats?.pendingOrders > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-amber-800">
              {stats.pendingOrders} order{stats.pendingOrders > 1 ? 's' : ''} awaiting payment confirmation
            </span>
          </div>
          <Link to="/admin/orders" className="text-xs font-medium text-amber-700 hover:text-amber-900 underline">
            Review →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Orders today" value={stats?.ordersToday ?? '—'} icon={ShoppingBag} accent="bg-brand-500" />
        <StatCard label="Revenue today" value={stats?.revenueToday ? `₹${parseFloat(stats.revenueToday).toFixed(0)}` : '₹0'} icon={IndianRupee} accent="bg-green-500" />
        <StatCard label="Pending confirm" value={stats?.pendingOrders ?? 0} icon={Clock} accent="bg-amber-500" />
        <StatCard label="Total customers" value={stats?.totalUsers ?? '—'} icon={Users} accent="bg-blue-500" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">Recent orders</h2>
            <Link to="/admin/orders" className="text-xs text-brand-500 hover:text-brand-600">View all →</Link>
          </div>
          {ordersData?.orders?.length ? (
            ordersData.orders.slice(0, 8).map(o => <OrderRow key={o.id} order={o} />)
          ) : (
            <div className="text-center py-8 text-stone-400 text-sm">No orders yet</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-stone-700 mb-3">Quick actions</h2>
            <div className="space-y-2">
              <Link to="/admin/orders" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-50 text-sm text-stone-600 transition-colors">
                <ShoppingBag size={15} className="text-stone-400" /> Manage orders
              </Link>
              <Link to="/admin/reservations" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-50 text-sm text-stone-600 transition-colors">
                📅 Reservations
              </Link>
              <Link to="/admin/menu" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-50 text-sm text-stone-600 transition-colors">
                🍽️ Manage menu
              </Link>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-stone-700 mb-2">This month</h2>
            <div className="text-2xl font-semibold text-stone-900">{stats?.ordersThisMonth ?? 0}</div>
            <div className="text-xs text-stone-400">total orders</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
