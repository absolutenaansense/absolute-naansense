import { Routes, Route, Navigate } from 'react-router-dom'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminReports from '../pages/admin/AdminReports'
import AdminCustomers from '../pages/admin/AdminCustomers'
import AdminStaff from '../pages/admin/AdminStaff'
import AdminMenu from '../pages/admin/AdminMenu'
import AdminSettings from '../pages/admin/AdminSettings'
import Operations from '../pages/admin/Operations'
import SaleSummary from '../components/admin/SaleSummary'

// Monitoring + corrective-action panel (super admin / outlet admin). Read-only on
// live operations, but can view reports, the operations log, and edit bills/customers.
export default function AdminMonitorApp() {
  return (
    <>
    <SaleSummary />
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="operations" element={<Operations />} />
      <Route path="customers" element={<AdminCustomers />} />
      <Route path="staff" element={<AdminStaff />} />
      <Route path="menu" element={<AdminMenu />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
    </>
  )
}
