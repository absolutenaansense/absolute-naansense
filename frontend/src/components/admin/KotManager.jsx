import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Printer, Eye, Trash2, Pencil, Minus, Plus, Search, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { dineApi } from '../../services/api'
import { formatIST } from '../../utils/dateIST'
import { printTicket } from '../../utils/printKot'
import { sendKotWhatsApp } from '../../utils/whatsappKot'

const nameOf = (it) => it.menuItem?.name || it.itemName || ''

// Global KOT manager — opens on Ctrl+K. Lists every KOT punched today with
// per-KOT actions (print / view / cancel / modify). KOTs already used in a bill
// are shown muted with only view + print.
export default function KotManager() {
  const [open, setOpen] = useState(false)
  const [viewKot, setViewKot] = useState(null)      // kotNo whose items are expanded
  const [editKot, setEditKot] = useState(null)      // kotNo being modified
  const [draft, setDraft] = useState([])            // [{ id, quantity, it }]
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['kot-manager'], queryFn: () => dineApi.kotsRecent().then(r => r.data),
    enabled: open, refetchInterval: open ? 15000 : false,
  })

  // Only KOTs the restaurant has confirmed/accepted — across every channel
  // (dine-in, takeaway/pickup, delivery). Skip cancelled orders and online
  // orders still awaiting payment or confirmation.
  const SKIP = ['cancelled', 'pending', 'payment_received']
  const kots = useMemo(() => {
    const list = []
    for (const o of orders) {
      if (SKIP.includes(o.status)) continue
      const items = o.items || []
      if (!items.length) continue
      const used = !!o.billPrinted || o.paymentStatus === 'paid'
      const numbered = items.filter(it => it.kotNo != null)
      if (numbered.length) {
        const byKot = {}
        for (const it of numbered) (byKot[it.kotNo] ||= []).push(it)
        for (const [k, its] of Object.entries(byKot)) {
          list.push({ kotNo: Number(k), order: o, items: its, used })
        }
      } else {
        // Confirmed order whose items carry no per-item KOT number — show the
        // whole order as a single KOT so it still appears here.
        list.push({ kotNo: null, order: o, items, used })
      }
    }
    return list.sort((a, b) => new Date(b.order.createdAt) - new Date(a.order.createdAt) || (b.kotNo || 0) - (a.kotNo || 0))
  }, [orders])

  const kotLabel = (kot) => kot.kotNo != null ? `KOT ${kot.kotNo}` : `Order #${kot.order.id.slice(0, 6).toUpperCase()}`

  const where = (o) => o.orderType === 'DINE_IN' ? `Table ${o.tableLabel}` : o.orderType === 'TAKEAWAY' ? 'Take Away' : 'Delivery'

  const kotOrder = (kot, opts) => printTicket({
    kotNo: kot.kotNo, createdAt: kot.order.createdAt, orderType: kot.order.orderType,
    tableLabel: kot.order.tableLabel, customerName: kot.order.customerName,
    items: kot.items,
  }, { title: 'KOT', showPrices: false, ...opts })

  const doPrint = (kot) => kotOrder(kot, { duplicate: true })

  const doCancel = async (kot) => {
    if (!confirm(`Cancel KOT ${kot.kotNo}? Its items will be removed.`)) return
    setBusy(true)
    try { await dineApi.updateOrderItems({ orderId: kot.order.id, removeIds: kot.items.map(i => i.id) }); toast.success(`KOT ${kot.kotNo} cancelled`); await refetch() }
    catch { toast.error('Failed to cancel') } finally { setBusy(false) }
  }

  const startModify = (kot) => { setEditKot(kot.kotNo); setDraft(kot.items.map(it => ({ id: it.id, quantity: it.quantity, it }))) }
  const dQty = (id, d) => setDraft(arr => arr.map(r => r.id === id ? { ...r, quantity: Math.max(1, r.quantity + d) } : r))
  const dRemove = (id) => setDraft(arr => arr.filter(r => r.id !== id))
  const saveModify = async (kot) => {
    setBusy(true)
    try {
      const keptIds = draft.map(r => r.id)
      const removeIds = kot.items.map(i => i.id).filter(id => !keptIds.includes(id))
      const updates = draft.filter(r => { const o = kot.items.find(i => i.id === r.id); return o && o.quantity !== r.quantity }).map(r => ({ id: r.id, quantity: r.quantity }))
      await dineApi.updateOrderItems({ orderId: kot.order.id, updates, removeIds })
      // reprint the modified KOT
      printTicket({
        kotNo: kot.kotNo, createdAt: kot.order.createdAt, orderType: kot.order.orderType, tableLabel: kot.order.tableLabel, customerName: kot.order.customerName,
        items: draft.map(r => ({ ...r.it, quantity: r.quantity })),
      }, { title: 'KOT', showPrices: false, modified: true })
      toast.success(`KOT ${kot.kotNo} modified`); setEditKot(null); await refetch()
    } catch { toast.error('Failed to modify') } finally { setBusy(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-16" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
          <div className="flex items-center gap-2"><Search size={16} className="text-stone-400" /><span className="font-semibold text-stone-900">Confirmed KOTs ({kots.length})</span></div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <div className="flex items-center gap-4 px-5 py-2 text-[11px] text-stone-400 border-b border-stone-100">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-stone-300" /> Open</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-stone-200 border border-stone-300" /> Used in bill</span>
        </div>
        <div className="overflow-y-auto p-3 space-y-2">
          {kots.length === 0 && <div className="text-center text-stone-400 text-sm py-10">No confirmed KOTs</div>}
          {kots.map(kot => (
            <div key={kot.order.id + '-' + (kot.kotNo ?? 'all')} className={`rounded-xl border p-3 ${kot.used ? 'bg-stone-100 border-stone-200' : 'bg-white border-stone-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-stone-800 text-sm">{kotLabel(kot)} <span className="font-normal text-stone-400">· {where(kot.order)}</span></div>
                  <div className="text-xs text-stone-400">{kot.items.reduce((s, i) => s + i.quantity, 0)} items · {formatIST(kot.order.createdAt, 'dd MMM, h:mm a')}{kot.used ? ' · Used in bill' : ''}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setViewKot(v => v === kot.kotNo ? null : kot.kotNo)} title="View" className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"><Eye size={15} /></button>
                  <button onClick={() => doPrint(kot)} title="Print" className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"><Printer size={15} /></button>
                  <button onClick={() => sendKotWhatsApp({ ...kot.order, items: kot.items }, kot.kotNo)} title="WhatsApp" className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-200 text-green-600 hover:bg-green-50"><MessageCircle size={15} /></button>
                  {!kot.used && (
                    <>
                      <button onClick={() => startModify(kot)} title="Modify" className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"><Pencil size={15} /></button>
                      <button disabled={busy} onClick={() => doCancel(kot)} title="Cancel" className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </div>

              {viewKot === kot.kotNo && editKot !== kot.kotNo && (
                <div className="mt-2 pt-2 border-t border-stone-100 space-y-1 text-sm">
                  {kot.items.map(it => (
                    <div key={it.id} className="flex justify-between text-stone-600">
                      <span>{nameOf(it)} × {it.quantity}{it.specialRequest ? <span className="text-amber-600 italic"> — {it.specialRequest}</span> : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {editKot === kot.kotNo && (
                <div className="mt-2 pt-2 border-t border-stone-100 space-y-2">
                  {draft.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1 truncate text-stone-700">{nameOf(r.it)}</span>
                      <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1">
                        <button onClick={() => dQty(r.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Minus size={13} /></button>
                        <span className="w-5 text-center">{r.quantity}</span>
                        <button onClick={() => dQty(r.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Plus size={13} /></button>
                      </div>
                      <button onClick={() => dRemove(r.id)} className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:text-red-500"><X size={14} /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditKot(null)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-sm">Cancel</button>
                    <button disabled={busy || draft.length === 0} onClick={() => saveModify(kot)} className="btn-primary py-1.5 px-3 rounded-lg text-sm">Save &amp; reprint</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-2 border-t border-stone-100 text-[11px] text-stone-400 text-center">Ctrl/⌘+K to toggle · Esc to close</div>
      </div>
    </div>
  )
}
