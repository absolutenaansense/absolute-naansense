// Because the live DB schema has no per-item note / address / order-type columns
// (and we can't run DDL with the anon key), we pack that structured data into the
// existing Order.notes TEXT field as JSON, and parse it back out for display/KOT.
//
// Shape: { type, address, items: { [menuItemId]: "special request" } }

export function buildOrderNotes({ type, address, itemNotes }) {
  const items = {}
  Object.entries(itemNotes || {}).forEach(([id, note]) => {
    const t = (note || '').trim()
    if (t) items[id] = t
  })
  return JSON.stringify({ type: type || null, address: address || null, items })
}

// Customer order notes: the whole-order special request text + the outlet the
// order was placed for. Stored as JSON in Order.notes.
export function buildCustomerNotes({ text, outlet, deliveryFee, convenienceFee, deliveryLabel }) {
  const t = (text || '').trim()
  return JSON.stringify({
    text: t || null, outlet: outlet || null,
    deliveryFee: deliveryFee ?? null, convenienceFee: convenienceFee ?? null, deliveryLabel: deliveryLabel || null,
  })
}

// Normalized order metadata, preferring real columns and falling back to the
// legacy notes JSON for older rows. Use this everywhere instead of reading
// columns or notes directly.
export function getOrderMeta(order) {
  const n = parseOrderNotes(order?.notes)
  return {
    type: order?.orderType || n.type || (order?.tableLabel || n.table ? 'DINE_IN' : 'DELIVERY'),
    table: order?.tableLabel || n.table || null,
    address: order?.deliveryAddress || n.address || null,
    name: order?.customerName || n.name || null,
    phone: order?.customerPhone || n.phone || null,
    note: n.text || null,   // whole-order special request (plain-text notes)
    cancelRemark: n.cancelRemark || null,   // admin's reason when an order is cancelled
    outlet: n.outlet || null,   // 'renukoot' | 'renusagar'
    deliveryFee: n.deliveryFee ?? null,
    convenienceFee: n.convenienceFee ?? null,
    deliveryLabel: n.deliveryLabel || null,
    itemNotes: n.items || {},
  }
}

// Merge an admin cancellation remark into the existing notes blob without
// disturbing the order metadata it already carries.
export function withCancelRemark(notes, remark) {
  const r = (remark || '').trim()
  let obj
  try { obj = notes ? JSON.parse(notes) : {} } catch { obj = { text: notes } }
  if (!obj || typeof obj !== 'object') obj = {}
  obj.cancelRemark = r || null
  return JSON.stringify(obj)
}

// Reconstruct an order's money breakdown for invoices. Prefers the stored
// delivery/convenience split (newer orders); older orders fall back to lumping
// whatever is left after subtotal+GST into the delivery line.
export function orderFees(order) {
  const meta = getOrderMeta(order)
  const subtotal = (order?.items || []).reduce((s, it) => s + parseFloat(it.price) * (it.quantity || 0), 0)
  const total = parseFloat(order?.total) || 0
  const gst = Math.round(subtotal * 0.05)
  const combined = Math.max(0, Math.round(total - subtotal - gst))
  if (meta.deliveryFee != null || meta.convenienceFee != null) {
    return { subtotal, gst, delivery: meta.deliveryFee || 0, convenience: meta.convenienceFee || 0, label: meta.deliveryLabel, total }
  }
  return { subtotal, gst, delivery: combined, convenience: 0, label: null, total }
}

// Per-item special request: prefer the OrderItem column, fall back to notes JSON.
export function itemNote(order, item) {
  return item?.specialRequest || getOrderMeta(order).itemNotes?.[item?.menuItemId] || ''
}

export function parseOrderNotes(notes) {
  if (!notes) return { type: null, address: null, items: {} }
  try {
    const o = JSON.parse(notes)
    if (o && typeof o === 'object') {
      return { type: o.type ?? null, address: o.address ?? null, items: o.items ?? {}, text: o.text ?? null, cancelRemark: o.cancelRemark ?? null, outlet: o.outlet ?? null, deliveryFee: o.deliveryFee ?? null, convenienceFee: o.convenienceFee ?? null, deliveryLabel: o.deliveryLabel ?? null }
    }
  } catch {
    // Legacy plain-text note — surface it as a generic order note.
    return { type: null, address: null, items: {}, text: notes }
  }
  return { type: null, address: null, items: {} }
}
