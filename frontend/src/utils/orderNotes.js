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
