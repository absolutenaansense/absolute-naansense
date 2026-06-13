import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Calendar, UtensilsCrossed,
  Settings, LogOut, Bell, Armchair, BarChart3, ExternalLink, Users, Menu, X
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import KotManager from './KotManager'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/dine-in', icon: Armchair, label: 'Dine-in' },
  { to: '/admin/reservations', icon: Calendar, label: 'Reservations' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({ children, title }) {
  const { adminLogout } = useAuthStore()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)

  const handleLogout = () => {
    adminLogout()
    navigate('/admin/login')
  }

  return (
    <div className="admin-theme min-h-screen">
      {/* Mobile overlay */}
      {navOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setNavOpen(false)} />}

      {/* Sidebar — persistent on desktop, slide-in drawer on mobile */}
      <aside className={`w-60 max-w-[80vw] bg-white border-r border-stone-100 flex flex-col fixed h-full z-50 transition-transform duration-200 md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-900">Absolute</div>
            <div className="text-sm font-semibold text-brand-500">Naansense</div>
            <div className="text-xs text-stone-400 mt-0.5">Admin panel</div>
          </div>
          <button onClick={() => setNavOpen(false)} className="md:hidden p-1.5 text-stone-400"><X size={20} /></button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <a
            href={import.meta.env.BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-all duration-150"
          >
            <ExternalLink size={17} />
            Online ordering
          </a>
        </nav>

        <div className="p-3 border-t border-stone-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800 w-full transition-all duration-150"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <KotManager />

      {/* Main content */}
      <div className="md:ml-60">
        <header className="bg-white border-b border-stone-100 h-14 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30">
          <button onClick={() => setNavOpen(true)} className="md:hidden p-1.5 -ml-1 text-stone-600"><Menu size={22} /></button>
          <h1 className="text-base font-semibold text-stone-800">{title}</h1>
        </header>
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
