import { RESTAURANT } from '../config/restaurant'

// Renders an order summary onto a canvas and returns a JPEG Blob.
// An image can't be edited like text, so the restaurant gets a tamper-proof copy.
export async function orderImageBlob(snap) {
  const W = 640, pad = 28, lh = 30
  const wrap = (ctx, text, maxW) => {
    const words = String(text).split(' ')
    const out = []; let line = ''
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w } else line = test
    }
    if (line) out.push(line)
    return out
  }

  // Measure pass to compute height
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = '15px Arial'
  let rows = 5 // title + 3 header lines + spacing
  const addrLines = snap.address ? wrap(measure, `Address: ${snap.address}`, W - pad * 2) : []
  rows += (snap.name ? 1 : 0) + (snap.phone ? 1 : 0) + addrLines.length + 3
  snap.items.forEach(it => { rows += 1 + (it.note ? 1 : 0) })
  rows += 6
  const H = pad * 2 + rows * lh

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'top'
  let y = pad
  const left = (t, f = '15px Arial') => { ctx.font = f; ctx.textAlign = 'left'; ctx.fillText(t, pad, y); y += lh }
  const center = (t, f) => { ctx.font = f; ctx.textAlign = 'center'; ctx.fillText(t, W / 2, y); y += lh }
  const row = (l, r, f = '15px Arial') => { ctx.font = f; ctx.textAlign = 'left'; ctx.fillText(l, pad, y); ctx.textAlign = 'right'; ctx.fillText(r, W - pad, y); y += lh }
  const hr = () => { ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(pad, y + 6); ctx.lineTo(W - pad, y + 6); ctx.stroke(); y += 16 }

  center(RESTAURANT.name, 'bold 26px Arial')
  center('ONLINE ORDER', 'bold 16px Arial')
  hr()
  left(`Order #${(snap.ref || '').slice(0, 8).toUpperCase()}`, 'bold 16px Arial')
  left(snap.dateStr)
  if (snap.name) left(`Name: ${snap.name}`)
  if (snap.phone) left(`Phone: ${snap.phone}`)
  addrLines.forEach(l => left(l))
  hr()
  left('Items', 'bold 16px Arial')
  snap.items.forEach(it => {
    row(`${it.quantity} x ${it.name}`, `Rs ${(it.price * it.quantity).toFixed(0)}`)
    if (it.note) left(`    - ${it.note}`, 'italic 13px Arial')
  })
  hr()
  row('Subtotal', `Rs ${snap.subtotal.toFixed(0)}`)
  if (snap.deliveryFee) row('Delivery', `Rs ${snap.deliveryFee}`)
  row('GST (5%)', `Rs ${snap.gst}`)
  row('TOTAL', `Rs ${snap.total.toFixed(0)}`, 'bold 19px Arial')
  hr()
  left('Payment: Cash on delivery', 'bold 15px Arial')

  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.95))
}

// Generate the JPEG and hand it to WhatsApp. Mobile: share sheet with the image
// (customer picks WhatsApp + the restaurant). Desktop: download image + open chat.
export async function shareOrderWhatsApp(snap) {
  const num = RESTAURANT.kotWhatsApp
  let blob
  try { blob = await orderImageBlob(snap) } catch { blob = null }

  if (blob && navigator.canShare) {
    const file = new File([blob], `order-${(snap.ref || '').slice(0, 8)}.jpg`, { type: 'image/jpeg' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'New order', text: `New order for ${RESTAURANT.name} — please confirm. (Send to +${num})` })
        return { shared: true }
      } catch (e) { if (e?.name === 'AbortError') return { aborted: true } }
    }
  }
  // Fallback: download the image, then open WhatsApp chat to the number with a note.
  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `order-${(snap.ref || '').slice(0, 8)}.jpg`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(`New order for ${RESTAURANT.name} (#${(snap.ref || '').slice(0, 8).toUpperCase()}). Attaching order image.`)}`, '_blank', 'noopener')
  return { fallback: true }
}
