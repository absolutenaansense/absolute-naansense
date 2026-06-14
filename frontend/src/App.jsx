import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Customer pages
import LoginPage from './pages/customer/LoginPage'
import RegisterPage from './pages/customer/RegisterPage'
import OutletSelectPage from './pages/customer/OutletSelectPage'
import MenuPage from './pages/customer/MenuPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrdersPage from './pages/customer/OrdersPage'
import ProfilePage from './pages/customer/ProfilePage'
import TermsPage from './pages/customer/TermsPage'
import PrivacyPage from './pages/customer/PrivacyPage'

// Staff panels (role-based)
import PanelGate from './staff/PanelGate'
import AdminMonitorApp from './staff/AdminMonitorApp'
import BillerApp from './staff/BillerApp'

function CustomerRoute({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export default function App() {
  return (
    <Routes>
      {/* Customer routes — browsing is public; only orders/profile need login */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/" element={<OutletSelectPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<CustomerRoute><OrdersPage /></CustomerRoute>} />
      <Route path="/profile" element={<CustomerRoute><ProfilePage /></CustomerRoute>} />

      {/* Staff panels — each has its own role/outlet-checked login */}
      <Route path="/super_admin/*" element={<PanelGate panelKey="super_admin"><AdminMonitorApp /></PanelGate>} />
      <Route path="/renukoot_admin/*" element={<PanelGate panelKey="renukoot_admin"><AdminMonitorApp /></PanelGate>} />
      <Route path="/renusagar_admin/*" element={<PanelGate panelKey="renusagar_admin"><AdminMonitorApp /></PanelGate>} />
      <Route path="/renukoot_biller/*" element={<PanelGate panelKey="renukoot_biller"><BillerApp /></PanelGate>} />
      <Route path="/renusagar_biller/*" element={<PanelGate panelKey="renusagar_biller"><BillerApp /></PanelGate>} />

      {/* Legacy admin path → super admin */}
      <Route path="/admin/*" element={<Navigate to="/super_admin" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
