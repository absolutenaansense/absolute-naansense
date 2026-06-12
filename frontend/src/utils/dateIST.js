import { format as fnsFormat } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const IST = 'Asia/Kolkata'

export function formatIST(dateInput, formatStr) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const zoned = toZonedTime(date, IST)
  return fnsFormat(zoned, formatStr)
}

export function todayIST() {
  return formatIST(new Date(), 'yyyy-MM-dd')
}

export function isTodayIST(dateInput) {
  return formatIST(new Date(dateInput), 'yyyy-MM-dd') === todayIST()
}
