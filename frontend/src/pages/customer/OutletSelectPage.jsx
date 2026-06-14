import { useNavigate } from 'react-router-dom'
import { MapPin, ChevronRight, ClipboardList, User } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { OUTLETS } from '../../config/outlets'

// Public landing page — pick an outlet before browsing the menu. No login needed.
export default function OutletSelectPage() {
  const navigate = useNavigate()
  const setOutlet = useCartStore(s => s.setOutlet)
  const { user } = useAuthStore()

  const choose = (id) => {
    setOutlet(id)   // clears the cart if the outlet changed
    navigate('/menu')
  }

  return (
    <div className="customer-theme min-h-screen">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40 safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-9 w-9 rounded-full object-cover ring-1 ring-stone-200" />
            <span className="flex items-center gap-1">
              <span className="font-semibold text-stone-900">Absolute</span>
              <span className="font-semibold text-brand-500">Naansense</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <button onClick={() => navigate('/orders')} className="btn-ghost"><ClipboardList size={18} /></button>
                <button onClick={() => navigate('/profile')} className="btn-ghost"><User size={18} /></button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="btn-ghost text-sm text-brand-600 font-medium">Sign in</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-7">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-24 w-24 rounded-full object-cover mx-auto mb-3 ring-1 ring-stone-200 shadow-sm" />
          <h1 className="text-2xl font-semibold text-stone-900">Choose your outlet</h1>
          <p className="text-sm text-stone-500 mt-1">Browse the menu and add to cart — sign in only at checkout.</p>
        </div>

        <div className="space-y-3">
          {OUTLETS.map(o => (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              className="w-full card p-5 flex items-center gap-4 text-left hover:border-brand-300 hover:shadow transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={22} className="text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-900">{o.name}</div>
                <div className="text-xs text-stone-500 truncate">{o.tagline}</div>
              </div>
              <ChevronRight size={20} className="text-stone-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
