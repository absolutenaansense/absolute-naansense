import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Minus, Search, ChevronRight, MapPin } from 'lucide-react'
import { useNavigate, Navigate } from 'react-router-dom'
import { menuApi } from '../../services/api'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { formatIST } from '../../utils/dateIST'
import { getOutlet } from '../../config/outlets'
import { renusagarMenu } from '../../data/renusagarMenu'

function VegDot({ isVeg }) {
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0 ${isVeg ? 'border-green-600' : 'border-red-500'}`}>
      <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
    </span>
  )
}

function MenuItemCard({ item }) {
  const addItem = useCartStore(s => s.addItem)
  const removeItem = useCartStore(s => s.removeItem)
  const qty = useCartStore(s => s.getItemQuantity(item.id))

  return (
    <div className="flex items-start justify-between py-4 border-b border-stone-50 last:border-0">
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <VegDot isVeg={item.isVeg} />
          <span className="text-sm font-medium text-stone-800">{item.name}</span>
        </div>
        {item.description && (
          <p className="text-xs text-stone-400 ml-6 mb-1">{item.description}</p>
        )}
        <p className="text-sm font-semibold text-stone-900 ml-6">₹{item.price}</p>
      </div>

      <div className="flex-shrink-0">
        {qty === 0 ? (
          <button
            onClick={() => addItem(item)}
            className="bg-white border border-brand-200 text-brand-500 hover:bg-brand-50 hover:border-brand-400 font-semibold px-4 py-1.5 rounded-xl text-sm transition-all duration-150 flex items-center gap-1"
          >
            <Plus size={14} /> Add
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-brand-500 rounded-xl px-2 py-1">
            <button onClick={() => removeItem(item.id)} className="text-white p-0.5">
              <Minus size={14} />
            </button>
            <span className="text-white font-semibold text-sm min-w-[20px] text-center">{qty}</span>
            <button onClick={() => addItem(item)} className="text-white p-0.5">
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MenuPage() {
  const [search, setSearch] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const sectionRefs = useRef({})
  const goTo = (id) => { setActiveCat(id); sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const { user } = useAuthStore()
  const hourIST = parseInt(formatIST(new Date().toISOString(), 'H'), 10)
  const greeting = hourIST < 12 ? 'Good morning' : hourIST < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || '').trim().split(' ')[0]
  const cartCount = useCartStore(s => s.getCount())
  const cartTotal = useCartStore(s => s.getTotal())
  const outletId = useCartStore(s => s.outlet)
  const outlet = getOutlet(outletId)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['menu', outletId],
    enabled: !!outlet,
    queryFn: () => outlet?.source === 'static'
      ? Promise.resolve(renusagarMenu)
      : menuApi.getMenu().then(r => r.data),
  })

  // No outlet chosen yet → back to the picker.
  if (!outlet) return <Navigate to="/" replace />

  const filtered = data?.categories?.map(cat => ({
    ...cat,
    menuItems: cat.menuItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchVeg = !vegOnly || item.isVeg
      return matchSearch && matchVeg
    }),
  })).filter(cat => cat.menuItems.length > 0)

  return (
    <CustomerLayout>
      {/* Hero */}
      <div className="bg-brand-500 px-4 pt-5 pb-16">
        <div className="flex items-center gap-3 mb-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/60 shadow-sm" />
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/90 text-xs font-medium bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-colors">
            <MapPin size={12} /> {outlet.name} <span className="text-white/60">· Change</span>
          </button>
        </div>
        <h2 className="text-white text-xl font-semibold">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h2>
        <p className="text-white/70 text-sm mt-1">
          {user?.isReturning ? 'Welcome back! Your favourites are waiting.' : 'What would you like today?'}
        </p>
      </div>

      {/* Search + filter bar — overlaps hero */}
      <div className="px-4 -mt-8 mb-4">
        <div className="card p-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className="input pl-8 py-2 text-sm bg-stone-50 border-stone-100"
              placeholder="Search dishes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setVegOnly(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              vegOnly
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-stone-50 border-stone-200 text-stone-500'
            }`}
          >
            <span className={`w-3 h-3 rounded-full border-2 ${vegOnly ? 'bg-green-600 border-green-600' : 'border-stone-400'}`} />
            Veg only
          </button>
        </div>
      </div>

      {/* Category jump bar (sticky under the header) */}
      {filtered?.length > 0 && (
        <div className="sticky top-14 z-30 bg-stone-50/95 backdrop-blur border-b border-stone-100 px-4 py-2 mb-2">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {filtered.map(cat => (
              <button
                key={cat.id}
                onClick={() => goTo(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCat === cat.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-stone-600 border-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="px-4 pb-32">
        {isLoading ? (
          <div className="text-center py-16 text-stone-400 text-sm">Loading menu…</div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">No items match your search.</div>
        ) : (
          filtered?.map(cat => (
            <div key={cat.id} ref={el => (sectionRefs.current[cat.id] = el)} className="mb-6 scroll-mt-28">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{cat.name}</h3>
              <div className="card px-4">
                {cat.menuItems.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-transparent">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/checkout')}
              className="btn-primary w-full justify-between py-3.5 rounded-2xl shadow-lg shadow-brand-500/25"
            >
              <span className="bg-brand-600 text-white px-2.5 py-0.5 rounded-lg text-sm font-semibold">
                {cartCount}
              </span>
              <span className="font-semibold">Go to checkout</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold">₹{cartTotal.toFixed(0)}</span>
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
