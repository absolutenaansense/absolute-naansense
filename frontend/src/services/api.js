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
  createOrder: async ({ userId, items, paymentMethod, total, notes, tableId }) => {
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert([{ userId, paymentMethod, total, notes, tableId: tableId || null, status: 'pending', paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending' }])
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
