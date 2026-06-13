import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { CheckCircle2, Clock, ChefHat, Truck, PackageCheck, Loader2 } from 'lucide-react'

const STEPS = [
  { status: 'payment_received', label: 'Order placed', sublabel: 'Awaiting restaurant confirmation', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { status: 'confirmed',        label: 'Order confirmed',  sublabel: 'Restaurant accepted', icon: CheckCircle2, color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
  { status: 'preparing',        label: 'Being prepared',   sublabel: 'Chef is cooking!',    icon: ChefHat,      color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200' },
  { status: 'out_for_delivery', label: 'Out for delivery', sublabel: 'On the way to you',   icon: Truck,        color: 'text-purple-600',bg: 'bg-purple-50',border: 'border-purple-200' },
  { status: 'delivered',        label: 'Delivered!',       sublabel: 'Enjoy your meal 🎉',  icon: PackageCheck, color: 'text-green-700', bg: 'bg-green-100',border: 'border-green-300' },
]

const STATUS_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.status, i]))

export default function LiveOrderTracker({ orderId }) {
  const [status, setStatus] = useState('payment_received')
  const [loading, setLoading] = useState(true)

  // Initial fetch + polling fallback (in case a realtime event is missed).
  useEffect(() => {
    if (!orderId) return
    let active = true
    const fetchStatus = () => supabase.from('Order').select('status').eq('id', orderId).single()
      .then(({ data }) => { if (active && data) { setStatus(data.status); setLoading(false) } })
    fetchStatus()
    const t = setInterval(fetchStatus, 10000)
    return () => { active = false; clearInterval(t) }
  }, [orderId])

  // Real-time subscription
  useEffect(() => {
    if (!orderId) return
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Order',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const newStatus = payload.new.status
        setStatus(newStatus)
        // Show toast-style notification
        const step = STEPS.find(s => s.status === newStatus)
        if (step) {
          // Trigger browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification('Absolute Naansense', { body: step.label + ' — ' + step.sublabel, icon: '/favicon.ico' })
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [orderId])

  const currentIdx = STATUS_INDEX[status] ?? 0

  if (loading) return (
    <div className="flex items-center justify-center py-8 gap-2 text-stone-400">
      <Loader2 size={18} className="animate-spin" /> Tracking your order…
    </div>
  )

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-800 mb-4 text-center">Live order status</h3>
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isDone = i < currentIdx
          const isCurrent = i === currentIdx
          const isPending = i > currentIdx
          return (
            <div key={step.status} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              isCurrent ? `${step.bg} ${step.border} border` :
              isDone ? 'bg-stone-50 border-stone-100 border opacity-70' :
              'bg-white border-stone-50 border opacity-40'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCurrent ? step.bg : isDone ? 'bg-stone-100' : 'bg-stone-50'
              }`}>
                {isCurrent ? (
                  <Icon size={16} className={`${step.color} ${step.status === 'preparing' ? 'animate-pulse' : ''}`} />
                ) : isDone ? (
                  <CheckCircle2 size={16} className="text-stone-400" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-stone-200" />
                )}
              </div>
              <div>
                <div className={`text-sm font-medium ${isCurrent ? step.color : isPending ? 'text-stone-300' : 'text-stone-500'}`}>
                  {step.label}
                </div>
                {isCurrent && <div className="text-xs text-stone-500">{step.sublabel}</div>}
              </div>
              {isCurrent && (
                <div className="ml-auto">
                  <div className={`w-2 h-2 rounded-full ${step.color.replace('text-', 'bg-')} animate-pulse`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-center text-stone-400 mt-3">Updates automatically • no refresh needed</p>
    </div>
  )
}
