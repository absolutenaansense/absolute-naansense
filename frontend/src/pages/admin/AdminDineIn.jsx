import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Minus, X, Printer, Receipt, Search, Trash2, Clock, Pause, Play, ShoppingBag, Pencil, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { menuApi, dineApi } from '../../services/api'
import { getOrderMeta } from '../../utils/orderNotes'
import { formatIST } from '../../utils/dateIST'
import { printTicket, printBill as printBillTicket } from '../../utils/printKot'
import { FLOOR_SECTIONS, ALL_TABLES } from '../../config/floorLayout'

const GST_RATE = 0.05
const totals = (items) => {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * (i.quantity || 0), 0)
  const gst = Math.round(subtotal * GST_RATE)
  return { subtotal, gst, total: subtotal + gst }
}
// Minutes since the order was opened (DB timestamps are UTC without a 'Z').
const elapsedMin = (createdAt) => {
  if (!createdAt) return 0
  const iso = /[Z+]/.test(createdAt) ? createdAt : createdAt + 'Z'
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000))
}
const stateOf = (order) => {
  if (!order) return 'blank'
  if (order.paymentStatus === 'paid') return 'paid'
  if (order.billPrinted) return 'printed'
  return 'running'
}
const TILE = {
  blank: 'bg-white border-stone-200 hover:border-stone-400',
  running: 'bg-blue-50 border-blue-300',
  printed: 'bg-green-50 border-green-300',
  paid: 'bg-amber-50 border-amber-300',
}
const LEGEND = [
  ['blank', 'Free', 'bg-white border-stone-300'],
  ['running', 'Running', 'bg-blue-100 border-blue-300'],
  ['printed', 'Printed', 'bg-green-100 border-green-300'],
  ['paid', 'Paid', 'bg-amber-100 border-amber-300'],
]

