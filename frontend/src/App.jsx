import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Customer pages
import LoginPage from './pages/customer/LoginPage'
import RegisterPage from './pages/customer/RegisterPage'
import ForgotPasswordPage from './pages/customer/ForgotPasswordPage'
import OutletSelectPage from './pages/customer/OutletSelectPage'
import MenuPage from './pages/customer/MenuPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrdersPage from './pages/customer/OrdersPage'
import ProfilePage from './pages/customer/ProfilePage'
import TermsPage from './pages/customer/TermsPage'
import PrivacyPage from './pages/customer/PrivacyPage'
import ContactPage from './pages/customer/ContactPage'
import RefundPage from './pages/customer/RefundPage'
import FloatingContact from './components/customer/FloatingContact'

// Staff panels (role-based)
import PanelGate from './staff/PanelGate'
import AdminMonitorApp from './staff/AdminMonitorApp'
import BillerApp from './staff/BillerApp'
import StaffLanding from './staff/StaffLanding'

function CustomerRoute({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

// Domain split: customers on absolutenaansense.com, staff/backend on
// absolutenaansense.in. On any other host (localhost, *.github.io preview) both
// are available so the single codebase can be developed/previewed.
const HOST = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase()
const IS_IN = HOST.endsWith('absolutenaansense.in')
const IS_COM = HOST.endsWith('absolutenaansense.com')
// Domain split now live: customers on .com, staff on .in.
//  .com → customer only   |   .in → staff only   |   other hosts → both (dev/preview)
const CUSTOMER_ENABLED = !IS_IN
const STAFF_ENABLED = !IS_COM

export default function App() {
  return (
    <>
    {CUSTOMER_ENABLED && <FloatingContact />}
    <Routes>
      {/* Customer routes — browsing is public; only orders/profile need login */}
      {CUSTOMER_ENABLED && (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/refund" element={<RefundPage />} />
          <Route path="/" element={<OutletSelectPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<CustomerRoute><OrdersPage /></CustomerRoute>} />
          <Route path="/profile" element={<CustomerRoute><ProfilePage /></CustomerRoute>} />
        </>
      )}

      {/* Staff panels — each has its own role/outlet-checked login */}
      {STAFF_ENABLED && (
        <>
          {/* On the staff-only host (.in), the root is the landing page. */}
          {!CUSTOMER_ENABLED && <Route path="/" element={<StaffLanding />} />}
          <Route path="/staff" element={<StaffLanding />} />
          <Route path="/super_admin/*" element={<PanelGate panelKey="super_admin"><AdminMonitorApp /></PanelGate>} />
          <Route path="/renukoot_admin/*" element={<PanelGate panelKey="renukoot_admin"><AdminMonitorApp /></PanelGate>} />
          <Route path="/renusagar_admin/*" element={<PanelGate panelKey="renusagar_admin"><AdminMonitorApp /></PanelGate>} />
          <Route path="/renukoot_biller/*" element={<PanelGate panelKey="renukoot_biller"><BillerApp /></PanelGate>} />
          <Route path="/renusagar_biller/*" element={<PanelGate panelKey="renusagar_biller"><BillerApp /></PanelGate>} />
          <Route path="/admin/*" element={<Navigate to="/super_admin" replace />} />
        </>
      )}

      {/* Anything else → the home for this domain (staff landing on .in, ordering on .com) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
