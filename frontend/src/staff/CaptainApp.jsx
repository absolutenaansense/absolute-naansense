import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Minus, X, Search, Send, LogOut, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { menuApi, captainApi, dineApi } from '../services/api'
import { useStaff } from './StaffContext'
import { useAuthStore } from '../store/authStore'
import { floorFor } from '../config/floorLayout'

const GST_RATE = 0.05
const lineTotal = (p) => parseFloat(p.item.price) * p.quantity

// Captain dashboard: pick a table, build the order (with optional per-item special
// requests + mobile), and send it to the biller's queue for confirmation.
export default function CaptainApp() {
  const staff = useStaff()
  const outlet = staff?.outlet || 'renukoot'
  const sections = floorFor(outlet)
  const { adminLogout } = useAuthStore()

  const [table, setTable] = useState(null)
  const [pending, setPending] = useState({})   // { itemId: { item, quantity, note } }
  const [phone, setPhone] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [search, setSearch] = useState('')
  const [noteOpen, setNoteOpen] = useState({})
  const [busy, setBusy] = useState(false)

  const { data: menu } = useQuery({ queryKey: ['captain-menu', outlet], queryFn: () => menuApi.getMenu(outlet).then(r => r.data.categories) })
  const { data: openOrders = [] } = useQuery({ queryKey: ['captain-open', outlet], queryFn: () => dineApi.openOrders(outlet).then(r => r.data), refetchInterval: 15000 })
  const occupied = new Set(openOrders.map(o => o.tableLabel).filter(Boolean))

  const arr = Object.values(pending)
  const subtotal = arr.reduce((s, p) => s + lineTotal(p), 0)
  const gst = Math.round(subtotal * GST_RATE)
  const total = subtotal + gst

  const add = (item) => setPending(p => ({ ...p, [item.id]: { item, quantity: (p[item.id]?.quantity || 0) + 1, note: p[item.id]?.note || '' } }))
  const dec = (id) => setPending(p => { const c = p[id]; if (!c) return p; if (c.quantity <= 1) { const n = { ...p }; delete n[id]; return n } return { ...p, [id]: { ...c, quantity: c.quantity - 1 } } })
  const setNote = (id, note) => setPending(p => p[id] ? { ...p, [id]: { ...p[id], note } } : p)

  const reset = () => { setTable(null); setPending({}); setPhone(''); setOrderNote(''); setSearch(''); setNoteOpen({}) }

  const place = async () => {
    if (arr.length === 0) { toast.error('Add at least one item'); return }
    setBusy(true)
    try {
      const items = arr.map(p => ({ menuItemId: p.item.id, itemName: null, quantity: p.quantity, price: parseFloat(p.item.price), name: p.item.name, note: p.note?.trim() || null }))
      await captainApi.placeOrder({ outlet, table, items, phone: phone.trim() || null, note: orderNote.trim() || null, captain: staff?.account?.name || staff?.account?.email || null })
      toast.success(`Order sent to biller — Table ${table}`)
      reset()
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to send order') } finally { setBusy(false) }
  }

  const filteredMenu = (menu || []).map(c => ({ ...c, menuItems: c.menuItems.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.menuItems.length > 0)

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="" className="h-9 w-9 rounded-full object-cover" />
          <div>
            <div className="font-semibold text-stone-900 text-sm leading-tight">Captain</div>
            <div className="text-xs text-stone-400 capitalize">{outlet}</div>
          </div>
        </div>
        <button onClick={adminLogout} className="text-sm text-stone-500 flex items-center gap-1.5 hover:text-stone-800"><LogOut size={15} /> Sign out</button>
      </header>

      {!table ? (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-stone-900 mb-1">Select a table</h2>
          <p className="text-sm text-stone-400 mb-4">Tap a table to start an order.</p>
          {sections.map(section => (
            <div key={section.name} className="mb-5">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{section.name}</div>
              <div className="flex flex-wrap gap-3">
                {section.tables.map(t => (
                  <button key={t.label} onClick={() => setTable(t.label)}
                    className={`relative w-20 h-20 rounded-2xl border-2 flex items-center justify-center font-semibold transition-all active:scale-95 ${occupied.has(t.label) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-stone-200 text-stone-700 hover:border-brand-400'}`}>
                    {t.label}
                    {occupied.has(t.label) && <span className="absolute bottom-1 text-[9px] font-normal text-blue-500">running</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 p-4 max-w-5xl mx-auto">
          {/* Order being built */}
          <div className="space-y-3">
            <button onClick={reset} className="text-sm text-stone-500 flex items-center gap-1 hover:text-stone-800"><ArrowLeft size={15} /> Tables</button>
            <div className="card p-4">
              <div className="font-semibold text-stone-900 mb-2">Table {table}</div>
              {arr.length === 0 ? <div className="text-sm text-stone-400 py-4 text-center">Add items from the menu →</div> : (
                <div className="space-y-2.5">
                  {arr.map(({ item, quantity, note }) => (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-stone-700 flex-1 truncate">{item.name}</span>
                        <button onClick={() => setNoteOpen(o => ({ ...o, [item.id]: !o[item.id] }))} title="Special request"
                          className={`w-6 h-6 flex items-center justify-center rounded-md border text-xs ${(noteOpen[item.id] || note) ? 'border-brand-400 text-brand-500 bg-brand-50' : 'border-stone-200 text-stone-400'}`}>★</button>
                        <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1">
                          <button onClick={() => dec(item.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Minus size={13} /></button>
                          <span className="text-sm font-medium w-5 text-center">{quantity}</span>
                          <button onClick={() => add(item)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200"><Plus size={13} /></button>
                        </div>
                      </div>
                      {(noteOpen[item.id] || note) && (
                        <input autoFocus value={note} onChange={e => setNote(item.id, e.target.value)} placeholder="Special request (e.g. no onion, extra spicy)" className="w-full text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5" />
                      )}
                    </div>
                  ))}
                  <div className="border-t border-stone-100 pt-2 flex justify-between text-sm font-semibold"><span>Total (incl. GST)</span><span>₹{total.toFixed(0)}</span></div>
                </div>
              )}
            </div>
            <div className="card p-4 space-y-2">
              <input value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} placeholder="Customer mobile (optional)" className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2" />
              <input value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Order note (optional)" className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2" />
            </div>
            <button disabled={busy || arr.length === 0} onClick={place} className="btn-primary w-full justify-center py-3 rounded-xl"><Send size={16} /> Place order to biller</button>
          </div>

          {/* Menu */}
          <div className="card p-4">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-3 py-2" />
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {filteredMenu.map(cat => (
                <div key={cat.id}>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase mb-1">{cat.name}</div>
                  {cat.menuItems.map(item => (
                    <button key={item.id} onClick={() => add(item)} className="w-full flex items-center justify-between py-2 border-b border-stone-50 hover:bg-stone-50 rounded px-1 text-left">
                      <span className="text-sm text-stone-700">{item.name}</span>
                      <span className="flex items-center gap-2 text-sm text-stone-500">₹{parseFloat(item.price).toFixed(0)}<Plus size={14} className="text-brand-500" /></span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
