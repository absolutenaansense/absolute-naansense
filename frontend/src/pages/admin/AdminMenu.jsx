import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ToggleLeft, ToggleRight, Edit2, Check, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import { menuApi } from '../../services/api'

function VegDot({ isVeg }) {
  return (
    <span className={`w-3 h-3 border-2 rounded-sm inline-flex items-center justify-center flex-shrink-0 ${isVeg ? 'border-green-600' : 'border-red-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
    </span>
  )
}

function EditItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({ name: item.name, price: item.price, description: item.description || '' })
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold mb-4">Edit item</h3>
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="label">Price (₹)</label><input className="input" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
          <div><label className="label">Description</label><input className="input" placeholder="Optional" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave(form)} className="btn-primary flex-1 justify-center">Save changes</button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function AddItemModal({ categories, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', price: '', categoryId: categories[0]?.id || '', isVeg: true, description: '' })
  const save = () => {
    if (!form.name || !form.price || !form.categoryId) { toast.error('Name, price and category are required'); return }
    onSave({ ...form, price: parseFloat(form.price) })
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold mb-4">Add menu item</h3>
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="label">Price (₹)</label><input className="input" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              <button onClick={() => setForm(p => ({ ...p, isVeg: true }))} className={`flex-1 py-2 rounded-lg border text-sm ${form.isVeg ? 'border-green-500 bg-green-50 text-green-700' : 'border-stone-200 text-stone-600'}`}>Veg</button>
              <button onClick={() => setForm(p => ({ ...p, isVeg: false }))} className={`flex-1 py-2 rounded-lg border text-sm ${!form.isVeg ? 'border-red-500 bg-red-50 text-red-600' : 'border-stone-200 text-stone-600'}`}>Non-veg</button>
            </div>
          </div>
          <div><label className="label">Description</label><input className="input" placeholder="Optional" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={save} className="btn-primary flex-1 justify-center">Add item</button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminMenu() {
  const [editingItem, setEditingItem] = useState(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['menu'],
    queryFn: () => menuApi.getMenu().then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => menuApi.getCategories().then(r => r.data),
  })

  const { mutate: addItem } = useMutation({
    mutationFn: (item) => menuApi.addItem({ ...item, isAvailable: true }),
    onSuccess: () => { queryClient.invalidateQueries(['menu']); setAdding(false); toast.success('Item added') },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to add item'),
  })

  const { mutate: toggleItem } = useMutation({
    mutationFn: (id) => menuApi.toggleItem(id),
    onSuccess: () => queryClient.invalidateQueries(['menu']),
    onError: () => toast.error('Failed to update'),
  })

  const { mutate: updateItem } = useMutation({
    mutationFn: ({ id, ...data }) => menuApi.updateItem(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['menu']); setEditingItem(null); toast.success('Item updated') },
    onError: () => toast.error('Failed to update item'),
  })

  return (
    <AdminLayout title="Menu management">
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(form) => updateItem({ id: editingItem.id, ...form })}
        />
      )}
      {adding && (
        <AddItemModal categories={categories} onClose={() => setAdding(false)} onSave={(item) => addItem(item)} />
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search menu items…"
            className="w-full text-sm bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2"
          />
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm whitespace-nowrap">
          <Plus size={15} /> Add menu item
        </button>
      </div>

      {(data?.categories || [])
        .map(cat => ({ ...cat, menuItems: cat.menuItems.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())) }))
        .filter(cat => cat.menuItems.length > 0)
        .map(cat => (
        <div key={cat.id} className="card mb-4 overflow-hidden">
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-700">{cat.name}</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {cat.menuItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <VegDot isVeg={item.isVeg} />
                  <div>
                    <div className={`text-sm font-medium ${item.isAvailable ? 'text-stone-800' : 'text-stone-400 line-through'}`}>
                      {item.name}
                    </div>
                    {item.description && <div className="text-xs text-stone-400">{item.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-stone-900">₹{item.price}</span>
                  <button
                    onClick={() => setEditingItem(item)}
                    className="btn-ghost p-1.5 text-stone-400 hover:text-stone-700"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`transition-colors ${item.isAvailable ? 'text-green-500 hover:text-red-400' : 'text-stone-300 hover:text-green-500'}`}
                    title={item.isAvailable ? 'Mark as unavailable' : 'Mark as available'}
                  >
                    {item.isAvailable ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AdminLayout>
  )
}
