import { format as fnsFormat } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const IST = 'Asia/Kolkata'

export function formatIST(dateInput, formatStr) {
  let date
  if (typeof dateInput === 'string') {
    // DB timestamps are UTC but stored without a timezone marker. A naive
    // string would otherwise be parsed as local time, so treat it as UTC.
    const s = dateInput.trim()
    const hasTz = /(Z|[+-]\d\d:?\d\d)$/i.test(s)
    date = new Date(hasTz ? s : s.replace(' ', 'T') + 'Z')
  } else {
    date = dateInput
  }
  const zoned = toZonedTime(date, IST)
  return fnsFormat(zoned, formatStr)
}

export function todayIST() {
  return formatIST(new Date(), 'yyyy-MM-dd')
}

export function isTodayIST(dateInput) {
  return formatIST(dateInput, 'yyyy-MM-dd') === todayIST()
}
