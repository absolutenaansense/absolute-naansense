import { formatIST } from './dateIST'

// IST calendar-date presets for report/operations timelines. Returns { from, to }
// as 'yyyy-MM-dd' IST date strings (inclusive), matching how the reports filter
// by istDay(createdAt).
export const TIMELINE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'custom', label: 'Custom' },
]

const istDay = (iso) => formatIST(iso, 'yyyy-MM-dd')
const istToday = () => istDay(new Date().toISOString())
const istShift = (days) => istDay(new Date(Date.now() + days * 86400000).toISOString())
const pad = (n) => String(n).padStart(2, '0')

export function rangeFor(preset, customFrom, customTo) {
  const today = istToday()
  const [y, m] = today.split('-').map(Number)
  switch (preset) {
    case 'today': return { from: today, to: today }
    case 'yesterday': { const yd = istShift(-1); return { from: yd, to: yd } }
    case 'last7': return { from: istShift(-6), to: today }
    case 'this_month': return { from: `${y}-${pad(m)}-01`, to: today }
    case 'last_month': {
      const lm = m === 1 ? 12 : m - 1
      const ly = m === 1 ? y - 1 : y
      const lastDay = new Date(Date.UTC(ly, lm, 0)).getUTCDate() // day 0 of next month = last day of lm
      return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${pad(lastDay)}` }
    }
    case 'custom': return { from: customFrom || today, to: customTo || today }
    default: return { from: today, to: today }
  }
}

// True if an order/log's createdAt (IST date) falls within [from, to] inclusive.
export const inRange = (iso, from, to) => { const d = istDay(iso); return d >= from && d <= to }
