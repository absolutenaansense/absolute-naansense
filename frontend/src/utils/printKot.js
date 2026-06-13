import { formatIST } from './dateIST'
import { parseOrderNotes } from './orderNotes'

const GST_RATE = 0.05

// Builds a thermal-printer-friendly KOT and sends it to the browser's printer.
// Works with any printer the admin device has connected (incl. an 80mm/58mm
// thermal printer installed as the default Windows printer). Browsers show a
// print dialog by default; enable Chrome "kiosk printing" for silent printing.
export function printKot(order) {
  const notes = parseOrderNotes(order.notes)
  const items = order.items || []
  const subtotal = items.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const gst = Math.round(subtotal * GST_RATE)
  const total = parseFloat(order.total)
  const delivery = Math.max(0, Math.round(total - subtotal - gst))
  const isDelivery = (notes.type || '').toUpperCase() !== 'DINE_IN'

  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const ref = order.id?.substring(0, 8).toUpperCase()

  const rows = items.map(it => {
    const note = notes.items?.[it.menuItemId] || ''
    return `<tr>
      <td class="it">${esc(it.menuItem?.name || '')}${note ? `<div class="note">↳ ${esc(note)}</div>` : ''}</td>
      <td class="qty">${it.quantity}</td>
    </tr>`
  }).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>KOT ${esc(ref)}</title>
  <style>
    @page { margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; color:#000; width: 76mm; margin:0 auto; font-size: 12px; }
    .c { text-align:center; }
    .name { font-size: 17px; font-weight: bold; letter-spacing: .5px; }
    .big { font-size: 15px; font-weight: bold; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display:flex; justify-content:space-between; }
    table { width:100%; border-collapse: collapse; }
    th, td { text-align:left; padding: 3px 0; vertical-align: top; }
    th.qty, td.qty { text-align:right; width: 34px; }
    td.it { font-weight: bold; }
    .note { font-weight: normal; font-style: italic; font-size: 11px; padding-left: 6px; }
    .tot { margin-top: 4px; }
  </style></head><body>
    <div class="c name">ABSOLUTE NAANSENSE</div>
    <div class="c">${esc(formatIST(order.createdAt, 'dd/MM/yy HH:mm'))}</div>
    <div class="c big">KOT &mdash; ${esc(ref)}</div>
    <div class="c big">${isDelivery ? 'Delivery' : 'Dine-in'}</div>
    <div class="hr"></div>
    <div>Customer: ${esc(order.user?.name || '')}</div>
    <div>Phone: ${esc(order.user?.phone || '')}</div>
    ${isDelivery && notes.address ? `<div>Address: ${esc(notes.address)}</div>` : ''}
    <div class="hr"></div>
    <table>
      <thead><tr><th>Item</th><th class="qty">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="hr"></div>
    <div class="row tot"><span>Subtotal</span><span>Rs ${subtotal.toFixed(0)}</span></div>
    ${delivery > 0 ? `<div class="row"><span>Delivery</span><span>Rs ${delivery}</span></div>` : ''}
    <div class="row"><span>GST (5%)</span><span>Rs ${gst}</span></div>
    <div class="row big"><span>TOTAL</span><span>Rs ${total.toFixed(0)}</span></div>
    <div class="hr"></div>
    <div class="c">Payment: ${order.paymentMethod === 'QR_UPI' ? 'Prepaid / UPI' : 'Cash on delivery'}</div>
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow.focus()
  // Give the iframe a tick to lay out before printing.
  setTimeout(() => {
    try { iframe.contentWindow.print() } catch (e) { console.error('Print failed', e) }
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}
