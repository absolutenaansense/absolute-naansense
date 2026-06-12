import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: {}, // { menuItemId: { item, quantity } }

      addItem: (item) => {
        const { items } = get()
        const existing = items[item.id]
        set({
          items: {
            ...items,
            [item.id]: { item, quantity: (existing?.quantity || 0) + 1 },
          },
        })
      },

      removeItem: (itemId) => {
        const { items } = get()
        const existing = items[itemId]
        if (!existing) return
        if (existing.quantity <= 1) {
          const next = { ...items }
          delete next[itemId]
          set({ items: next })
        } else {
          set({ items: { ...items, [itemId]: { ...existing, quantity: existing.quantity - 1 } } })
        }
      },

      clearCart: () => set({ items: {} }),

      getTotal: () => {
        const { items } = get()
        return Object.values(items).reduce((sum, { item, quantity }) => sum + parseFloat(item.price) * quantity, 0)
      },

      getCount: () => {
        const { items } = get()
        return Object.values(items).reduce((sum, { quantity }) => sum + quantity, 0)
      },

      getItemQuantity: (itemId) => get().items[itemId]?.quantity || 0,

      getOrderItems: () => {
        return Object.values(get().items).map(({ item, quantity }) => ({
          menuItemId: item.id,
          quantity,
          price: parseFloat(item.price),
        }))
      },
    }),
    { name: 'naansense-cart' }
  )
)
