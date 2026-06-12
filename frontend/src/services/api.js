import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const store = useAuthStore.getState()
  const token = config.isAdmin ? store.getAdminToken() : store.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// --- Auth ---
export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  addAddress: (data) => api.post('/api/auth/addresses', data),
  deleteAddress: (id) => api.delete(`/api/auth/addresses/${id}`),
  adminLogin: (data) => api.post('/api/auth/admin/login', data),
}

// --- Menu ---
export const menuApi = {
  getMenu: () => api.get('/api/menu'),
  addItem: (data) => api.post('/api/menu/items', { ...data, isAdmin: true }),
  updateItem: (id, data) => api.patch(`/api/menu/items/${id}`, { ...data, isAdmin: true }),
  toggleItem: (id) => api.patch(`/api/menu/items/${id}/toggle`, {}, { isAdmin: true }),
}

// --- Orders ---
export const ordersApi = {
  createOrder: (data) => api.post('/api/orders', data),
  paymentReceived: (id) => api.post(`/api/orders/${id}/payment-received`),
  myOrders: () => api.get('/api/orders/my'),
  getOrder: (id) => api.get(`/api/orders/${id}`),
  // Admin
  allOrders: (params) => api.get('/api/orders/admin/all', { params, isAdmin: true }),
  confirmOrder: (id) => api.post(`/api/orders/${id}/confirm`, {}, { isAdmin: true }),
  cancelOrder: (id, reason) => api.post(`/api/orders/${id}/cancel`, { reason }, { isAdmin: true }),
  updateStatus: (id, status) => api.patch(`/api/orders/${id}/status`, { status }, { isAdmin: true }),
}

// --- Reservations ---
export const reservationsApi = {
  create: (data) => api.post('/api/reservations', data),
  getTables: () => api.get('/api/reservations/tables'),
  checkAvailability: (date, timeSlot) => api.get('/api/reservations/availability', { params: { date, timeSlot } }),
  // Admin
  all: (params) => api.get('/api/reservations', { params, isAdmin: true }),
  update: (id, data) => api.patch(`/api/reservations/${id}`, data, { isAdmin: true }),
  cancel: (id) => api.delete(`/api/reservations/${id}`, { isAdmin: true }),
}

// --- Admin ---
export const adminApi = {
  dashboard: () => api.get('/api/admin/dashboard', { isAdmin: true }),
  updateFcmToken: (token) => api.patch('/api/admin/fcm-token', { fcmToken: token }, { isAdmin: true }),
  testPetpooja: () => api.post('/api/petpooja/test', {}, { isAdmin: true }),
}
