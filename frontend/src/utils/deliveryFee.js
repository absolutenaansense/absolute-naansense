// Delivery-fee rules (per outlet, address-keyword and time based). Centralised so
// checkout, order creation and invoices all agree. `subtotal` is the food value.
import { formatIST } from './dateIST'

const DEFAULT_FEE = 50          // standard delivery fee
const FREE_THRESHOLD = 501      // subtotal >= this -> free (default zones)
export const CONVENIENCE_FEE = 20  // flat fee added whenever delivery comes out free

const lc = (s) => (s || '').toLowerCase()
const hasAny = (addr, words) => { const a = lc(addr); return words.some(w => a.includes(w)) }

// Renukoot zones
const OUTER = ['turra', 'pipri', 'murli', 'cisf']                       // <₹1000 → ₹100, else ₹50
const LATE = ['vivekanand', 'archit', 'carbon', 'tci', 'johar house']   // ₹50, or ₹100 after 7pm (except Mon/Tue)

// Returns { deliveryFee, convenienceFee, label } for the order context.
export function computeDelivery({ outlet = 'renukoot', orderType = 'DELIVERY', address = '', subtotal = 0, isTestOrder = false, when } = {}) {
  if (orderType !== 'DELIVERY' || isTestOrder) {
    return { deliveryFee: 0, convenienceFee: 0, label: orderType !== 'DELIVERY' ? 'No delivery' : 'Test order' }
  }
  const a = lc(address)
  let fee, label

  if (outlet === 'renusagar') {
    if (a.includes('hindalco')) { fee = 0; label = 'Free delivery — Hindalco' }
    else { fee = subtotal < FREE_THRESHOLD ? DEFAULT_FEE : 0; label = fee ? 'Delivery' : 'Free delivery' }
  } else { // renukoot
    if (hasAny(a, OUTER)) {
      fee = subtotal < 1000 ? 100 : 50
      label = `Delivery — outer zone (${subtotal < 1000 ? 'under' : 'over'} ₹1000)`
    } else if (hasAny(a, LATE)) {
      const iso = (when || new Date()).toISOString()
      const hour = parseInt(formatIST(iso, 'H'), 10)     // 0–23 IST
      const dow = parseInt(formatIST(iso, 'i'), 10)      // 1=Mon … 7=Sun
      const lateSurcharge = hour >= 19 && dow !== 1 && dow !== 2   // after 7pm, not Mon/Tue
      fee = lateSurcharge ? 100 : 50
      label = lateSurcharge ? 'Delivery — after 7 PM' : 'Delivery'
    } else {
      fee = subtotal < FREE_THRESHOLD ? DEFAULT_FEE : 0
      label = fee ? 'Delivery' : 'Free delivery'
    }
  }

  const convenienceFee = fee === 0 ? CONVENIENCE_FEE : 0
  return { deliveryFee: fee, convenienceFee, label }
}
