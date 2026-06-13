import { getOrderMeta, itemNote } from './orderNotes'
import { formatIST } from './dateIST'
import { RESTAURANT } from '../config/restaurant'

const nameOf = (it) => it.menuItem?.name || it.itemName || ''

// Plain-text KOT formatted for WhatsApp.
export function buildKotText(order, kotNo) {
  const meta = getOrderMeta(order)
  const type = (meta.type || '').toUpperCase()
  const heading = type === 'DINE_IN' ? `Dine-in${meta.table ? ` — Table ${meta.table}` : ''}` : type === 'TAKEAWAY' ? 'Take Away' : 'Delivery'
  const kn = kotNo ?? order.items?.[0]?.kotNo
  const lines = []
  lines.push(`*${RESTAURANT.name} — KOT${kn != null ? ` #${kn}` : ''}*`)
  lines.push(`${formatIST(order.createdAt || new Date().toISOString(), 'dd/MM/yy HH:mm')} · ${heading}`)
  if (meta.name) lines.push(`Name: ${meta.name}`)
  if (meta.phone) lines.push(`Phone: ${meta.phone}`)
  if (type !== 'DINE_IN' && meta.address) lines.push(`Address: ${meta.address}`)
  lines.push('--------------------')
  ;(order.items || []).forEach(it => {
    const n = itemNote(order, it)
    lines.push(`${it.quantity} x ${nameOf(it)}${n ? `  (${n})` : ''}`)
  })
  return lines.join('\n')
}

// Opens WhatsApp pre-filled with the KOT to the restaurant's KOT number.
export function sendKotWhatsApp(order, kotNo) {
  const text = buildKotText(order, kotNo)
  window.open(`https://wa.me/${RESTAURANT.kotWhatsApp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
