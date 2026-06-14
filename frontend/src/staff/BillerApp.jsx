import { Routes, Route, Navigate } from 'react-router-dom'
import AdminOrders from '../pages/admin/AdminOrders'
import AdminDineIn from '../pages/admin/AdminDineIn'
import AdminReservations from '../pages/admin/AdminReservations'
import AdminReports from '../pages/admin/AdminReports'
import KotManager from '../components/admin/KotManager'
import SaleSummary from '../components/admin/SaleSummary'
import OrderAlerts from '../components/admin/OrderAlerts'

// Operational billing app for one outlet: online orders, dine-in POS, reservations,
// plus a read-only day-end sales report (scoped to this outlet).
export default function BillerApp() {
  return (
    <>
      <OrderAlerts />
      <KotManager />
      <SaleSummary />
      <Routes>
        <Route index element={<AdminOrders />} />
        <Route path="dine-in" element={<AdminDineIn />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </>
  )
}
