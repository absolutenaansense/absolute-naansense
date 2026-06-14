import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStaff } from '../../staff/StaffContext'
import { ordersApi } from '../../services/api'
import { printTicket } from '../../utils/printKot'
import { playRing, notify, requestNotifyPermission, armAudio } from '../../utils/notify'

// Mounted once per biller app (not per page), so the biller is alerted about new
// orders + their KOT auto-prints no matter which screen they're on.
export default function OrderAlerts() {
  const staff = useStaff()
  const outlet = staff?.outlet || 'renukoot'
  const qc = useQueryClient()
  const alerted = useRef(new Set())
  const printed = useRef(new Set())

  useEffect(() => { armAudio(); requestNotifyPermission() }, [])

  useEffect(() => {
    const mine = (row) => (row.outlet || 'renukoot') === outlet && !row.tableLabel

    // Ring + browser notification when an order enters the confirm queue.
    const alertPending = (row) => {
      if (!mine(row) || row.status !== 'payment_received' || alerted.current.has(row.id)) return
      alerted.current.add(row.id)
      playRing()
      notify('New order — needs confirmation', `#${String(row.id).slice(0, 8).toUpperCase()} · ₹${parseFloat(row.total).toFixed(0)}`, `${import.meta.env.BASE_URL}logo.jpg`)
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    }

    // Auto-print the KOT shortly after the order row + items land.
    const autoPrint = (row) => {
      if (!mine(row) || !['payment_received', 'pending'].includes(row.status) || printed.current.has(row.id)) return
      printed.current.add(row.id)
      setTimeout(async () => {
        try {
          const { data } = await ordersApi.getOrder(row.id)
          if (data?.items?.length) printTicket({ ...data, kotNo: data.items[0]?.kotNo }, { title: 'KOT', showPrices: false })
        } catch { /* ignore */ }
        qc.invalidateQueries({ queryKey: ['admin-orders'] })
      }, 1800)
    }

    const ch = supabase
      .channel('biller-order-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Order' }, (p) => { autoPrint(p.new); alertPending(p.new) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Order' }, (p) => {
        if (p.new.status === 'payment_received' && p.old?.status !== 'payment_received') alertPending(p.new)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [outlet, qc])

  return null
}
