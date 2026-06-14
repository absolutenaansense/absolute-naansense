import { createContext, useContext } from 'react'

// Context describing the active staff panel + logged-in account, so shared admin
// pages can scope their data to the right outlet and adapt their capabilities.
const StaffContext = createContext(null)

export function StaffProvider({ panel, account, children }) {
  const value = {
    account,
    panel,
    panelKey: panel.key,
    basePath: `/${panel.key}`,
    kind: panel.kind,                          // 'admin' | 'biller'
    role: account?.role,
    // Fixed outlet for outlet_admin/biller; null for super_admin (use the dropdown).
    outlet: panel.outlet,
    isSuper: account?.role === 'super_admin',
    isOutletAdmin: account?.role === 'outlet_admin',
    isBiller: account?.role === 'biller',
    isAdmin: panel.kind === 'admin',
  }
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
}

export function useStaff() {
  return useContext(StaffContext)
}
