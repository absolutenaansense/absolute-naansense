import { supabase } from './supabase'
import bcrypt from 'bcryptjs'
import { withCancelRemark } from '../utils/orderNotes'
import { useAuthStore } from '../store/authStore'

// Who is performing the action (the signed-in staff account), for the audit log.
const actorEmail = () => { try { return useAuthStore.getState().admin?.email || null } catch { return null } }

// Append an operations-log entry for an order action (best-effort).
async function logOp(orderId, action, detail) {
  try {
    const { data: o } = await supabase.from('Order').select('outlet, billNo').eq('id', orderId).single()
    await opsApi.log({ outlet: o?.outlet, orderId, billNo: o?.billNo ?? null, kotNo: detail?.kotNo ?? null, action, detail, actor: actorEmail() })
  } catch { /* ignore */ }
}

// --- Auth ---
export const authApi = {
  register: async ({ name, phone, email, password }) => {
    // Check if phone already exists
    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('phone', phone)
      .single()
    if (existing) throw { response: { data: { error: 'Phone number already registered' } } }

    const passwordHash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('User')
      .insert([{ name, phone, email: email || null, passwordHash, isVerified: true }])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { user: data, token: btoa(JSON.stringify({ id: data.id, phone: data.phone })) } }
  },

  login: async ({ phone, password }) => {
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('phone', phone)
      .single()
    if (error || !user) throw { response: { data: { error: 'Invalid phone or password' } } }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw { response: { data: { error: 'Invalid phone or password' } } }

    const token = btoa(JSON.stringify({ id: user.id, phone: user.phone }))
    return { data: { user, token } }
  },

  adminLogin: async ({ email, password }) => {
    const { data: admin, error } = await supabase
      .from('Admin')
      .select('*')
      .eq('email', email)
      .single()
    if (error || !admin) throw { response: { data: { error: 'Invalid credentials' } } }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) throw { response: { data: { error: 'Invalid credentials' } } }

    const token = btoa(JSON.stringify({ id: admin.id, email: admin.email, isAdmin: true }))
    return { data: { admin, token } }
  },

  me: async (userId) => {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  // Change password for a logged-in customer (verify current password first).
  changePassword: async ({ userId, currentPassword, newPassword }) => {
    const { data: user, error } = await supabase.from('User').select('passwordHash').eq('id', userId).single()
    if (error || !user) throw { response: { data: { error: 'User not found' } } }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) throw { response: { data: { error: 'Current password is incorrect' } } }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    const { error: uErr } = await supabase.from('User').update({ passwordHash, updatedAt: new Date().toISOString() }).eq('id', userId)
    if (uErr) throw { response: { data: { error: uErr.message } } }
    return { data: { success: true } }
  },

  // Forgot password: verify identity by registered phone + email, then set a new
  // password. (No SMS/email OTP infra, so phone+email match is the check.)
  resetPassword: async ({ phone, email, newPassword }) => {
    const { data: user } = await supabase.from('User').select('id, email').eq('phone', phone).maybeSingle()
    if (!user) throw { response: { data: { error: 'No account found with that mobile number' } } }
    if (!user.email) throw { response: { data: { error: 'This account has no email on file — please contact us to reset.' } } }
    if (user.email.trim().toLowerCase() !== (email || '').trim().toLowerCase()) {
      throw { response: { data: { error: 'Email does not match our records for this number.' } } }
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    const { error: uErr } = await supabase.from('User').update({ passwordHash, updatedAt: new Date().toISOString() }).eq('id', user.id)
    if (uErr) throw { response: { data: { error: uErr.message } } }
    return { data: { success: true } }
  },

  // Change password for a logged-in staff/admin account.
  adminChangePassword: async ({ adminId, currentPassword, newPassword }) => {
    const { data: admin, error } = await supabase.from('Admin').select('passwordHash').eq('id', adminId).single()
    if (error || !admin) throw { response: { data: { error: 'Account not found' } } }
    const ok = await bcrypt.compare(currentPassword, admin.passwordHash)
    if (!ok) throw { response: { data: { error: 'Current password is incorrect' } } }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    const { error: uErr } = await supabase.from('Admin').update({ passwordHash, updatedAt: new Date().toISOString() }).eq('id', adminId)
    if (uErr) throw { response: { data: { error: uErr.message } } }
    return { data: { success: true } }
  },

  // DPDP Act 2023 — right to erasure. Removes the customer's personal data.
  // Saved addresses are deleted outright. The User record is hard-deleted when
  // possible; if past orders (retained for tax/legal compliance) block the
  // delete, the record is anonymised so no personal data remains.
  deleteAccount: async (userId) => {
    await supabase.from('Address').delete().eq('userId', userId)
    const { error } = await supabase.from('User').delete().eq('id', userId)
    if (error) {
      const stamp = Date.now().toString(36)
      const { error: anonErr } = await supabase
        .from('User')
        .update({
          name: 'Deleted account',
          email: null,
          phone: `deleted-${String(userId).slice(0, 8)}-${stamp}`,
          passwordHash: 'account-deleted',
          isVerified: false,
        })
        .eq('id', userId)
      if (anonErr) throw { response: { data: { error: anonErr.message } } }
    }
    return { data: { success: true } }
  },
}

