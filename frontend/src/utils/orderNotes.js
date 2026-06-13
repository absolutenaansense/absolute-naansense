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
    itemNotes: n.items || {},
  }
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
      return { type: o.type ?? null, address: o.address ?? null, items: o.items ?? {} }
    }
  } catch {
    // Legacy plain-text note — surface it as a generic order note.
    return { type: null, address: null, items: {}, text: notes }
  }
  return { type: null, address: null, items: {} }
}
