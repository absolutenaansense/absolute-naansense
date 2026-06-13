import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

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

  createOrder: async ({ userId, items, paymentMethod, total, orderType, deliveryAddress, customerName }) => {
    // COD orders need no payment step, so they go straight to the admin
    // "Awaiting confirm" queue (payment_received). UPI orders wait at
    // 'pending' until the customer marks payment as made.
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert([{
        userId, paymentMethod, total,
        orderType: orderType || 'DELIVERY',
        deliveryAddress: deliveryAddress || null,
        customerName: customerName || null,
        status: paymentMethod === 'QR_UPI' ? 'pending' : 'payment_received',
        paymentStatus: 'pending',
      }])
      .select()
      .single()
    if (orderError) throw { response: { data: { error: orderError.message } } }

    const orderItems = items.map(item => ({
      orderId: order.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      specialRequest: item.note || null,
    }))
    const { error: itemsError } = await supabase.from('OrderItem').insert(orderItems)
    if (itemsError) throw { response: { data: { error: itemsError.message } } }

    return { data: order }
  },

  myOrders: async (userId) => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*, menuItem:MenuItem(name, price))')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  getOrder: async (id) => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*, menuItem:MenuItem(name, price)), user:User(name, phone)')
      .eq('id', id)
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  allOrders: async () => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(*, menuItem:MenuItem(name)), user:User(name, phone)')
      .order('createdAt', { ascending: false })
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  confirmOrder: async (id) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ status: 'confirmed', paymentStatus: 'paid', updatedAt: new Date().toISOString() })
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

  cancelOrder: async (id) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
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
}

// --- Dine-in / POS ---
// POS orders (dine-in + take-away) reuse Order/OrderItem with real columns:
// orderType, tableLabel, customerName, billPrinted, isHeld, OrderItem.specialRequest.
// Order.userId is NOT NULL, so staff-created orders attach to a sentinel walk-in user.
const GST_RATE = 0.05
const WALKIN_PHONE = '0000000000'
const POS_SELECT = '*, items:OrderItem(id, quantity, price, menuItemId, specialRequest, menuItem:MenuItem(name))'

const totalsFor = (items) => {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0)
  const gst = Math.round(subtotal * GST_RATE)
  return { subtotal, gst, total: subtotal + gst }
}
const itemRows = (orderId, items) => items.map(i => ({
  orderId, menuItemId: i.menuItemId, quantity: i.quantity, price: i.price, specialRequest: i.note || null,
}))

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

  // Open (un-settled, un-cleared) dine-in orders for the floor view.
  openOrders: async () => {
    const { data, error } = await supabase
      .from('Order')
      .select(POS_SELECT)
      .eq('orderType', 'DINE_IN')
      .not('tableLabel', 'is', null)
      .not('status', 'in', '("delivered","cancelled")')
      .order('createdAt', { ascending: true })
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  // Recent POS orders for the side panel (any type).
  recent: async () => {
    const { data, error } = await supabase
      .from('Order')
      .select('id, orderType, tableLabel, customerName, total, status, paymentStatus, billPrinted, createdAt, items:OrderItem(quantity)')
      .order('createdAt', { ascending: false })
      .limit(40)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: data || [] }
  },

  // Start a new POS order (dine-in table or take-away) with its first KOT round.
  createPosOrder: async ({ orderType, table, name, items }) => {
    const userId = await dineApi.ensureWalkInUser()
    const { total } = totalsFor(items)
    const { data: order, error } = await supabase
      .from('Order')
      .insert([{
        userId, paymentMethod: 'CASH_ON_DELIVERY', total,
        orderType, tableLabel: table || null, customerName: name || null,
        status: 'preparing', paymentStatus: 'pending', billPrinted: false, isHeld: false,
      }])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    const { error: ie } = await supabase.from('OrderItem').insert(itemRows(order.id, items))
    if (ie) throw { response: { data: { error: ie.message } } }
    return { data: order }
  },

  // Append another KOT round; recompute total and reset billPrinted (bill is now stale).
  addItems: async ({ orderId, items }) => {
    const { error: ie } = await supabase.from('OrderItem').insert(itemRows(orderId, items))
    if (ie) throw { response: { data: { error: ie.message } } }
    const { data: allItems } = await supabase.from('OrderItem').select('quantity, price').eq('orderId', orderId)
    const { total } = totalsFor(allItems || [])
    const { error } = await supabase
      .from('Order')
      .update({ total, billPrinted: false, updatedAt: new Date().toISOString() })
      .eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { total } }
  },

  markBillPrinted: async (orderId) => {
    const { error } = await supabase.from('Order').update({ billPrinted: true, updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
  },

  // Mark paid (table shows "Paid" but stays until cleared).
  settle: async ({ orderId, paymentMethod }) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ paymentStatus: 'paid', paymentMethod, billPrinted: true, updatedAt: new Date().toISOString() })
      .eq('id', orderId).select().single()
    if (error) throw { response: { data: { error: error.message } } }
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

  cancel: async (orderId) => {
    const { error } = await supabase.from('Order').update({ status: 'cancelled', updatedAt: new Date().toISOString() }).eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
  },
}