// --- Menu ---
export const menuApi = {
  getMenu: async () => {
    const { data: categories, error: catError } = await supabase
      .from('Category')
      .select('id, name, sortOrder, menuItems:MenuItem(id, name, description, price, isVeg, isAvailable)')
      .eq('isActive', true)
      .order('sortOrder')
    if (catError) throw { response: { data: { error: catError.message } } }
    const filtered = categories
      .map(cat => ({ ...cat, menuItems: (cat.menuItems || []).filter(i => i.isAvailable) }))
      .filter(cat => cat.menuItems.length > 0)
    return { data: { categories: filtered } }
  },

  getAllItems: async () => {
    const { data, error } = await supabase
      .from('MenuItem')
      .select('*, category:Category(id, name)')
      .order('name')
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  getCategories: async () => {
    const { data, error } = await supabase
      .from('Category')
      .select('*')
      .eq('isActive', true)
      .order('sortOrder')
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  addItem: async (item) => {
    const { data, error } = await supabase
      .from('MenuItem')
      .insert([item])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  updateItem: async (id, item) => {
    const { data, error } = await supabase
      .from('MenuItem')
      .update({ ...item, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  toggleItem: async (id) => {
    const { data: item } = await supabase.from('MenuItem').select('isAvailable').eq('id', id).single()
    const { data, error } = await supabase
      .from('MenuItem')
      .update({ isAvailable: !item.isAvailable, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },
}

// --- Orders ---
export const ordersApi = {
  paymentReceived: async (orderId) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ status: 'payment_received', paymentStatus: 'paid', updatedAt: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  createOrder: async ({ userId, items, paymentMethod, total, orderType, deliveryAddress, customerName, pickupAt, notes, outlet }) => {
    const out = outlet || 'renukoot'
    // COD orders need no payment step, so they go straight to the admin
    // "Awaiting confirm" queue (payment_received). UPI orders wait at
    // 'pending' until the customer marks payment as made.
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert([{
        userId, paymentMethod, total,
        outlet: out,
        orderType: orderType || 'DELIVERY',
        deliveryAddress: deliveryAddress || null,
        customerName: customerName || null,
        pickupAt: pickupAt || null,
        notes: notes || null,
        status: paymentMethod === 'QR_UPI' ? 'pending' : 'payment_received',
        paymentStatus: 'pending',
      }])
      .select()
      .single()
    if (orderError) throw { response: { data: { error: orderError.message } } }

    // Assign a per-outlet daily KOT number so the auto-printed KOT is numbered.
    const { data: kotNo } = await supabase.rpc('next_kot_no', { p_outlet: out })
    const orderItems = items.map(item => ({
      orderId: order.id,
      menuItemId: item.menuItemId ?? null,
      itemName: item.itemName ?? null,   // set for external (static-menu) items
      quantity: item.quantity,
      price: item.price,
      specialRequest: item.note || null,
      kotNo,
    }))
    const { error: itemsError } = await supabase.from('OrderItem').insert(orderItems)
    if (itemsError) throw { response: { data: { error: itemsError.message } } }

    return { data: order }
  },

  myOrders: async (userId) => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*, menuItem:MenuItem(name, price)), user:User(name, phone)')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  getOrder: async (id) => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*, menuItem:MenuItem(name, price, category:Category(name))), user:User(name, phone)')
      .eq('id', id)
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  allOrders: async () => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*, menuItem:MenuItem(name, category:Category(name))), user:User(name, phone)')
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  confirmOrder: async (id) => {
    // Assign a sequential (per-outlet, per-financial-year) bill number if not set.
    const { data: cur } = await supabase.from('Order').select('billNo, outlet').eq('id', id).single()
    let billNo = cur?.billNo
    if (!billNo) { const { data: bn } = await supabase.rpc('next_bill_no', { p_outlet: cur?.outlet || 'renukoot' }); billNo = bn }
    const { data, error } = await supabase
      .from('Order')
      .update({ status: 'confirmed', paymentStatus: 'paid', billNo, confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    // Mark user as returning customer
    if (data?.userId) {
      await supabase.from('User').update({ isReturning: true }).eq('id', data.userId)
    }
    return { data }
  },

  cancelOrder: async (id, remark) => {
    const update = { status: 'cancelled', updatedAt: new Date().toISOString() }
    // Persist the admin's cancellation remark inside the notes blob.
    if (remark && remark.trim()) {
      const { data: cur } = await supabase.from('Order').select('notes').eq('id', id).single()
      update.notes = withCancelRemark(cur?.notes, remark)
    }
    const { data, error } = await supabase
      .from('Order')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    await logOp(id, 'order_cancel', { remark: remark || null })
    return { data }
  },

  updateStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },
}

// --- Reservations ---
export const reservationsApi = {
  create: async (data) => {
    const { data: res, error } = await supabase
      .from('Reservation')
      .insert([data])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data: res }
  },

  getTables: async () => {
    const { data, error } = await supabase
      .from('Table')
      .select('*')
      .eq('isActive', true)
      .order('number')
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  all: async () => {
    const { data, error } = await supabase
      .from('Reservation')
      .select('*')
      .order('date', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { reservations: data || [] } }
  },

  cancel: async (id) => {
    const { data, error } = await supabase
      .from('Reservation')
      .update({ status: 'CANCELLED', updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('Reservation')
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },
}

// --- Customers ---
export const customersApi = {
  list: async () => {
    const { data, error } = await supabase
      .from('User')
      .select('id, name, phone, email, isReturning, createdAt, orders:Order(count)')
      .neq('phone', '0000000000')   // exclude the walk-in sentinel
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  // Admin edit of a customer's contact details.
  update: async (id, { name, phone, email }) => {
    const { data, error } = await supabase
      .from('User')
      .update({ name, phone, email: email || null, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },
}

// --- Reports ---
export const reportsApi = {
  // Orders for the report views (last ~120 days), with item counts/amounts.
  forReports: async () => {
    const since = new Date(Date.now() - 120 * 86400000).toISOString()
    const { data, error } = await supabase
      .from('Order')
      .select('id, billNo, outlet, orderType, tableLabel, customerName, customerPhone, deliveryAddress, paymentMethod, paymentStatus, status, total, discount, isComplimentary, payments, confirmedAt, createdAt, notes, user:User(name, phone), items:OrderItem(id, quantity, price, itemName, specialRequest, menuItem:MenuItem(name))')
      .gte('createdAt', since)
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  byBillNo: async (n) => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, user:User(name, phone), items:OrderItem(id, quantity, price, menuItemId, specialRequest, itemName, menuItem:MenuItem(name))')
      .eq('billNo', n)
      .maybeSingle()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },
}

// --- Admin ---
export const adminApi = {
  dashboard: async () => {
    const [orders, users, reservations] = await Promise.all([
      supabase.from('Order').select('id, total, status, createdAt').order('createdAt', { ascending: false }).limit(10),
      supabase.from('User').select('id', { count: 'exact' }),
      supabase.from('Reservation').select('id, date, status').gte('date', new Date().toISOString().split('T')[0]).limit(5),
    ])
    return {
      data: {
        recentOrders: orders.data || [],
        totalUsers: users.count || 0,
        upcomingReservations: reservations.data || [],
      }
    }
  },
}

// --- Addresses (added separately to User profile) ---
export const addressApi = {
  addAddress: async ({ userId, label, line1, line2, city, pincode }) => {
    const { data, error } = await supabase
      .from('Address')
      .insert([{ userId, label, line1, line2: line2 || null, city, pincode }])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  getAddresses: async (userId) => {
    const { data, error } = await supabase
      .from('Address')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  deleteAddress: async (id) => {
    const { error } = await supabase
      .from('Address')
      .delete()
      .eq('id', id)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { success: true } }
  },

  setDefault: async (userId, addressId) => {
    // Clear any existing default for this user, then set the new one.
    await supabase.from('Address').update({ isDefault: false }).eq('userId', userId)
    const { error } = await supabase.from('Address').update({ isDefault: true }).eq('id', addressId)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { success: true } }
  },
}

// --- Operations audit log (biller actions on KOTs & bills) ---
export const opsApi = {
  // Best-effort: never block the underlying operation if logging fails.
  log: async ({ outlet, orderId, billNo, kotNo, action, detail, actor }) => {
    try {
      await supabase.from('OpsLog').insert([{
        outlet: outlet || 'renukoot',
        orderId: orderId || null,
        billNo: billNo ?? null,
        kotNo: kotNo ?? null,
        action,
        detail: detail || null,
        actor: actor || null,
      }])
    } catch { /* ignore */ }
  },
  list: async () => {
    const since = new Date(Date.now() - 120 * 86400000).toISOString()
    const { data, error } = await supabase
      .from('OpsLog')
      .select('*')
      .gte('createdAt', since)
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },
}

// --- Dine-in / POS ---
// POS orders (dine-in + take-away) reuse Order/OrderItem with real columns:
// orderType, tableLabel, customerName, billPrinted, isHeld, OrderItem.specialRequest.
// Order.userId is NOT NULL, so staff-created orders attach to a sentinel walk-in user.
const GST_RATE = 0.05
const WALKIN_PHONE = '0000000000'
const POS_SELECT = '*, items:OrderItem(id, quantity, price, menuItemId, specialRequest, itemName, kotNo, menuItem:MenuItem(name, category:Category(name)))'

const totalsFor = (items) => {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0)
  const gst = Math.round(subtotal * GST_RATE)
  return { subtotal, gst, total: subtotal + gst }
}
const itemRows = (orderId, items, kotNo) => items.map(i => ({
  orderId, menuItemId: i.menuItemId || null, quantity: i.quantity, price: i.price,
  specialRequest: i.note || null, itemName: i.itemName || null, kotNo: kotNo ?? null,
}))
const nextKotNo = async (outlet) => { const { data } = await supabase.rpc('next_kot_no', { p_outlet: outlet || 'renukoot' }); return data }

export const dineApi = {
  ensureWalkInUser: async () => {
    const { data: existing } = await supabase.from('User').select('id').eq('phone', WALKIN_PHONE).maybeSingle()
    if (existing) return existing.id
    const { data, error } = await supabase
      .from('User')
      // passwordHash is NOT NULL; this sentinel never logs in, so a placeholder is fine.
      .insert([{ name: 'Walk-in', phone: WALKIN_PHONE, passwordHash: 'walkin-no-login', isVerified: true, isReturning: true }])
      .select('id')
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return data.id
  },

  // Open (un-settled, un-cleared) dine-in orders for the floor view (one outlet).
  openOrders: async (outlet) => {
    let q = supabase
      .from('Order')
      .select(POS_SELECT)
      .eq('orderType', 'DINE_IN')
      .not('tableLabel', 'is', null)
      .not('status', 'in', '("delivered","cancelled")')
      .order('createdAt', { ascending: true })
    if (outlet) q = q.eq('outlet', outlet)
    const { data, error } = await q
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  // All orders from the last ~30 days with KOT-tagged items, for the KOT manager.
  kotsRecent: async (outlet) => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    let q = supabase
      .from('Order')
      .select('id, outlet, tableLabel, orderType, billPrinted, status, paymentStatus, createdAt, customerName, customerPhone, deliveryAddress, items:OrderItem(id, quantity, price, itemName, specialRequest, kotNo, menuItem:MenuItem(name, category:Category(name)))')
      .gte('createdAt', since)
      .order('createdAt', { ascending: false })
    if (outlet) q = q.eq('outlet', outlet)
    const { data, error } = await q
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  // Recent POS orders for the side panel (one outlet).
  recent: async (outlet) => {
    let q = supabase
      .from('Order')
      .select('id, orderType, tableLabel, customerName, total, status, paymentStatus, billPrinted, createdAt, items:OrderItem(quantity)')
      .order('createdAt', { ascending: false })
      .limit(40)
    if (outlet) q = q.eq('outlet', outlet)
    const { data, error } = await q
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  // Start a new POS order (dine-in / take-away / delivery) with its first KOT round.
  createPosOrder: async ({ orderType, table, name, phone, address, items, outlet }) => {
    const out = outlet || 'renukoot'
    const userId = await dineApi.ensureWalkInUser()
    const { total } = totalsFor(items)
    const kotNo = await nextKotNo(out)
    const { data: order, error } = await supabase
      .from('Order')
      .insert([{
        userId, paymentMethod: 'CASH_ON_DELIVERY', total, outlet: out,
        orderType, tableLabel: table || null, customerName: name || null,
        customerPhone: phone || null, deliveryAddress: address || null,
        status: 'preparing', paymentStatus: 'pending', billPrinted: false, isHeld: false,
      }])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    const { error: ie } = await supabase.from('OrderItem').insert(itemRows(order.id, items, kotNo))
    if (ie) throw { response: { data: { error: ie.message } } }
    return { data: order, kotNo }
  },

  // Append another KOT round (new daily KOT number); recompute total, reset billPrinted.
  addItems: async ({ orderId, items }) => {
    const { data: ord } = await supabase.from('Order').select('outlet, billPrinted').eq('id', orderId).single()
    const kotNo = await nextKotNo(ord?.outlet)
    const { error: ie } = await supabase.from('OrderItem').insert(itemRows(orderId, items, kotNo))
    if (ie) throw { response: { data: { error: ie.message } } }
    const { data: allItems } = await supabase.from('OrderItem').select('quantity, price').eq('orderId', orderId)
    const { total } = totalsFor(allItems || [])
    const { error } = await supabase
      .from('Order')
      .update({ total, billPrinted: false, updatedAt: new Date().toISOString() })
      .eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
    await logOp(orderId, ord?.billPrinted ? 'item_add_after_print' : 'kot_add', { kotNo, items: items.length })
    return { data: { total }, kotNo }
  },

  // Move items (whole table / KOT / selection) to another table's order.
  moveItems: async ({ fromOrderId, itemIds, toTable }) => {
    const { data: src } = await supabase.from('Order').select('outlet').eq('id', fromOrderId).single()
    const out = src?.outlet || 'renukoot'
    let { data: target } = await supabase.from('Order').select('id')
      .eq('orderType', 'DINE_IN').eq('tableLabel', toTable).eq('outlet', out)
      .not('status', 'in', '("delivered","cancelled")').maybeSingle()
    let targetId = target?.id
    if (!targetId) {
      const userId = await dineApi.ensureWalkInUser()
      const { data: created, error: ce } = await supabase.from('Order')
        .insert([{ userId, paymentMethod: 'CASH_ON_DELIVERY', total: 0, outlet: out, orderType: 'DINE_IN', tableLabel: toTable, status: 'preparing', paymentStatus: 'pending', billPrinted: false, isHeld: false }])
        .select('id').single()
      if (ce) throw { response: { data: { error: ce.message } } }
      targetId = created.id
    }
    const { error } = await supabase.from('OrderItem').update({ orderId: targetId }).in('id', itemIds)
    if (error) throw { response: { data: { error: error.message } } }
    await dineApi.recompute(targetId)
    await dineApi.recompute(fromOrderId)
  },

  recompute: async (orderId) => {
    const { data: items } = await supabase.from('OrderItem').select('quantity, price').eq('orderId', orderId)
    if (!items || items.length === 0) {
      await supabase.from('Order').update({ status: 'cancelled', updatedAt: new Date().toISOString() }).eq('id', orderId)
      return
    }
    const { total } = totalsFor(items)
    await supabase.from('Order').update({ total, billPrinted: false, updatedAt: new Date().toISOString() }).eq('id', orderId)
  },

  // Assign a sequential (per-outlet, per-FY) bill number if the order has none yet.
  ensureBillNo: async (orderId) => {
    const { data: cur } = await supabase.from('Order').select('billNo, outlet').eq('id', orderId).single()
    if (cur?.billNo) return cur.billNo
    const { data: bn } = await supabase.rpc('next_bill_no', { p_outlet: cur?.outlet || 'renukoot' })
    return bn
  },

  markBillPrinted: async (orderId) => {
    const { data: before } = await supabase.from('Order').select('billPrinted').eq('id', orderId).single()
    const billNo = await dineApi.ensureBillNo(orderId)
    const { data, error } = await supabase
      .from('Order')
      .update({ billPrinted: true, billNo, updatedAt: new Date().toISOString() })
      .eq('id', orderId).select(POS_SELECT).single()
    if (error) throw { response: { data: { error: error.message } } }
    if (before?.billPrinted) await logOp(orderId, 'reprint', { billNo })
    return { data }
  },

  // Mark paid with optional discount, complimentary, and split payments.
  // Recomputes the total authoritatively (discount applied before 5% GST).
  settle: async ({ orderId, payments = [], discount = 0, complimentary = false }) => {
    const { data: items } = await supabase.from('OrderItem').select('quantity, price').eq('orderId', orderId)
    const subtotal = (items || []).reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0)
    const disc = complimentary ? subtotal : Math.min(Math.max(0, discount), subtotal)
    const taxable = Math.max(0, subtotal - disc)
    const grand = complimentary ? 0 : Math.round(taxable * 1.05)
    const billNo = await dineApi.ensureBillNo(orderId)
    const paymentMethod = complimentary ? 'COMPLIMENTARY'
      : payments.length > 1 ? 'SPLIT'
      : (payments[0]?.method === 'UPI' ? 'QR_UPI' : 'CASH_ON_DELIVERY')
    const { data, error } = await supabase
      .from('Order')
      .update({
        paymentStatus: 'paid', paymentMethod, total: grand,
        discount: disc, isComplimentary: complimentary,
        payments: payments.length ? payments : null,
        billPrinted: true, billNo, updatedAt: new Date().toISOString(),
      })
      .eq('id', orderId).select(POS_SELECT).single()
    if (error) throw { response: { data: { error: error.message } } }
    await logOp(orderId, complimentary ? 'waive_off' : 'settle', { discount: disc, total: grand, complimentary, split: payments.length > 1 })
    return { data }
  },

  // Close the order and free the table.
  clearTable: async (orderId) => {
    const { error } = await supabase.from('Order').update({ status: 'delivered', updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
  },

  setHold: async (orderId, isHeld) => {
    const { error } = await supabase.from('Order').update({ isHeld, updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
  },

  // Edit a running order's items: change quantities and/or remove lines, then
  // recompute the total (and reset billPrinted since the order changed).
  // `action` tags the audit entry ('kot_modify' default, or 'bill_modify').
  updateOrderItems: async ({ orderId, updates = [], removeIds = [], action = 'kot_modify' }) => {
    const { data: before } = await supabase.from('Order').select('billPrinted').eq('id', orderId).single()
    for (const u of updates) {
      const { error } = await supabase.from('OrderItem').update({ quantity: u.quantity }).eq('id', u.id)
      if (error) throw { response: { data: { error: error.message } } }
    }
    if (removeIds.length) {
      const { error } = await supabase.from('OrderItem').delete().in('id', removeIds)
      if (error) throw { response: { data: { error: error.message } } }
    }
    const { data: allItems } = await supabase.from('OrderItem').select('quantity, price').eq('orderId', orderId)
    const { total } = totalsFor(allItems || [])
    const { error } = await supabase.from('Order').update({ total, billPrinted: false, updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
    // If the bill was already printed, this is a change after print.
    const act = before?.billPrinted ? (action === 'kot_modify' ? 'item_add_after_print' : action) : action
    await logOp(orderId, act, { updates: updates.length, removed: removeIds.length, total })
    return { data: { total } }
  },

  // Move a running order to a different table.
  moveOrder: async ({ orderId, tableLabel }) => {
    const { error } = await supabase.from('Order').update({ tableLabel, updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
  },

  cancel: async (orderId) => {
    const { error } = await supabase.from('Order').update({ status: 'cancelled', updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
  },
}
