import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, User, ClipboardList, LogOut, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export default function CustomerLayout({ children, showBack = false, title }) {
  const { user, logout } = useAuthStore()
  const cartCount = useCartStore(s => s.getCount())
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="customer-theme min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40 safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 p-2">
                <ChevronLeft size={20} />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-9 w-9 rounded-full object-cover ring-1 ring-stone-200" />
              {!title && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-stone-900">Absolute</span>
                  <span className="font-semibold text-brand-500">Naansense</span>
                </span>
              )}
            </Link>
            {title && <span className="font-semibold text-stone-800">{title}</span>}
          </div>

          <div className="flex items-center gap-1">
            <Link to="/orders" className="btn-ghost">
              <ClipboardList size={18} />
              <span className="hidden sm:inline text-sm">Orders</span>
            </Link>
            <Link to="/profile" className="btn-ghost">
              <User size={18} />
              <span className="hidden sm:inline text-sm">{user?.name?.split(' ')[0]}</span>
            </Link>
            {location.pathname !== '/checkout' && (
              <Link to="/checkout" className="relative btn-ghost">
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto">
        {children}
      </main>
    </div>
  )
}
