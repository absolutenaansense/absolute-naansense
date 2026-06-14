import { Routes, Route, Navigate } from 'react-router-dom'
import AdminOrders from '../pages/admin/AdminOrders'
import AdminDineIn from '../pages/admin/AdminDineIn'
import AdminReservations from '../pages/admin/AdminReservations'
import KotManager from '../components/admin/KotManager'

// Operational billing app for one outlet: online orders, dine-in POS, reservations.
export default function BillerApp() {
  return (
    <>
      <KotManager />
      <Routes>
        <Route index element={<AdminOrders />} />
        <Route path="dine-in" element={<AdminDineIn />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </>
  )
}
