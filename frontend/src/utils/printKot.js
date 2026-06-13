import { formatIST } from './dateIST'
import { getOrderMeta, itemNote } from './orderNotes'

const GST_RATE = 0.05

// Prints a thermal-printer-friendly ticket for an order.
//
// opts:
//   title     - 'KOT' (kitchen ticket, default) or 'BILL' (customer bill)
//   showPrices- show price/total columns (default: true for BILL, false for KOT)
//   items     - override the item list (e.g. only the items in this KOT round)
//
// Works with any printer the admin device has connected (incl. an 80mm/58mm
// thermal printer set as the default Windows printer). Browsers show a print
// dialog by default; enable Chrome "kiosk printing" for fully silent printing.
export function printTicket(order, opts = {}) {
  const title = opts.title || 'KOT'
  const showPrices = opts.showPrices ?? (title === 'BILL')
  const meta = getOrderMeta(order)
  const items = opts.items || order.items || []
  const type = (meta.type || '').toUpperCase()
  const isDineIn = type === 'DINE_IN'
  const isTakeaway = type === 'TAKEAWAY'

  const subtotal = items.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const gst = Math.round(subtotal * GST_RATE)
  const total = title === 'BILL' ? parseFloat(order.total) : subtotal + gst
  const delivery = Math.max(0, Math.round(total - subtotal - gst))

  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const ref = order.id?.substring(0, 8).toUpperCase()

  const rows = items.map(it => {
    const note = itemNote(order, it)
    return `<tr>
      <td class="it">${esc(it.menuItem?.name || '')}${note ? `<div class="note">↳ ${esc(note)}</div>` : ''}</td>
      ${showPrices ? `<td class="pr">${(parseFloat(it.price) * it.quantity).toFixed(0)}</td>` : ''}
      <td class="qty">${it.quantity}</td>
    </tr>`
  }).join('')

  const heading = isDineIn ? `Table ${esc(meta.table || '')}` : (isTakeaway ? 'Take Away' : 'Delivery')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title} ${esc(ref)}</title>
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
    th.qty, td.qty { text-align:right; width: 30px; }
    th.pr, td.pr { text-align:right; width: 48px; }
    td.it { font-weight: bold; }
    .note { font-weight: normal; font-style: italic; font-size: 11px; padding-left: 6px; }
    .tot { margin-top: 4px; }
  </style></head><body>
    <div class="c name">ABSOLUTE NAANSENSE</div>
    <div class="c">${esc(formatIST(order.createdAt || new Date().toISOString(), 'dd/MM/yy HH:mm'))}</div>
    <div class="c big">${title} &mdash; ${esc(ref)}</div>
    <div class="c big">${esc(heading)}</div>
    <div class="hr"></div>
    ${order.user?.name && order.user.phone !== '0000000000' ? `<div>Customer: ${esc(order.user.name)}</div>` : ''}
    ${meta.name ? `<div>Name: ${esc(meta.name)}</div>` : ''}
    ${order.user?.phone && order.user.phone !== '0000000000' ? `<div>Phone: ${esc(order.user.phone)}</div>` : ''}
    ${!isDineIn && !isTakeaway && meta.address ? `<div>Address: ${esc(meta.address)}</div>` : ''}
    <div class="hr"></div>
    <table>
      <thead><tr><th>Item</th>${showPrices ? '<th class="pr">Amt</th>' : ''}<th class="qty">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="hr"></div>
    ${showPrices ? `
      <div class="row tot"><span>Subtotal</span><span>Rs ${subtotal.toFixed(0)}</span></div>
      ${delivery > 0 ? `<div class="row"><span>Delivery</span><span>Rs ${delivery}</span></div>` : ''}
      <div class="row"><span>GST (5%)</span><span>Rs ${gst}</span></div>
      <div class="row big"><span>TOTAL</span><span>Rs ${total.toFixed(0)}</span></div>
      <div class="hr"></div>
      <div class="c">Payment: ${order.paymentMethod === 'QR_UPI' ? 'Prepaid / UPI' : 'Cash'}</div>
    ` : `<div class="c">${isDineIn ? 'DINE-IN — Kitchen copy' : (isTakeaway ? 'TAKE AWAY — Kitchen copy' : 'Kitchen copy')}</div>`}
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  iframe.contentWindow.focus()
  setTimeout(() => {
    try { iframe.contentWindow.print() } catch (e) { console.error('Print failed', e) }
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}

// Back-compat: delivery/online confirm prints a KOT with totals (existing behaviour).
export function printKot(order, opts = {}) {
  return printTicket(order, { title: 'KOT', showPrices: true, ...opts })
}
