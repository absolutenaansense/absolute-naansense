import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, ChevronDown, RefreshCw, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import AdminLayout from '../../components/admin/AdminLayout'
import { ordersApi } from '../../services/api'

const STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'PAYMENT_RECEIVED', label: 'Awaiting confirm' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_NEXT = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
}

const statusStyle = {
  PENDING_PAYMENT: 'bg-stone-100 text-stone-600',
  PAYMENT_RECEIVED: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-brand-100 text-brand-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

function OrderCard({ order, onConfirm, onCancel, onStatusUpdate, loading }) {
  const [expanded, setExpanded] = useState(false)
  const statusLabel = order.status.replace(/_/g, ' ').toLowerCase()
  const nextStatus = STATUS_NEXT[order.status]

  return (
    <div className="card mb-3 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-stone-800">{order.orderNumber}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[order.status]}`}>
                {statusLabel}
              </span>
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {order.user.name} · {order.user.phone} · {format(new Date(order.createdAt), 'dd MMM, h:mm a')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold text-stone-900">₹{parseFloat(order.total).toFixed(0)}</div>
            <div className="text-xs text-stone-400">{order.paymentMethod === 'QR_UPI' ? 'UPI' : 'COD'}</div>
          </div>
          <ChevronDown size={16} className={`text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3">
          {/* Items */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Items</div>
            <div className="space-y-1.5">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-stone-700">{item.menuItem.name} × {item.quantity}</span>
                  <span className="text-stone-900 font-medium">₹{parseFloat(item.subtotal).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm text-stone-500 pt-1 border-t border-stone-50">
                <span>Delivery fee</span><span>₹{parseFloat(order.deliveryFee).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-stone-900">
                <span>Total</span><span>₹{parseFloat(order.total).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          {order.address && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Delivery to</div>
              <div className="text-sm text-stone-700">
                {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}, {order.address.city} — {order.address.pincode}
              </div>
            </div>
          )}

          {/* PetPooja status */}
          {order.petpoojaOrderId && (
            <div className="bg-stone-900 text-green-400 rounded-xl px-3 py-2 text-xs font-mono mb-4 flex items-center gap-2">
              <Printer size={12} /> KOT sent to PetPooja · {order.petpoojaOrderId}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {order.status === 'PAYMENT_RECEIVED' && (
              <>
                <button
                  onClick={() => onConfirm(order.id)}
                  disabled={loading}
                  className="btn-primary py-2 text-sm"
                >
                  <Check size={15} /> Confirm & send KOT
                </button>
                <button
                  onClick={() => onCancel(order.id)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
                >
                  <X size={15} /> Reject
                </button>
              </>
            )}
            {nextStatus && (
              <button
                onClick={() => onStatusUpdate(order.id, nextStatus)}
                disabled={loading}
                className="btn-secondary py-2 text-sm"
              >
                Mark as {nextStatus.replace(/_/g, ' ').toLowerCase()} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => ordersApi.allOrders({ status: statusFilter || undefined }).then(r => r.data),
    refetchInterval: 20000,
  })

  const { mutate: confirmOrder, isPending: confirming } = useMutation({
    mutationFn: (id) => ordersApi.confirmOrder(id),
    onSuccess: () => {
      toast.success('Order confirmed & KOT sent to PetPooja!')
      queryClient.invalidateQueries(['admin-orders'])
      queryClient.invalidateQueries(['admin-stats'])
    },
    onError: () => toast.error('Failed to confirm order'),
  })

  const { mutate: cancelOrder } = useMutation({
    mutationFn: (id) => ordersApi.cancelOrder(id),
    onSuccess: () => { toast.success('Order cancelled'); queryClient.invalidateQueries(['admin-orders']) },
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries(['admin-orders']) },
    onError: () => toast.error('Failed to update status'),
  })

  const pendingCount = data?.orders?.filter(o => o.status === 'PAYMENT_RECEIVED').length || 0

  return (
    <AdminLayout title="Orders">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {f.label}
              {f.value === 'PAYMENT_RECEIVED' && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} className="btn-ghost">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-stone-400 text-sm">Loading orders…</div>
      ) : !data?.orders?.length ? (
        <div className="text-center py-16 text-stone-400 text-sm">No orders found.</div>
      ) : (
        data.orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onConfirm={confirmOrder}
            onCancel={cancelOrder}
            onStatusUpdate={(id, status) => updateStatus({ id, status })}
            loading={confirming}
          />
        ))
      )}
    </AdminLayout>
  )
}
