import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      admin: null,
      token: null,
      adminToken: null,

      setUser: (user, token) => set({ user, token }),
      setAdmin: (admin, adminToken) => set({ admin, adminToken }),

      logout: () => set({ user: null, token: null }),
      adminLogout: () => set({ admin: null, adminToken: null }),

      getToken: () => get().token,
      getAdminToken: () => get().adminToken,
    }),
    {
      name: 'naansense-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        admin: state.admin,
        adminToken: state.adminToken,
      }),
    }
  )
)
