import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Minus, X, Printer, Receipt, Search, Trash2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { menuApi, dineApi } from '../../services/api'
import { parseOrderNotes } from '../../utils/orderNotes'
import { printTicket } from '../../utils/printKot'
import { FLOOR_SECTIONS, ALL_TABLES } from '../../config/floorLayout'

const GST_RATE = 0.05
const totals = (items) => {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * (i.quantity || 0), 0)
  const gst = Math.round(subtotal * GST_RATE)
  return { subtotal, gst, total: subtotal + gst }
}

export default function AdminDineIn() {
  const [activeLabel, setActiveLabel] = useState(null)
  const [pending, setPending] = useState({})   // { menuItemId: { item, quantity, note } }
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [search, setSearch] = useState('')
  const [settleOpen, setSettleOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data: menu } = useQuery({
    queryKey: ['dine-menu'],
    queryFn: () => menuApi.getMenu().then(r => r.data.categories),
  })
  const { data: openOrders = [], refetch } = useQuery({
    queryKey: ['dine-open'],
    queryFn: () => dineApi.openOrders().then(r => r.data),
    refetchInterval: 10000,
  })

  const ordersByTable = useMemo(() => {
    const m = {}
    openOrders.forEach(o => { const t = parseOrderNotes(o.notes).table; if (t) m[t] = o })
    return m
  }, [openOrders])

  const activeOrder = activeLabel ? ordersByTable[activeLabel] : null
  const activeMeta = ALL_TABLES.find(t => t.label === activeLabel)
  const committed = activeOrder?.items || []
  const committedTotals = totals(committed)
  const pendingArr = Object.values(pending)
  const pendingTotals = totals(pendingArr.map(p => ({ price: p.item.price, quantity: p.quantity })))

  const openTable = (label) => {
    setActiveLabel(label)
    setPending({})
    setSettleOpen(false)
    const ord = ordersByTable[label]
    const n = ord ? parseOrderNotes(ord.notes) : {}
    setCustName(n.name || '')
    setCustPhone(n.phone || '')
  }
  const closePanel = () => { setActiveLabel(null); setPending({}); setSettleOpen(false) }

  const addPending = (item) => setPending(p => ({
    ...p, [item.id]: { item, quantity: (p[item.id]?.quantity || 0) + 1, note: p[item.id]?.note || '' },
  }))
  const decPending = (id) => setPending(p => {
    const cur = p[id]; if (!cur) return p
    if (cur.quantity <= 1) { const n = { ...p }; delete n[id]; return n }
    return { ...p, [id]: { ...cur, quantity: cur.quantity - 1 } }
  })
  const setPendingNote = (id, note) => setPending(p => p[id] ? { ...p, [id]: { ...p[id], note } } : p)

  const sendKot = async () => {
    if (pendingArr.length === 0) { toast.error('Add items first'); return }
    setBusy(true)
    try {
      const items = pendingArr.map(p => ({ menuItemId: p.item.id, quantity: p.quantity, price: parseFloat(p.item.price), name: p.item.name }))
      const itemNotes = {}
      pendingArr.forEach(p => { if (p.note?.trim()) itemNotes[p.item.id] = p.note.trim() })

      let orderId = activeOrder?.id
      if (activeOrder) {
        await dineApi.addItems({ orderId, items, itemNotes })
      } else {
        const { data } = await dineApi.createTableOrder({
          table: activeLabel, section: activeMeta?.section, name: custName, phone: custPhone, items, itemNotes,
        })
        orderId = data.id
      }

      // Print kitchen ticket for just this round (no prices).
      printTicket({
        id: orderId,
        createdAt: new Date().toISOString(),
        notes: JSON.stringify({ type: 'DINE_IN', table: activeLabel, name: custName || null, items: itemNotes }),
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, price: i.price, menuItem: { name: i.name } })),
      }, { title: 'KOT', showPrices: false })

      toast.success('KOT sent to kitchen')
      setPending({})
      await refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send KOT')
    } finally { setBusy(false) }
  }

  const settle = async (paymentMethod) => {
    if (!activeOrder) return
    setBusy(true)
    try {
      await dineApi.settle({ orderId: activeOrder.id, paymentMethod })
      printTicket(activeOrder, { title: 'BILL', showPrices: true })
      toast.success(`Table ${activeLabel} settled`)
      closePanel()
      await refetch()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to settle')
    } finally { setBusy(false) }
  }

  const cancelTable = async () => {
    if (!activeOrder) { closePanel(); return }
    if (!confirm(`Cancel the running order on table ${activeLabel}?`)) return
    setBusy(true)
    try { await dineApi.cancel(activeOrder.id); toast.success('Order cancelled'); closePanel(); await refetch() }
    catch (e) { toast.error('Failed to cancel') }
    finally { setBusy(false) }
  }

  const filteredMenu = (menu || []).map(c => ({
    ...c,
    menuItems: c.menuItems.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())),
  })).filter(c => c.menuItems.length > 0)

  return (
    <AdminLayout title="Dine-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Floor</h2>
          <p className="text-sm text-stone-500">{openOrders.length} table{openOrders.length !== 1 ? 's' : ''} running</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-stone-300" /> Free</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Running</span>
        </div>
      </div>

      {FLOOR_SECTIONS.map(section => (
        <div key={section.name} className="mb-6">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{section.name}</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {section.tables.map(t => {
              const ord = ordersByTable[t.label]
              const running = !!ord
              const tot = ord ? parseFloat(ord.total) : 0
              return (
                <button
                  key={t.label}
                  onClick={() => openTable(t.label)}
                  className={`rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${
                    running ? 'bg-amber-50 border-amber-300' : 'bg-white border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="font-semibold text-stone-800">{t.label}</div>
                  <div className="text-[11px] text-stone-400">{t.seats} seats</div>
                  {running
                    ? <div className="text-xs font-semibold text-amber-700 mt-1">₹{tot.toFixed(0)}</div>
                    : <div className="text-[11px] text-stone-400 mt-1">Free</div>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Table panel */}
      {activeLabel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closePanel}>
          <div className="w-full max-w-md bg-stone-50 h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10">
              <div>
                <div className="font-semibold text-stone-900">Table {activeLabel}</div>
                <div className="text-xs text-stone-400">{activeMeta?.section} · {activeMeta?.seats} seats · {activeOrder ? 'Running' : 'Free'}</div>
              </div>
              <button onClick={closePanel} className="p-2 text-stone-400 hover:text-stone-700"><X size={20} /></button>
            </div>

            {settleOpen ? (
              /* Settle / bill view */
              <div className="p-4 space-y-4">
                <div className="card p-4">
                  <div className="text-sm font-semibold text-stone-800 mb-3">Bill — Table {activeLabel}</div>
                  <div className="space-y-1.5">
                    {committed.map(it => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span className="text-stone-700">{it.menuItem?.name} × {it.quantity}</span>
                        <span className="text-stone-900 font-medium">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-stone-100 mt-3 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>₹{committedTotals.subtotal.toFixed(0)}</span></div>
                    <div className="flex justify-between text-stone-500"><span>GST (5%)</span><span>₹{committedTotals.gst}</span></div>
                    <div className="flex justify-between font-semibold text-stone-900 pt-1"><span>Total</span><span>₹{committedTotals.total.toFixed(0)}</span></div>
                  </div>
                </div>
                <div className="text-xs text-stone-400 text-center">Choose how the customer paid — this prints the bill and frees the table.</div>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy} onClick={() => settle('CASH_ON_DELIVERY')} className="btn-primary justify-center py-3 rounded-xl">Cash</button>
                  <button disabled={busy} onClick={() => settle('QR_UPI')} className="btn-primary justify-center py-3 rounded-xl">UPI / Card</button>
                </div>
                <button onClick={() => setSettleOpen(false)} className="btn-ghost w-full justify-center text-stone-500">← Back to order</button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Optional customer info */}
                <div className="grid grid-cols-2 gap-2">
                  <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Name (optional)"
                    className="text-sm bg-white border border-stone-200 rounded-lg px-3 py-2" />
                  <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="Phone (optional)"
                    className="text-sm bg-white border border-stone-200 rounded-lg px-3 py-2" />
                </div>

                {/* Already ordered */}
                {committed.length > 0 && (
                  <div className="card p-4">
                    <div className="text-xs font-semibold text-stone-400 uppercase mb-2">Ordered</div>
                    <div className="space-y-1.5">
                      {committed.map(it => {
                        const note = parseOrderNotes(activeOrder.notes).items?.[it.menuItemId]
                        return (
                          <div key={it.id} className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-stone-700">{it.menuItem?.name} × {it.quantity}</span>
                              <span className="text-stone-900 font-medium">₹{(parseFloat(it.price) * it.quantity).toFixed(0)}</span>
                            </div>
                            {note && <div className="text-xs text-amber-600 italic pl-1">↳ {note}</div>}
                          </div>
                        )
                      })}
                    </div>
                    <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between text-sm font-semibold">
                      <span>Running total (incl. GST)</span><span>₹{committedTotals.total.toFixed(0)}</span>
                    </div>
                  </div>
                )}

                {/* Pending (to add) */}
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
                          <input value={note} onChange={e => setPendingNote(item.id, e.target.value)} placeholder="Special request (optional)"
                            className="w-full text-xs bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5" />
                        </div>
                      ))}
                    </div>
                    <button disabled={busy} onClick={sendKot} className="btn-primary w-full justify-center py-2.5 rounded-xl mt-3">
                      <Printer size={15} /> Send KOT (₹{pendingTotals.total.toFixed(0)})
                    </button>
                  </div>
                )}

                {/* Menu picker */}
                <div className="card p-4">
                  <div className="relative mb-3">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…"
                      className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-3 py-2" />
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {filteredMenu.map(cat => (
                      <div key={cat.id}>
                        <div className="text-[11px] font-semibold text-stone-400 uppercase mb-1">{cat.name}</div>
                        {cat.menuItems.map(item => (
                          <button key={item.id} onClick={() => addPending(item)}
                            className="w-full flex items-center justify-between py-2 border-b border-stone-50 hover:bg-stone-50 rounded px-1 text-left">
                            <span className="text-sm text-stone-700">{item.name}</span>
                            <span className="flex items-center gap-2 text-sm text-stone-500">₹{parseFloat(item.price).toFixed(0)}<Plus size={14} className="text-brand-500" /></span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex gap-2">
                  {activeOrder && (
                    <button onClick={() => setSettleOpen(true)} className="btn-primary flex-1 justify-center py-3 rounded-xl">
                      <Receipt size={16} /> Settle ₹{committedTotals.total.toFixed(0)}
                    </button>
                  )}
                  {activeOrder && (
                    <button onClick={() => printTicket(activeOrder, { title: 'KOT', showPrices: false })}
                      className="px-4 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"><Printer size={16} /></button>
                  )}
                  {activeOrder && (
                    <button onClick={cancelTable} className="px-4 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
