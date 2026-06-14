import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { PANELS, accountCanAccess } from './panels'
import { StaffProvider } from './StaffContext'
import StaffLoginPage from './StaffLoginPage'

// Guards a staff panel: shows its branded login until an account with the right
// role + outlet is signed in, then provides the staff context to the app.
export default function PanelGate({ panelKey, children }) {
  const panel = PANELS[panelKey]
  const { admin } = useAuthStore()
  if (!panel) return <Navigate to="/" replace />
  if (!accountCanAccess(admin, panel)) return <StaffLoginPage panel={panel} />
  return <StaffProvider panel={panel} account={admin}>{children}</StaffProvider>
}
