import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Customer pages
import LoginPage from './pages/customer/LoginPage'
import RegisterPage from './pages/customer/RegisterPage'
import MenuPage from './pages/customer/MenuPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrdersPage from './pages/customer/OrdersPage'
import ProfilePage from './pages/customer/ProfilePage'
import TermsPage from './pages/customer/TermsPage'
import PrivacyPage from './pages/customer/PrivacyPage'

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminDineIn from './pages/admin/AdminDineIn'
import AdminReservations from './pages/admin/AdminReservations'
import AdminReports from './pages/admin/AdminReports'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminMenu from './pages/admin/AdminMenu'
import AdminSettings from './pages/admin/AdminSettings'

function CustomerRoute({ children }) {
  const { user } = useAuthStore()
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { admin } = useAuthStore()
  return admin ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Customer routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/" element={<CustomerRoute><MenuPage /></CustomerRoute>} />
      <Route path="/checkout" element={<CustomerRoute><CheckoutPage /></CustomerRoute>} />
      <Route path="/orders" element={<CustomerRoute><OrdersPage /></CustomerRoute>} />
      <Route path="/profile" element={<CustomerRoute><ProfilePage /></CustomerRoute>} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
      <Route path="/admin/dine-in" element={<AdminRoute><AdminDineIn /></AdminRoute>} />
      <Route path="/admin/reservations" element={<AdminRoute><AdminReservations /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
      <Route path="/admin/menu" element={<AdminRoute><AdminMenu /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