export default function AdminDineIn() {
  const [ctx, setCtx] = useState(null)          // null | { type:'DINE_IN', label } | { type:'TAKEAWAY' }
  const [pending, setPending] = useState({})    // { menuItemId: { item, quantity, note } }
  const [custName, setCustName] = useState('')
  const [search, setSearch] = useState('')
  const [settleOpen, setSettleOpen] = useState(false)
  const [recentOpen, setRecentOpen] = useState(false)
  const [editDraft, setEditDraft] = useState(null)  // null = closed; else [{id,name,quantity,price}]
  const [moveOpen, setMoveOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data: menu } = useQuery({ queryKey: ['dine-menu'], queryFn: () => menuApi.getMenu().then(r => r.data.categories) })
  const { data: openOrders = [], refetch } = useQuery({
    queryKey: ['dine-open'], queryFn: () => dineApi.openOrders().then(r => r.data), refetchInterval: 10000,
  })
  const { data: recent = [], refetch: refetchRecent } = useQuery({
    queryKey: ['dine-recent'], queryFn: () => dineApi.recent().then(r => r.data), enabled: recentOpen, refetchInterval: recentOpen ? 15000 : false,
  })

  const ordersByTable = useMemo(() => {
    const m = {}
    openOrders.forEach(o => { if (o.tableLabel) m[o.tableLabel] = o })
    return m
  }, [openOrders])

  const isDineIn = ctx?.type === 'DINE_IN'
  const isTakeaway = ctx?.type === 'TAKEAWAY'
  const activeOrder = isDineIn ? ordersByTable[ctx.label] : null
  const activeMeta = isDineIn ? ALL_TABLES.find(t => t.label === ctx.label) : null
  const state = stateOf(activeOrder)
  const committed = activeOrder?.items || []
  const committedTotals = totals(committed)
  const pendingArr = Object.values(pending)
  const pendingTotals = totals(pendingArr.map(p => ({ price: p.item.price, quantity: p.quantity })))

  const open = (next) => {
    setCtx(next); setPending({}); setSettleOpen(false); setSearch('')
    const ord = next.type === 'DINE_IN' ? ordersByTable[next.label] : null
    setCustName(ord ? (getOrderMeta(ord).name || '') : '')
  }
  const close = () => { setCtx(null); setPending({}); setSettleOpen(false) }

  const addPending = (item) => setPending(p => ({ ...p, [item.id]: { item, quantity: (p[item.id]?.quantity || 0) + 1, note: p[item.id]?.note || '' } }))
  const decPending = (id) => setPending(p => { const c = p[id]; if (!c) return p; if (c.quantity <= 1) { const n = { ...p }; delete n[id]; return n } return { ...p, [id]: { ...c, quantity: c.quantity - 1 } } })
  const setNote = (id, note) => setPending(p => p[id] ? { ...p, [id]: { ...p[id], note } } : p)

  const pendingItems = () => pendingArr.map(p => ({ menuItemId: p.item.id, quantity: p.quantity, price: parseFloat(p.item.price), name: p.item.name, note: p.note?.trim() || null }))
  const printRoundKot = (orderId, items, type, label) => printTicket({
    id: orderId, createdAt: new Date().toISOString(), orderType: type, tableLabel: label || null, customerName: custName || null,
    items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, price: i.price, specialRequest: i.note, menuItem: { name: i.name } })),
  }, { title: 'KOT', showPrices: false })

  const sendKot = async () => {
    if (pendingArr.length === 0) { toast.error('Add items first'); return }
    setBusy(true)
    try {
      const items = pendingItems()
      let orderId = activeOrder?.id
      if (activeOrder) await dineApi.addItems({ orderId, items })
      else { const { data } = await dineApi.createPosOrder({ orderType: 'DINE_IN', table: ctx.label, name: custName, items }); orderId = data.id }
      printRoundKot(orderId, items, 'DINE_IN', ctx.label)
      toast.success('KOT sent to kitchen')
      setPending({}); await refetch()
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to send KOT') } finally { setBusy(false) }
  }

  const printBill = async () => {
    if (!activeOrder) return
    setBusy(true)
    try { const { data } = await dineApi.markBillPrinted(activeOrder.id); printBillTicket(data); toast.success('Bill printed'); await refetch() }
    catch (e) { toast.error('Failed to print bill') } finally { setBusy(false) }
  }

  const settle = async (paymentMethod) => {
    if (!activeOrder) return
    setBusy(true)
    try { const { data } = await dineApi.settle({ orderId: activeOrder.id, paymentMethod }); printBillTicket(data); toast.success(`Table ${ctx.label} paid`); setSettleOpen(false); await refetch() }
    catch (e) { toast.error('Failed to settle') } finally { setBusy(false) }
  }

  const clearTable = async () => {
    if (!activeOrder) { close(); return }
    setBusy(true)
    try { await dineApi.clearTable(activeOrder.id); toast.success(`Table ${ctx.label} cleared`); close(); await refetch() }
    catch (e) { toast.error('Failed to clear') } finally { setBusy(false) }
  }

  const toggleHold = async () => {
    if (!activeOrder) return
    setBusy(true)
    try { await dineApi.setHold(activeOrder.id, !activeOrder.isHeld); toast.success(activeOrder.isHeld ? 'Resumed' : 'On hold'); await refetch() }
    catch (e) { toast.error('Failed') } finally { setBusy(false) }
  }

  const cancelOrder = async () => {
    if (!activeOrder) { close(); return }
    if (!confirm(`Cancel order on table ${ctx.label}?`)) return
    setBusy(true)
    try { await dineApi.cancel(activeOrder.id); toast.success('Cancelled'); close(); await refetch() }
    catch (e) { toast.error('Failed') } finally { setBusy(false) }
  }

  // Check Items: edit a running order's committed items.
  const openEdit = () => setEditDraft(committed.map(it => ({ id: it.id, name: it.menuItem?.name || '', quantity: it.quantity, price: it.price })))
  const editQty = (id, d) => setEditDraft(arr => arr.map(r => r.id === id ? { ...r, quantity: Math.max(1, r.quantity + d) } : r))
  const editRemove = (id) => setEditDraft(arr => arr.filter(r => r.id !== id))
  const saveEdit = async () => {
    if (!activeOrder || !editDraft) return
    setBusy(true)
    try {
      const keptIds = editDraft.map(r => r.id)
      const removeIds = committed.map(i => i.id).filter(id => !keptIds.includes(id))
      const updates = editDraft
        .filter(r => { const o = committed.find(i => i.id === r.id); return o && o.quantity !== r.quantity })
        .map(r => ({ id: r.id, quantity: r.quantity }))
      await dineApi.updateOrderItems({ orderId: activeOrder.id, updates, removeIds })
      toast.success('Order updated'); setEditDraft(null); await refetch()
    } catch (e) { toast.error('Failed to update') } finally { setBusy(false) }
  }

  // Move the running order to another (free) table.
  const doMove = async (toLabel) => {
    if (!activeOrder) return
    setBusy(true)
    try { await dineApi.moveOrder({ orderId: activeOrder.id, tableLabel: toLabel }); toast.success(`Moved to ${toLabel}`); setMoveOpen(false); setCtx({ type: 'DINE_IN', label: toLabel }); await refetch() }
    catch (e) { toast.error('Failed to move') } finally { setBusy(false) }
  }

  // Take-away: one-shot counter sale (create -> pay -> close), prints KOT + bill.
  const takeawayCheckout = async (paymentMethod) => {
    if (pendingArr.length === 0) { toast.error('Add items first'); return }
    setBusy(true)
    try {
      const items = pendingItems()
      const { data: order } = await dineApi.createPosOrder({ orderType: 'TAKEAWAY', name: custName, items })
      const { data: settled } = await dineApi.settle({ orderId: order.id, paymentMethod })
      await dineApi.clearTable(order.id)
      printRoundKot(order.id, items, 'TAKEAWAY', null)
      printBillTicket(settled)
      toast.success('Take-away order done')
      close(); refetchRecent()
    } catch (e) { toast.error(e.response?.data?.error || 'Failed') } finally { setBusy(false) }
  }

  const filteredMenu = (menu || []).map(c => ({ ...c, menuItems: c.menuItems.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.menuItems.length > 0)

  return (
    <AdminLayout title="Dine-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Floor</h2>
          <p className="text-sm text-stone-500">{openOrders.length} table{openOrders.length !== 1 ? 's' : ''} running</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-stone-500 mr-2">
            {LEGEND.map(([k, label, cls]) => (
              <span key={k} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded border ${cls}`} /> {label}</span>
            ))}
          </div>
          <button onClick={() => open({ type: 'TAKEAWAY' })} className="btn-primary py-2 px-3 rounded-xl text-sm"><ShoppingBag size={15} /> Take Away</button>
          <button onClick={() => setRecentOpen(true)} className="btn-ghost text-stone-500 text-sm border border-stone-200 rounded-xl px-3 py-2"><Clock size={15} /> Recent</button>
        </div>
      </div>

      {FLOOR_SECTIONS.map(section => (
        <div key={section.name} className="mb-6">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{section.name}</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {section.tables.map(t => {
              const ord = ordersByTable[t.label]
              const st = stateOf(ord)
              return (
                <button key={t.label} onClick={() => open({ type: 'DINE_IN', label: t.label })}
                  className={`relative rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${TILE[st]}`}>
                  {ord?.isHeld && <span className="absolute top-1.5 right-1.5 text-[9px] bg-stone-800 text-white px-1 rounded">HOLD</span>}
                  <div className="font-semibold text-stone-800">{t.label}</div>
                  {ord ? (
                    <div className="mt-1">
                      <div className="text-xs font-semibold text-stone-700">₹{parseFloat(ord.total).toFixed(0)}</div>
                      <div className="text-[10px] text-stone-500 flex items-center gap-0.5"><Clock size={9} /> {elapsedMin(ord.createdAt)}m</div>
                    </div>
                  ) : <div className="text-[11px] text-stone-400 mt-1">Free</div>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Recent panel */}
      {recentOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setRecentOpen(false)}>
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-stone-900">Recent orders</span>
              <button onClick={() => setRecentOpen(false)} className="p-2 text-stone-400 hover:text-stone-700"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-2">
              {recent.length === 0 && <div className="text-center text-stone-400 text-sm py-10">No recent orders</div>}
              {recent.map(o => {
                const m = getOrderMeta(o)
                const where = m.type === 'DINE_IN' ? `Table ${m.table}` : m.type === 'TAKEAWAY' ? 'Take Away' : 'Delivery'
                return (
                  <div key={o.id} className="border border-stone-100 rounded-xl p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-800">{where}</span>
                      <span className="font-semibold">₹{parseFloat(o.total).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-400 mt-0.5">
                      <span>{(o.items || []).reduce((s, i) => s + i.quantity, 0)} items · {o.paymentStatus === 'paid' ? 'Paid' : o.status}</span>
                      <span>{formatIST(o.createdAt, 'h:mm a')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Order panel */}
      {ctx && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={close}>
          <div className="w-full max-w-md bg-stone-50 h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10">
              <div>
                <div className="font-semibold text-stone-900">{isDineIn ? `Table ${ctx.label}` : 'Take Away'}</div>
                <div className="text-xs text-stone-400">
                  {isDineIn ? `${activeMeta?.section} · ` : ''}
                  {isDineIn ? (activeOrder ? `${state.charAt(0).toUpperCase() + state.slice(1)} · ${elapsedMin(activeOrder.createdAt)}m` : 'Free') : 'Counter sale'}
                </div>
              </div>
              <button onClick={close} className="p-2 text-stone-400 hover:text-stone-700"><X size={20} /></button>
            </div>

            {settleOpen && activeOrder ? (
              <div className="p-4 space-y-4">
                <Bill items={committed} t={committedTotals} label={ctx.label} order={activeOrder} />
                <div className="text-xs text-stone-400 text-center">Mark how the customer paid.</div>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy} onClick={() => settle('CASH_ON_DELIVERY')} className="btn-primary justify-center py-3 rounded-xl">Cash</button>
                  <button disabled={busy} onClick={() => settle('QR_UPI')} className="btn-primary justify-center py-3 rounded-xl">UPI / Card</button>
                </div>
                <button onClick={() => setSettleOpen(false)} className="btn-ghost w-full justify-center text-stone-500">← Back</button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Customer name (optional)"
                  className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2" />

                {/* Paid state: just clear */}
                {isDineIn && state === 'paid' && (
                  <div className="card p-4 text-center space-y-3">
                    <div className="text-green-600 font-semibold">Paid ₹{committedTotals.total.toFixed(0)}</div>
                    <div className="flex gap-2">
                      <button onClick={() => printBillTicket(activeOrder)} className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm"><Printer size={15} className="inline" /> Reprint bill</button>
                      <button disabled={busy} onClick={clearTable} className="flex-1 btn-primary justify-center py-2.5 rounded-xl">Clear table</button>
                    </div>
                  </div>
                )}

                {/* Committed items */}
                {committed.length > 0 && state !== 'paid' && (
                  <div className="card p-4">
                    <div className="text-xs font-semibold text-stone-400 uppercase mb-2">Ordered</div>
                    <div className="space-y-1.5">
                      {committed.map(it => (
                        <div key={it.id} className="text-sm">
                          <div className="flex justify-between"><span className="text-stone-700">{it.menuItem?.name} × {it.quantity}</span><span className="font-medium">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span></div>
                          {it.specialRequest && <div className="text-xs text-amber-600 italic pl-1">↳ {it.specialRequest}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between text-sm font-semibold"><span>Running total (incl. GST)</span><span>₹{committedTotals.total.toFixed(0)}</span></div>
                  </div>
                )}

                {/* Pending round */}
                {pendingArr.length > 0 && (
                  <div className="card p-4 border-2 border-brand-200">
                    <div className="text-xs font-semibold text-brand-500 uppercase mb-2">New KOT round</div>
                    <div className="space-y-2.5">
                      {pendingArr.map(({ item, quantity, note }) => (
                        <div key={item.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-stone-700 flex-1 truncate">{item.name}</span>
                            <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1">
                              <button onClick={() => decPending(item.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Minus size={13} /></button>
                              <span className="text-sm font-medium w-5 text-center">{quantity}</span>
                              <button onClick={() => addPending(item)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Plus size={13} /></button>
                            </div>
                          </div>
                          <input value={note} onChange={e => setNote(item.id, e.target.value)} placeholder="Special request (optional)" className="w-full text-xs bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5" />
                        </div>
                      ))}
                    </div>
                    {isDineIn
                      ? <button disabled={busy} onClick={sendKot} className="btn-primary w-full justify-center py-2.5 rounded-xl mt-3"><Printer size={15} /> Send KOT (₹{pendingTotals.total.toFixed(0)})</button>
                      : null}
                  </div>
                )}

                {/* Menu picker (hidden in paid state) */}
                {state !== 'paid' && (
                  <div className="card p-4">
                    <div className="relative mb-3">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-3 py-2" />
                    </div>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {filteredMenu.map(cat => (
                        <div key={cat.id}>
                          <div className="text-[11px] font-semibold text-stone-400 uppercase mb-1">{cat.name}</div>
                          {cat.menuItems.map(item => (
                            <button key={item.id} onClick={() => addPending(item)} className="w-full flex items-center justify-between py-2 border-b border-stone-50 hover:bg-stone-50 rounded px-1 text-left">
                              <span className="text-sm text-stone-700">{item.name}</span>
                              <span className="flex items-center gap-2 text-sm text-stone-500">₹{parseFloat(item.price).toFixed(0)}<Plus size={14} className="text-brand-500" /></span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                {isTakeaway && (
                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={busy} onClick={() => takeawayCheckout('CASH_ON_DELIVERY')} className="btn-primary justify-center py-3 rounded-xl">Cash &amp; Print</button>
                    <button disabled={busy} onClick={() => takeawayCheckout('QR_UPI')} className="btn-primary justify-center py-3 rounded-xl">UPI &amp; Print</button>
                  </div>
                )}
                {isDineIn && activeOrder && state !== 'paid' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={busy} onClick={printBill} className="px-4 py-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-sm font-medium"><Receipt size={15} className="inline" /> Print bill</button>
                      <button disabled={busy} onClick={() => setSettleOpen(true)} className="btn-primary justify-center py-3 rounded-xl">Settle ₹{committedTotals.total.toFixed(0)}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={busy || committed.length === 0} onClick={openEdit} className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm"><Pencil size={14} className="inline" /> Edit items</button>
                      <button disabled={busy} onClick={() => setMoveOpen(true)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm"><ArrowRightLeft size={14} className="inline" /> Move table</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={busy} onClick={toggleHold} className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm">{activeOrder.isHeld ? <><Play size={14} className="inline" /> Resume</> : <><Pause size={14} className="inline" /> Hold</>}</button>
                      <button disabled={busy} onClick={cancelOrder} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm"><Trash2 size={14} className="inline" /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Check Items (edit running order) */}
      {editDraft && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setEditDraft(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
              <span className="font-semibold text-stone-900">Check Items{isDineIn ? ` — Table ${ctx.label}` : ''}</span>
              <button onClick={() => setEditDraft(null)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
              {editDraft.length === 0 && <div className="text-sm text-stone-400 text-center py-6">No items left</div>}
              {editDraft.map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <button onClick={() => editRemove(r.id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200"><X size={15} /></button>
                  <span className="flex-1 text-sm text-stone-700">{r.name}</span>
                  <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1">
                    <button onClick={() => editQty(r.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-200"><Minus size={14} /></button>
                    <span className="text-sm font-medium w-6 text-center">{r.quantity}</span>
                    <button onClick={() => editQty(r.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-200"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-stone-100">
              <button onClick={() => setEditDraft(null)} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm">Cancel</button>
              <button onClick={printBill} className="px-4 py-2 rounded-xl bg-stone-800 text-white text-sm">Print</button>
              <button disabled={busy} onClick={saveEdit} className="btn-primary px-5 py-2 rounded-xl">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Move KOT/Items to another table */}
      {moveOpen && activeOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setMoveOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
              <span className="font-semibold text-stone-900">Move Table {ctx.label} →</span>
              <button onClick={() => setMoveOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="text-xs text-stone-400">Pick a free table to move this order to.</div>
              {FLOOR_SECTIONS.map(section => {
                const free = section.tables.filter(t => t.label !== ctx.label && !ordersByTable[t.label])
                if (!free.length) return null
                return (
                  <div key={section.name}>
                    <div className="text-[11px] font-semibold text-stone-400 uppercase mb-1.5">{section.name}</div>
                    <div className="grid grid-cols-4 gap-2">
                      {free.map(t => (
                        <button key={t.label} disabled={busy} onClick={() => doMove(t.label)} className="rounded-lg border border-stone-200 py-2 text-sm hover:border-brand-400 hover:bg-brand-50">{t.label}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function Bill({ items, t, label }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-stone-800 mb-3">Bill — Table {label}</div>
      <div className="space-y-1.5">
        {items.map(it => (
          <div key={it.id} className="flex justify-between text-sm"><span className="text-stone-700">{it.menuItem?.name} × {it.quantity}</span><span className="font-medium">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span></div>
        ))}
      </div>
      <div className="border-t border-stone-100 mt-3 pt-3 space-y-1 text-sm">
        <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>₹{t.subtotal.toFixed(0)}</span></div>
        <div className="flex justify-between text-stone-500"><span>GST (5%)</span><span>₹{t.gst}</span></div>
        <div className="flex justify-between font-semibold text-stone-900 pt-1"><span>Total</span><span>₹{t.total.toFixed(0)}</span></div>
      </div>
    </div>
  )
}
