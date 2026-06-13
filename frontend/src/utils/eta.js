// 1-hour ETA countdown from order confirmation. DB timestamps are UTC w/o 'Z'.
export function etaInfo(confirmedAt, now = Date.now()) {
  if (!confirmedAt) return null
  const iso = /[Z+]/.test(confirmedAt) ? confirmedAt : confirmedAt + 'Z'
  const end = Date.parse(iso) + 60 * 60 * 1000   // +1 hour
  const ms = end - now
  const overdue = ms <= 0
  const abs = Math.abs(ms)
  const mm = Math.floor(abs / 60000)
  const ss = Math.floor((abs % 60000) / 1000)
  return { overdue, label: `${overdue ? '-' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` }
}
