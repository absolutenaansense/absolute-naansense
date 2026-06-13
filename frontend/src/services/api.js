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

  createOrder: async ({ userId, items, paymentMethod, total, notes, tableId }) => {
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('Order')
      // COD orders need no payment step, so they go straight to the admin
      // "Awaiting confirm" queue (payment_received). UPI orders wait at
      // 'pending' until the customer marks payment as made.
      .insert([{ userId, paymentMethod, total, notes, tableId: tableId || null, status: paymentMethod === 'QR_UPI' ? 'pending' : 'payment_received', paymentStatus: 'pending' }])
      .select()
      .single()
    if (orderError) throw { response: { data: { error: orderError.message } } }

    // Create order items
    const orderItems = items.map(item => ({
      orderId: order.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
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
      .select('*, user:User(name, phone), table:Table(number, capacity)')
      .order('date', { ascending: false })
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

// --- Dine-in POS ---
// Dine-in orders reuse the Order/OrderItem tables. The table label + section +
// optional customer info live in Order.notes JSON ({ type:'DINE_IN', table, ... }).
// Order.userId is NOT NULL, so staff-created orders attach to a sentinel walk-in user.
const GST_RATE = 0.05
const WALKIN_PHONE = '0000000000'

const totalsFor = (items) => {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0)
  const gst = Math.round(subtotal * GST_RATE)
  return { subtotal, gst, total: subtotal + gst }
}

export const dineApi = {
  ensureWalkInUser: async () => {
    const { data: existing } = await supabase.from('User').select('id').eq('phone', WALKIN_PHONE).maybeSingle()
    if (existing) return existing.id
    const { data, error } = await supabase
      .from('User')
      .insert([{ name: 'Walk-in (Dine-in)', phone: WALKIN_PHONE, isVerified: true, isReturning: true }])
      .select('id')
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return data.id
  },

  // Open (un-settled) dine-in orders with their items, for the floor view.
  openOrders: async () => {
    const { data, error } = await supabase
      .from('Order')
      .select('*, items:OrderItem(id, quantity, price, menuItemId, menuItem:MenuItem(name))')
      .not('status', 'in', '("delivered","cancelled")')
      .order('createdAt', { ascending: true })
    if (error) throw { response: { data: { error: error.message } } }
    const dine = (data || []).filter(o => {
      try { return JSON.parse(o.notes || '{}').type === 'DINE_IN' } catch { return false }
    })
    return { data: dine }
  },

  // Start a table's running order with its first KOT round.
  createTableOrder: async ({ table, section, name, phone, items, itemNotes }) => {
    const userId = await dineApi.ensureWalkInUser()
    const { total } = totalsFor(items)
    const notes = JSON.stringify({ type: 'DINE_IN', table, section, name: name || null, phone: phone || null, items: itemNotes || {} })
    const { data: order, error } = await supabase
      .from('Order')
      .insert([{ userId, paymentMethod: 'CASH_ON_DELIVERY', total, notes, status: 'preparing', paymentStatus: 'pending' }])
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    const rows = items.map(i => ({ orderId: order.id, menuItemId: i.menuItemId, quantity: i.quantity, price: i.price }))
    const { error: ie } = await supabase.from('OrderItem').insert(rows)
    if (ie) throw { response: { data: { error: ie.message } } }
    return { data: order }
  },

  // Append another KOT round to an existing table order; recompute the total.
  addItems: async ({ orderId, items, itemNotes }) => {
    const { data: order } = await supabase.from('Order').select('notes').eq('id', orderId).single()
    const rows = items.map(i => ({ orderId, menuItemId: i.menuItemId, quantity: i.quantity, price: i.price }))
    const { error: ie } = await supabase.from('OrderItem').insert(rows)
    if (ie) throw { response: { data: { error: ie.message } } }
    const { data: allItems } = await supabase.from('OrderItem').select('quantity, price').eq('orderId', orderId)
    const { total } = totalsFor(allItems || [])
    let parsed = {}
    try { parsed = JSON.parse(order?.notes || '{}') } catch { /* ignore */ }
    parsed.items = { ...(parsed.items || {}), ...(itemNotes || {}) }
    const { error } = await supabase
      .from('Order')
      .update({ total, notes: JSON.stringify(parsed), updatedAt: new Date().toISOString() })
      .eq('id', orderId)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { total } }
  },

  settle: async ({ orderId, paymentMethod }) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ status: 'delivered', paymentStatus: 'paid', paymentMethod, updatedAt: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  cancel: async (orderId) => {
    const { data, error } = await supabase
      .from('Order')
      .update({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },
}
