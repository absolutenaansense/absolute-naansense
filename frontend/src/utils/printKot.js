import { formatIST } from './dateIST'
import { getOrderMeta, itemNote } from './orderNotes'
import { restaurantFor, CGST_RATE, SGST_RATE } from '../config/restaurant'

// KOT item ordering: Starters > Main Course > Accompaniments > Desserts >
// Beverages > Mocktails. Ranked by the item's category name (keyword based —
// tweak the keywords here if a category lands in the wrong group).
function kotRank(it) {
  const c = (it.menuItem?.category?.name || it.category || '').toLowerCase()
  if (c.includes('mocktail')) return 5
  if (c.includes('beverage') || c.includes('water') || c.includes('juice') || c.includes('lassi') || c.includes('shake') || c.includes('tea') || c.includes('coffee') || c.includes('soft drink')) return 4
  if (c.includes('dessert') || c.includes('sweet') || c.includes('ice cream')) return 3
  if (c.includes('rice') || c.includes('biryani') || c.includes('bread') || c.includes('roti') || c.includes('accompan') || c.includes('raita') || c.includes('papad')) return 2
  if (c.includes('main course') || c.includes('sizzler') || c.includes('curry') || c.includes('gravy')) return 1
  if (c.includes('starter') || c.includes('soup') || c.includes('tikka') || c.includes('kebab') || c.includes('appetiz')) return 0
  return 6
}
const nameOf = (it) => it.menuItem?.name || it.itemName || ''

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

  const sortedItems = [...items].sort((a, b) => kotRank(a) - kotRank(b))
  const rows = sortedItems.map(it => {
    const note = itemNote(order, it)
    return `<tr>
      <td class="it">${esc(nameOf(it))}${note ? `<div class="note">↳ ${esc(note)}</div>` : ''}</td>
      ${showPrices ? `<td class="pr">${(parseFloat(it.price) * it.quantity).toFixed(0)}</td>` : ''}
      <td class="qty">${it.quantity}</td>
    </tr>`
  }).join('')

  const heading = isDineIn ? `Table ${esc(meta.table || '')}` : (isTakeaway ? 'Take Away' : 'Delivery')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title} ${esc(ref)}</title>
  <style>
    @page { margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; color:#000; width: 76mm; margin:0 auto; font-size: 15px; font-weight: 600; }
    .c { text-align:center; }
    .name { font-size: 22px; font-weight: bold; letter-spacing: .5px; }
    .big { font-size: 18px; font-weight: bold; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display:flex; justify-content:space-between; }
    table { width:100%; border-collapse: collapse; }
    th, td { text-align:left; padding: 4px 0; vertical-align: top; }
    th.qty, td.qty { text-align:right; width: 34px; font-weight: bold; }
    th.pr, td.pr { text-align:right; width: 52px; }
    td.it { font-weight: bold; }
    .note { font-weight: normal; font-style: italic; font-size: 13px; padding-left: 6px; }
    .tot { margin-top: 4px; }
    .banner { text-align:center; font-size: 21px; font-weight: bold; letter-spacing: 2px; border: 2px solid #000; border-radius: 4px; padding: 3px 0; margin: 5px 0; }
  </style></head><body>
    <div class="c name">ABSOLUTE NAANSENSE</div>
    <div class="c">${esc(formatIST(order.createdAt || new Date().toISOString(), 'dd/MM/yy HH:mm'))}</div>
    <div class="c big">${title}${order.kotNo != null ? ` No. ${order.kotNo}` : ` — ${esc(ref)}`}</div>
    ${opts.running ? '<div class="banner">RUNNING KOT</div>' : ''}
    ${opts.duplicate ? '<div class="banner">DUPLICATE</div>' : ''}
    ${opts.modified ? '<div class="banner">MODIFIED</div>' : ''}
    <div class="c big">${esc(heading)}</div>
    <div class="hr"></div>
    ${order.user?.name && order.user.phone !== '0000000000' ? `<div>Customer: ${esc(order.user.name)}</div>` : ''}
    ${meta.name ? `<div>Name: ${esc(meta.name)}</div>` : ''}
    ${(meta.phone || (order.user?.phone && order.user.phone !== '0000000000')) ? `<div>Phone: ${esc(meta.phone || order.user.phone)}</div>` : ''}
    ${!isDineIn && meta.address ? `<div>Address: ${esc(meta.address)}</div>` : ''}
    ${isTakeaway && order.pickupAt ? `<div>Pickup: ${esc(formatIST(order.pickupAt, 'dd/MM HH:mm'))}</div>` : ''}
    ${meta.note ? `<div style="font-weight:bold">Note: ${esc(meta.note)}</div>` : ''}
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

  printHtml(html)
}

// Print the given HTML. Prefer a dedicated window so ONLY this document prints
// (a hidden iframe can make mobile browsers print the whole underlying page).
// Falls back to an iframe when a popup is blocked (e.g. admin auto-print with
// no user gesture).
function printHtml(html) {
  const w = window.open('', '_blank', 'width=400,height=640')
  if (w && w.document) {
    w.document.open(); w.document.write(html); w.document.close()
    w.focus()
    const go = () => { try { w.print() } catch (e) { console.error('Print failed', e) } }
    if (w.document.readyState === 'complete') setTimeout(go, 300)
    else w.onload = () => setTimeout(go, 300)
    return
  }
  // Fallback: hidden iframe (popup blocked / no user gesture)
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

// Full GST tax invoice (customer bill), matching the restaurant's printed format.
export function printBill(order) {
  const meta = getOrderMeta(order)
  const R = restaurantFor(meta.outlet)   // outlet-specific name/address/GSTIN/FSSAI
  const items = order.items || []
  const type = (meta.type || '').toUpperCase()
  const heading = type === 'DINE_IN' ? `Dine In: ${meta.table || ''}` : (type === 'TAKEAWAY' ? 'Take Away' : 'Delivery')
  // Online orders don't set customerName — fall back to the linked user.
  const custName = meta.name || order.user?.name || ''
  const custPhone = meta.phone || order.user?.phone || ''
  const displayedAt = formatIST(new Date().toISOString(), 'dd MMM yyyy, h:mm:ss a')

  const subtotal = items.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const comp = !!order.isComplimentary
  const discount = comp ? subtotal : Math.min(parseFloat(order.discount || 0), subtotal)
  const taxable = Math.max(0, subtotal - discount)
  const cgst = comp ? 0 : taxable * CGST_RATE
  const sgst = comp ? 0 : taxable * SGST_RATE
  const grand = comp ? 0 : (order.total != null ? parseFloat(order.total) : Math.round(taxable + cgst + sgst))
  const roundOff = grand - (taxable + cgst + sgst)
  const totalQty = items.reduce((s, it) => s + it.quantity, 0)

  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const money = (n) => n.toFixed(2)
  const paid = comp ? 'Complimentary'
    : (order.paymentMethod === 'SPLIT' && Array.isArray(order.payments))
      ? 'Split — ' + order.payments.map(p => `${p.method} ₹${Number(p.amount).toFixed(0)}`).join(', ')
      : (order.paymentMethod === 'QR_UPI' ? 'Other [UPI]' : 'Cash')

  const rows = items.map((it, i) => `<tr>
    <td>${i + 1}</td>
    <td class="it">${esc(nameOf(it))}</td>
    <td class="n">${it.quantity}</td>
    <td class="n">${money(parseFloat(it.price))}</td>
    <td class="n">${money(parseFloat(it.price) * it.quantity)}</td>
  </tr>`).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tax invoice ${order.billNo ?? ''}</title>
  <style>
    @page { margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; color:#000; width: 76mm; margin:0 auto; font-size: 14px; font-weight: 600; }
    .c { text-align:center; }
    .name { font-size: 21px; font-weight: bold; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display:flex; justify-content:space-between; }
    table { width:100%; border-collapse: collapse; }
    th, td { text-align:left; padding: 3px 0; vertical-align: top; }
    th.n, td.n { text-align:right; }
    td.it { word-break: break-word; }
    .grand { font-size: 19px; font-weight: bold; }
    .doctitle { font-size: 16px; font-weight: bold; letter-spacing: 1px; margin: 4px 0; }
  </style></head><body>
    <div class="c name">${esc(R.name)}</div>
    <div class="c">${esc(R.address)}</div>
    <div class="c">Mobile - ${esc(R.mobile)}</div>
    <div class="c">GSTIN No - ${esc(R.gstin)}</div>
    <div class="c">FSSAI Lic No - ${esc(R.fssai)}</div>
    <div class="hr"></div>
    <div class="c doctitle">TAX INVOICE</div>
    <div class="hr"></div>
    <div>Displayed on ${esc(displayedAt)} IST</div>
    <div>Name: ${esc(custName)}</div>
    ${custPhone ? `<div>Phone: ${esc(custPhone)}</div>` : ''}
    ${meta.address ? `<div>Address: ${esc(meta.address)}</div>` : ''}
    <div class="row"><span>Date: ${esc(formatIST(order.createdAt || new Date().toISOString(), 'dd/MM/yy HH:mm'))}</span><span>${esc(heading)}</span></div>
    <div class="row"><span>Cashier: ${esc(R.cashier)}</span><span>Bill No.: ${order.billNo ?? '-'}</span></div>
    <div class="hr"></div>
    <table>
      <thead><tr><th>No.</th><th>Item</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="hr"></div>
    <div class="row"><span>Total Qty: ${totalQty}</span><span>Sub Total&nbsp;&nbsp;${money(subtotal)}</span></div>
    ${discount > 0 ? `<div class="row"><span></span><span>Discount&nbsp;&nbsp;-${money(discount)}</span></div>` : ''}
    <div class="row"><span></span><span>CGST 2.5%&nbsp;&nbsp;${money(cgst)}</span></div>
    <div class="row"><span></span><span>SGST 2.5%&nbsp;&nbsp;${money(sgst)}</span></div>
    <div class="row"><span></span><span>Round off&nbsp;&nbsp;${roundOff >= 0 ? '+' : ''}${money(roundOff)}</span></div>
    <div class="hr"></div>
    <div class="row grand"><span>Grand Total</span><span>₹ ${grand.toFixed(2)}</span></div>
    <div class="hr"></div>
    <div>Paid via ${esc(paid)}</div>
    <div class="hr"></div>
    <div class="c">${esc(R.footer)}</div>
  </body></html>`

  printHtml(html)
}
