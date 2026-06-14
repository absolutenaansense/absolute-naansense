// Staff panels (mounted at absolutenaansense.in/<key>). Each panel has a login
// gate that checks the account's role + outlet. Admin panels are monitoring +
// corrective actions (delete/modify bill, edit customer); biller panels are the
// operational billing app, isolated per outlet.
export const PANELS = {
  super_admin: { key: 'super_admin', kind: 'admin', role: 'super_admin', outlet: null, title: 'Super Admin', subtitle: 'All outlets' },
  renukoot_admin: { key: 'renukoot_admin', kind: 'admin', role: 'outlet_admin', outlet: 'renukoot', title: 'Renukoot Admin', subtitle: 'Renukoot outlet' },
  renusagar_admin: { key: 'renusagar_admin', kind: 'admin', role: 'outlet_admin', outlet: 'renusagar', title: 'Renusagar Admin', subtitle: 'Renusagar outlet' },
  renukoot_biller: { key: 'renukoot_biller', kind: 'biller', role: 'biller', outlet: 'renukoot', title: 'Renukoot Biller', subtitle: 'Renukoot billing' },
  renusagar_biller: { key: 'renusagar_biller', kind: 'biller', role: 'biller', outlet: 'renusagar', title: 'Renusagar Biller', subtitle: 'Renusagar billing' },
  renukoot_captain: { key: 'renukoot_captain', kind: 'captain', role: 'captain', outlet: 'renukoot', title: 'Renukoot Captain', subtitle: 'Renukoot table orders' },
  renusagar_captain: { key: 'renusagar_captain', kind: 'captain', role: 'captain', outlet: 'renusagar', title: 'Renusagar Captain', subtitle: 'Renusagar table orders' },
}

// Can this logged-in account access this panel?
//  - super_admin: any admin panel (their own /super_admin and the outlet admin panels)
//  - outlet_admin: only their outlet's admin panel
//  - biller: only their outlet's biller panel
export function accountCanAccess(account, panel) {
  if (!account || !panel) return false
  if (panel.kind === 'admin') {
    if (account.role === 'super_admin') return true
    if (account.role === 'outlet_admin') return account.outlet === panel.outlet
    return false
  }
  if (panel.kind === 'captain') return account.role === 'captain' && account.outlet === panel.outlet
  // biller panel
  return account.role === 'biller' && account.outlet === panel.outlet
}
