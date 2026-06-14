import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, IndianRupee, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { ordersApi } from '../../services/api'
import { formatIST, isTodayIST } from '../../utils/dateIST'
import { useStaff } from '../../staff/StaffContext'

const statusColors = {
  pending: 'bg-stone-100 text-stone-600',
  payment_received: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}
const outletName = (o) => o === 'renusagar' ? 'Renusagar' : 'Renukoot'

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
  const staff = useStaff()
  const [outletFilter, setOutletFilter] = useState(staff?.outlet || 'all')
  const activeOutlet = staff?.outlet || outletFilter
  const basePath = staff?.basePath || '/super_admin'

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.allOrders().then(r => r.data),
    refetchInterval: 15000,
  })

  const scoped = orders.filter(o => activeOutlet === 'all' || (o.outlet || 'renukoot') === activeOutlet)
  const todayOrders = scoped.filter(o => isTodayIST(o.createdAt))
  const fulfilledToday = todayOrders.filter(o => o.status === 'delivered').length
  const todayRevenue = todayOrders.filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled').reduce((s, o) => s + parseFloat(o.total), 0)
  const pendingConfirm = scoped.filter(o => o.status === 'payment_received').length

  // Per-outlet revenue split (today) when viewing all outlets.
  const revFor = (out) => orders.filter(o => (o.outlet || 'renukoot') === out && isTodayIST(o.createdAt) && o.paymentStatus === 'paid' && o.status !== 'cancelled').reduce((s, o) => s + parseFloat(o.total), 0)

  return (
    <AdminLayout title="Dashboard">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-stone-900">Dashboard {activeOutlet !== 'all' ? `· ${outletName(activeOutlet)}` : '· All outlets'}</h2>
        {!staff?.outlet && (
          <select value={outletFilter} onChange={e => setOutletFilter(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5">
            <option value="all">All outlets</option>
            <option value="renukoot">Renukoot</option>
            <option value="renusagar">Renusagar</option>
          </select>
        )}
      </div>

      {pendingConfirm > 0 && (
        <div className="block mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 font-medium">
          🔔 {pendingConfirm} order{pendingConfirm > 1 ? 's' : ''} awaiting confirmation at the biller.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard label="Fulfilled orders today" value={fulfilledToday} icon={ShoppingBag} accent="bg-brand-500" />
        <StatCard label="Revenue today" value={`₹${todayRevenue.toFixed(0)}`} icon={IndianRupee} accent="bg-green-500" />
        <StatCard label="Pending confirm" value={pendingConfirm} icon={Clock} accent="bg-amber-500" />
      </div>

      {activeOutlet === 'all' && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card p-4"><div className="text-xs text-stone-400 uppercase tracking-wider mb-1">Renukoot today</div><div className="text-lg font-semibold text-stone-900">₹{revFor('renukoot').toFixed(0)}</div></div>
          <div className="card p-4"><div className="text-xs text-stone-400 uppercase tracking-wider mb-1">Renusagar today</div><div className="text-lg font-semibold text-stone-900">₹{revFor('renusagar').toFixed(0)}</div></div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Recent orders</div>
          <Link to={`${basePath}/reports`} className="text-xs text-brand-500 font-medium">Reports →</Link>
        </div>
        {scoped.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">No orders yet</p>
        ) : (
          scoped.slice(0, 8).map(order => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
              <div>
                <div className="text-sm font-medium text-stone-800">#{order.id?.substring(0,8).toUpperCase()} <span className="text-xs font-normal text-stone-400">· {outletName(order.outlet)}</span></div>
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
