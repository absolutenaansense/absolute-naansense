import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Truck, ShoppingBag, QrCode, Banknote, Check, Plus, Minus, Trash2, ChevronRight, CheckCircle2, Clock, RefreshCw, XCircle, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomerLayout from '../../components/customer/CustomerLayout'
import LiveOrderTracker from '../../components/customer/LiveOrderTracker'
import PayAheadQR from '../../components/customer/PayAheadQR'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { addressApi, ordersApi } from '../../services/api'
import { formatIST } from '../../utils/dateIST'
import { buildCustomerNotes } from '../../utils/orderNotes'
import { RESTAURANT } from '../../config/restaurant'

const DELIVERY_FEE = 50 // charged on delivery orders below FREE_DELIVERY_THRESHOLD
const FREE_DELIVERY_THRESHOLD = 501 // orders >= this amount get free delivery
const GST_RATE = 0.05 // 5% GST applied to every order's subtotal

// Ordering hours (IST, minutes from midnight):
//   06:00 (360)  — start taking orders
//   10:00 (600)  — kitchen starts cooking; orders before this are queued for 10:00 AM
//   22:59 (1379) — last minute online (UPI) payment is offered
//   23:05 (1385) — last minute an order can be placed; after this the kitchen is closed
const OPEN_MIN = 360, COOK_MIN = 600, UPI_LAST_MIN = 1379, CLOSE_MIN = 1385

const steps = ['Delivery', 'Payment', 'Confirm']

function StepBar({ current }) {
  return (
    <div className="flex items-center px-6 py-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all ${
            i < current ? 'bg-brand-500 text-white' :
            i === current ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
            'bg-stone-100 text-stone-400'
          }`}>
            {i < current ? <Check size={13} /> : i + 1}
          </div>
          <span className={`ml-2 text-sm font-medium ${i <= current ? 'text-stone-800' : 'text-stone-400'}`}>{s}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i < current ? 'bg-brand-500' : 'bg-stone-100'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function CheckoutPage() {
  const [step, setStep] = useState(0)
  const [orderType, setOrderType] = useState('DELIVERY')
  const [pickupTime, setPickupTime] = useState('')   // HH:mm for takeaway
  const [orderNote, setOrderNote] = useState('')      // whole-order special request
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY')
  const [newAddress, setNewAddress] = useState({ label: 'Home', line1: '', line2: '', city: '', pincode: '' })
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [paidTotal, setPaidTotal] = useState(0)
  const [placedSnapshot, setPlacedSnapshot] = useState(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const [paymentState, setPaymentState] = useState('idle') // idle | attempted | paid | failed
  const [liveStatus, setLiveStatus] = useState(null)
  const orderPlacedRef = useRef(false)  // synchronous guard so clearing the cart can't redirect away

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { items, addItem, removeItem, deleteItem, setItemNote, clearCart, getTotal, getOrderItems, outlet } = useCartStore()

  // Browsing is public; placing an order needs an account. Send the user to
  // sign in and bring them right back to checkout (cart persists in storage).
  const requireLogin = () => {
    if (user) return true
    navigate('/login', { state: { from: '/checkout' } })
    return false
  }

  const subtotal = getTotal()
  // No delivery charge on take-away orders.
  const deliveryFee = orderType === 'DELIVERY' && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0
  const gst = Math.round(subtotal * GST_RATE)
  const total = subtotal + deliveryFee + gst

  // Pickup is a time today, at least 30 minutes out (preparation time).
  const pad2 = n => String(n).padStart(2, '0')
  const minPickupDate = new Date(Date.now() + 30 * 60000)
  const minPickupTime = `${pad2(minPickupDate.getHours())}:${pad2(minPickupDate.getMinutes())}`
  const pickupDateObj = () => {
    if (!pickupTime) return null
    const [h, m] = pickupTime.split(':').map(Number)
    const d = new Date(); d.setHours(h, m, 0, 0); return d
  }

  const { data: addresses = [], refetch: refetchProfile } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => addressApi.getAddresses(user?.id).then(r => r.data),
    enabled: !!user?.id,
  })

  // Pre-select the default address (or the first) so the customer doesn't have to.
  useEffect(() => {
    if (!selectedAddressId && addresses.length) {
      const def = addresses.find(a => a.isDefault) || addresses[0]
      if (def) setSelectedAddressId(def.id)
    }
  }, [addresses, selectedAddressId])

  const handleSetDefault = async (addressId) => {
    try { await addressApi.setDefault(user.id, addressId); await refetchProfile(); toast.success('Default address set') }
    catch { toast.error('Failed to set default') }
  }

  const handleSaveAddress = async () => {
    if (!newAddress.line1 || !newAddress.city || !newAddress.pincode) {
      toast.error('Please fill address, city and pincode')
      return
    }
    try {
      await addressApi.addAddress({ userId: user.id, ...newAddress })
      await refetchProfile()
      setShowAddAddress(false)
      toast.success('Address saved')
    } catch {
      toast.error('Failed to save address')
    }
  }

  const pickupValid = () => {
    if (orderType !== 'TAKEAWAY') return true
    const d = pickupDateObj()
    if (!d) { toast.error('Please choose a pickup time'); return false }
    if (d.getTime() < Date.now() + 30 * 60000 - 60000) { toast.error('Pickup time must be at least 30 minutes from now'); return false }
    return true
  }

  // Ordering window + payment availability (recomputed live so it stays accurate
  // across the 10:59 PM / 11:05 PM boundaries).
  const currentIstMinutes = () => {
    const [h, m] = formatIST(new Date().toISOString(), 'HH:mm').split(':').map(Number)
    return h * 60 + m
  }
  const orderingStatus = () => {
    const m = currentIstMinutes()
    const open = m >= OPEN_MIN && m <= CLOSE_MIN
    return { open, early: open && m < COOK_MIN, onlinePayment: open && m <= UPI_LAST_MIN }
  }
  const status = orderingStatus()
  const orderingOpen = status.open       // can an order be placed right now?
  const orderingEarly = status.early     // before 10 AM → order is queued for 10 AM
  const upiAvailable = status.onlinePayment  // online (UPI) payment offered?
  const hoursValid = () => {
    if (!orderingStatus().open) { toast.error("Kitchen is closed. Orders can't be placed."); return false }
    return true
  }
  const orderingBanner = !orderingOpen ? (
    <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5 text-center font-medium">
      Kitchen is closed. Orders can't be placed.
    </div>
  ) : orderingEarly ? (
    <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-3 py-2.5 text-center">
      We open at 10:00 AM — your order will be placed at 10:00 AM. You can pay now by UPI or choose Cash on delivery.
    </div>
  ) : null

  const goToPayment = () => {
    if (!requireLogin()) return
    if (!hoursValid()) return
    if (orderType === 'DELIVERY' && !selectedAddressId) { toast.error('Please select a delivery address'); return }
    if (!pickupValid()) return
    setStep(1)
  }

  const openConfirm = () => {
    if (!requireLogin()) return
    if (!hoursValid()) return
    if (orderType === 'DELIVERY' && !selectedAddressId) { toast.error('Please select a delivery address'); return }
    if (!pickupValid()) return
    setConfirmOpen(true)
  }

  const handlePlaceOrder = async () => {
    if (!requireLogin()) return
    if (!hoursValid()) return
    if (orderType === 'DELIVERY' && !selectedAddressId) {
      toast.error('Please select a delivery address')
      return
    }
    if (!pickupValid()) return
    // Online payment closes at 10:59 PM — fall back to Cash on delivery after that.
    let pm = paymentMethod
    if (pm === 'QR_UPI' && !orderingStatus().onlinePayment) {
      pm = 'CASH_ON_DELIVERY'
      setPaymentMethod('CASH_ON_DELIVERY')
      toast('Online payment has closed for tonight — placing as Cash on delivery')
    }
    setConfirming(true)
    try {
      const orderItems = getOrderItems()
      const selectedAddress = addresses.find(a => a.id === selectedAddressId)
      const addressText = selectedAddress
        ? `${selectedAddress.line1}${selectedAddress.line2 ? ', ' + selectedAddress.line2 : ''}, ${selectedAddress.city} - ${selectedAddress.pincode}`
        : null
      const pickupAt = orderType === 'TAKEAWAY' ? (pickupDateObj()?.toISOString() || null) : null
      const { data } = await ordersApi.createOrder({
        userId: user.id,
        items: orderItems,
        paymentMethod: pm,
        total,
        orderType,
        deliveryAddress: addressText,
        pickupAt,
        notes: buildCustomerNotes({ text: orderNote, outlet }),
      })
      // Snapshot the order for the WhatsApp image (cart is cleared right after).
      setPlacedSnapshot({
        ref: data.id, name: user?.name || null, phone: user?.phone || null, address: addressText,
        orderType, pickupAt,
        items: Object.values(items).map(({ item, quantity, note }) => ({ name: item.name, price: parseFloat(item.price), quantity, note: note || '' })),
        subtotal, gst, deliveryFee, total,
        dateStr: formatIST(new Date().toISOString(), 'dd/MM/yy HH:mm'),
      })
      orderPlacedRef.current = true   // set before clearCart so the render guard never redirects
      setPlacedOrder(data)
      setPaidTotal(total)
      setOrderComplete(true)
      setStep(2)
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      clearCart()
      clearCart()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order')
    } finally {
      setConfirming(false)
    }
  }

  const handleWhatsApp = () => {
    if (!placedSnapshot) return
    // Seek permission, then open a WhatsApp chat directly to the restaurant number.
    if (!window.confirm('Open WhatsApp to message the restaurant with your order?')) return
    const s = placedSnapshot
    const lines = [
      `*${RESTAURANT.name} — New Order*`,
      `Order #${(s.ref || '').slice(0, 8).toUpperCase()} · ${s.dateStr}`,
      s.orderType === 'TAKEAWAY' ? `Takeaway${s.pickupAt ? ` — Pickup ${formatIST(s.pickupAt, 'dd MMM, h:mm a')}` : ''}` : 'Delivery',
    ]
    if (s.name) lines.push(`Name: ${s.name}`)
    if (s.phone) lines.push(`Phone: ${s.phone}`)
    if (s.address) lines.push(`Address: ${s.address}`)
    lines.push('--------------------')
    s.items.forEach(it => lines.push(`${it.quantity} x ${it.name}${it.note ? ` (${it.note})` : ''} — ₹${(it.price * it.quantity).toFixed(0)}`))
    lines.push('--------------------')
    lines.push(`Total: ₹${s.total.toFixed(0)} (incl. GST) · Cash`)
    window.open(`https://wa.me/${RESTAURANT.kotWhatsApp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  const handleIvePaid = async () => {
    setNotifying(true)
    try {
      await ordersApi.paymentReceived(placedOrder.id)
      setPaymentState('paid')
      toast.success('Payment confirmed! Restaurant is reviewing your order.')
    } catch {
      toast.error('Failed to confirm — please try again')
    } finally {
      setNotifying(false)
    }
  }

  if (Object.keys(items).length === 0 && !orderComplete && !orderPlacedRef.current) {
    navigate(outlet ? '/menu' : '/')
    return null
  }

  return (
    <CustomerLayout showBack title="Checkout">
      <StepBar current={step} />

      {/* Confirm-items prompt before placing */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900">Confirm your order</h3>
              <p className="text-xs text-stone-500 mt-0.5">Please review your items before placing.</p>
            </div>
            <div className="p-5 space-y-1.5 max-h-[45vh] overflow-y-auto">
              {Object.values(items).map(({ item, quantity, note }) => (
                <div key={item.id} className="text-sm">
                  <div className="flex justify-between"><span className="text-stone-700">{item.name} × {quantity}</span><span className="font-medium">₹{(parseFloat(item.price) * quantity).toFixed(0)}</span></div>
                  {note && <div className="text-xs text-amber-600 italic pl-1">↳ {note}</div>}
                </div>
              ))}
              <div className="border-t border-stone-100 pt-2 mt-2 flex justify-between font-semibold text-stone-900"><span>Total (incl. GST)</span><span>₹{total.toFixed(0)}</span></div>
            </div>
            <div className="px-5">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">⚠ Orders once placed cannot be modified or cancelled.</div>
            </div>
            <div className="flex gap-2 p-5">
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary flex-1 justify-center">Modify order</button>
              <button disabled={confirming} onClick={() => { setConfirmOpen(false); handlePlaceOrder() }} className="btn-primary flex-1 justify-center">{confirming ? 'Placing…' : 'Confirm order'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Order summary (always visible) */}
      {step < 2 && (
        <div className="px-4 mb-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Your order</div>
            <div className="space-y-3">
              {Object.values(items).map(({ item, quantity, note }) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-stone-700 truncate">{item.name}</div>
                      <div className="text-xs text-stone-400">₹{parseFloat(item.price).toFixed(0)} each</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200 text-stone-600 active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-medium text-stone-800 w-5 text-center">{quantity}</span>
                        <button
                          onClick={() => addItem(item)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200 text-stone-600 active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-stone-900 w-12 text-right">₹{(parseFloat(item.price) * quantity).toFixed(0)}</span>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 text-stone-300 hover:text-red-500 active:scale-95"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={note || ''}
                    onChange={(e) => setItemNote(item.id, e.target.value)}
                    placeholder="Add a special request (e.g. extra spicy, no onion)"
                    maxLength={120}
                    className="w-full text-xs bg-stone-50 border border-stone-100 rounded-lg px-3 py-2 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-brand-300"
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-stone-500">
                <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-500">
                <span>GST (5%)</span><span>₹{gst}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-500">
                <span>Delivery fee</span><span>{deliveryFee > 0 ? `₹${deliveryFee}` : 'Free'}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-stone-900 pt-1">
                <span>Total</span><span>₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 0: Delivery */}
      {step === 0 && (
        <div className="px-4 space-y-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Order type</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'DELIVERY', icon: Truck, label: 'Delivery' },
                { value: 'TAKEAWAY', icon: ShoppingBag, label: 'Takeaway' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setOrderType(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    orderType === value ? 'border-brand-500 bg-brand-50' : 'border-stone-100 bg-white hover:border-stone-200'
                  }`}
                >
                  <Icon size={22} className={orderType === value ? 'text-brand-500' : 'text-stone-400'} />
                  <span className={`text-sm font-medium ${orderType === value ? 'text-brand-600' : 'text-stone-600'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Whole-order special request */}
          <div className="card p-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Special request (optional)</div>
            <textarea
              value={orderNote}
              onChange={e => setOrderNote(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Any instructions for the whole order? e.g. less spicy, no onion, extra napkins"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 resize-none"
            />
          </div>

          {orderType === 'DELIVERY' && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Delivery address</div>
              <div className="space-y-2">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50' : 'border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-stone-800 flex items-center gap-2">
                          {addr.label}
                          {addr.isDefault && <span className="text-[10px] font-semibold bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full">Default</span>}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>
                        <div className="text-xs text-stone-500">{addr.city} — {addr.pincode}</div>
                        {!addr.isDefault && (
                          <button onClick={(e) => { e.stopPropagation(); handleSetDefault(addr.id) }} className="text-[11px] text-brand-500 mt-1 hover:underline">
                            Set as default
                          </button>
                        )}
                      </div>
                      {selectedAddressId === addr.id && <Check size={16} className="text-brand-500" />}
                    </div>
                  </div>
                ))}
              </div>

              {!showAddAddress ? (
                <button onClick={() => setShowAddAddress(true)} className="btn-ghost mt-3 text-brand-500">
                  <Plus size={15} /> Add new address
                </button>
              ) : (
                <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Label</label>
                      <select className="input" value={newAddress.label} onChange={e => setNewAddress(p => ({ ...p, label: e.target.value }))}>
                        <option>Home</option><option>Office</option><option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Pincode</label>
                      <input className="input" placeholder="231218" maxLength={6} value={newAddress.pincode} onChange={e => setNewAddress(p => ({ ...p, pincode: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">House / Flat / Building</label>
                    <input className="input" placeholder="B-12, Renusagar Colony" value={newAddress.line1} onChange={e => setNewAddress(p => ({ ...p, line1: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Landmark</label>
                      <input className="input" placeholder="Near temple" value={newAddress.line2} onChange={e => setNewAddress(p => ({ ...p, line2: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">City</label>
                      <input className="input" placeholder="Renukoot" value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveAddress} className="btn-primary flex-1 justify-center">Save address</button>
                    <button onClick={() => setShowAddAddress(false)} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {orderType === 'TAKEAWAY' && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Pickup time</div>
              <input
                type="time"
                value={pickupTime}
                min={minPickupTime}
                onChange={e => setPickupTime(e.target.value)}
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5"
              />
              <div className="text-xs text-stone-400 mt-2">Pick a time today, at least 30 minutes from now so we can prepare your order. No delivery charge on takeaway.</div>
            </div>
          )}

          {orderingBanner}
          <button onClick={goToPayment} disabled={!orderingOpen} className="btn-primary w-full justify-center py-3.5 rounded-2xl">
            Continue to payment <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Payment */}
      {step === 1 && (
        <div className="px-4 space-y-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Payment method</div>

            <div className="space-y-3">
              {upiAvailable && (
                <button
                  onClick={() => setPaymentMethod('QR_UPI')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'QR_UPI' ? 'border-brand-500 bg-brand-50' : 'border-stone-100 hover:border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <QrCode size={20} className="text-stone-500" />
                      <div>
                        <div className="text-sm font-medium text-stone-800">Pay via QR / UPI</div>
                        <div className="text-xs text-stone-500">Scan & pay — order confirmed after restaurant verifies</div>
                      </div>
                    </div>
                    {paymentMethod === 'QR_UPI' && <Check size={16} className="text-brand-500" />}
                  </div>
                </button>
              )}

              <button
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'CASH_ON_DELIVERY' ? 'border-brand-500 bg-brand-50' : 'border-stone-100 hover:border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Banknote size={20} className="text-stone-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-800">Cash on delivery</div>
                      <div className="text-xs text-stone-500">Pay when your order arrives</div>
                    </div>
                  </div>
                  {paymentMethod === 'CASH_ON_DELIVERY' && <Check size={16} className="text-brand-500" />}
                </div>
              </button>
            </div>
            {orderingOpen && !upiAvailable && (
              <p className="text-xs text-stone-400 mt-3 text-center">Online payment is unavailable after 10:59 PM — Cash on delivery only.</p>
            )}
          </div>

          {paymentMethod === 'QR_UPI' && (
            <div className="card p-4">
              <div className="text-sm font-semibold text-stone-800 mb-1 text-center">Pay ₹{total.toFixed(0)} via UPI</div>
              <div className="text-xs text-stone-400 mb-4 text-center">Tap your preferred app — amount is pre-filled</div>

              {/* UPI Deep Link Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Google Pay */}
                <a
                  href={`gpay://upi/pay?pa=8299018895@okbizaxis&am=${total.toFixed(2)}&cu=INR`}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-stone-100 hover:border-blue-200 rounded-2xl p-3.5 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.8C34.5 3.5 29.7 1 24 1 14.8 1 7 6.8 3.9 14.9l7 5.4C12.6 14 17.8 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.5c0-1.6-.1-2.8-.4-4H24v7.7h12.5c-.5 2.9-2.2 5.4-4.7 7l7.2 5.6c4.2-3.9 6.6-9.6 6.6-16.3z"/><path fill="#FBBC05" d="M10.9 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7-5.4A23.1 23.1 0 0 0 .9 24c0 3.7.9 7.2 2.4 10.3l7.6-5.7z"/><path fill="#EA4335" d="M24 47c5.7 0 10.5-1.9 14-5.1l-7.2-5.6c-1.9 1.3-4.3 2.1-6.8 2.1-6.2 0-11.4-4.2-13.1-9.8l-7.6 5.7C7 41.2 14.9 47 24 47z"/></svg>
                  <span className="text-sm font-semibold text-stone-700">Google Pay</span>
                </a>

                {/* PhonePe */}
                <a
                  href={`phonepe://pay?pa=8299018895@okbizaxis&am=${total.toFixed(2)}&cu=INR`}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-stone-100 hover:border-purple-200 rounded-2xl p-3.5 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#5f259f"/><path fill="white" d="M31 15h-7l-8 18h5l2-4h8l1 4h5zm-6 10 3-7 1 7z"/></svg>
                  <span className="text-sm font-semibold text-stone-700">PhonePe</span>
                </a>

                {/* Paytm */}
                <a
                  href={`paytmmp://pay?pa=8299018895@okbizaxis&am=${total.toFixed(2)}&cu=INR`}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-stone-100 hover:border-sky-200 rounded-2xl p-3.5 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#00BAF2"/><text x="7" y="32" fontSize="18" fontWeight="bold" fill="white">Pa</text><text x="24" y="32" fontSize="18" fontWeight="bold" fill="#012970">ytm</text></svg>
                  <span className="text-sm font-semibold text-stone-700">Paytm</span>
                </a>

                {/* CRED */}
                <a
                  href={`credpay://upi/pay?pa=8299018895@okbizaxis&am=${total.toFixed(2)}&cu=INR`}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-stone-100 hover:border-stone-300 rounded-2xl p-3.5 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#0B0B0B"/><text x="9" y="31" fontSize="15" fontWeight="bold" fill="white">CRED</text></svg>
                  <span className="text-sm font-semibold text-stone-700">CRED</span>
                </a>

                {/* BHIM / Any UPI */}
                <a
                  href={`upi://pay?pa=8299018895@okbizaxis&am=${total.toFixed(2)}&cu=INR`}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-stone-100 hover:border-orange-200 rounded-2xl p-3.5 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#FF6B00"/><text x="8" y="30" fontSize="14" fontWeight="bold" fill="white">BHIM</text></svg>
                  <span className="text-sm font-semibold text-stone-700">BHIM / UPI</span>
                </a>
              </div>

              {/* UPI ID as fallback */}
              <div className="bg-stone-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-stone-400">UPI ID (manual)</div>
                  <div className="text-sm font-mono font-semibold text-stone-800">8299018895@okbizaxis</div>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText('8299018895@okbizaxis'); toast.success('UPI ID copied!'); }}
                  className="text-xs text-brand-500 font-medium bg-brand-50 px-3 py-1.5 rounded-lg"
                >
                  Copy
                </button>
              </div>

              <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-xl p-2.5 text-center">
                After paying, tap <strong>"Place order"</strong> below and then <strong>"I've paid"</strong>
              </div>
            </div>
          )}

          {orderingBanner}
          <button
            onClick={openConfirm}
            disabled={confirming || !orderingOpen}
            className="btn-primary w-full justify-center py-3.5 rounded-2xl"
          >
            {confirming ? 'Placing order…' : `Place order · ₹${total.toFixed(0)}`}
          </button>
          <button onClick={() => setStep(0)} className="btn-ghost w-full justify-center text-stone-500">
            ← Back
          </button>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <div className="px-4 py-4 space-y-3">

          {/* Order reference */}
          <div className="card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-stone-400">Order reference</div>
              <div className="font-mono font-semibold text-stone-800 text-sm">#{placedOrder?.id?.substring(0,8).toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-400">Amount</div>
              <div className="font-bold text-brand-600">₹{paidTotal.toFixed(0)}</div>
            </div>
          </div>

          {/* COD flow */}
          {paymentMethod === 'CASH_ON_DELIVERY' && (
            <>
              <div className="card p-5 text-center">
                <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-stone-900 mb-1">Order placed!</h3>
                <p className="text-sm text-stone-500">
                  {placedSnapshot?.orderType === 'TAKEAWAY' ? `Pay ₹${paidTotal.toFixed(0)} cash at pickup.` : `Pay ₹${paidTotal.toFixed(0)} cash when your order arrives.`}
                </p>
                {placedSnapshot?.orderType === 'TAKEAWAY' && placedSnapshot?.pickupAt && (
                  <div className="mt-2 text-sm font-semibold text-brand-600">Pickup at {formatIST(placedSnapshot.pickupAt, 'dd MMM, h:mm a')}</div>
                )}
                <div className="mt-2 text-[11px] text-stone-400">Note: once placed, an order cannot be cancelled or refunded.</div>
              </div>

              {/* Live status — auto-refreshes every 3s as the restaurant updates the order */}
              <div className="card p-4">
                <LiveOrderTracker orderId={placedOrder?.id} pollMs={3000} />
              </div>

              {/* Prominent WhatsApp send */}
              <button onClick={handleWhatsApp} className="w-full justify-center py-4 rounded-2xl text-white font-semibold flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm">
                <MessageCircle size={18} /> Send order to restaurant on WhatsApp
              </button>
              <div className="text-xs text-stone-400 text-center -mt-1">Opens a WhatsApp chat with the restaurant (+{RESTAURANT.kotWhatsApp}), order pre-filled. We'll ask first.</div>

              {/* Full order details */}
              {placedSnapshot && (
                <div className="card p-4">
                  <div className="text-xs font-semibold text-stone-400 uppercase mb-1">Order details</div>
                  <div className="text-xs text-stone-400 mb-2">{placedSnapshot.dateStr} · {placedSnapshot.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'} · Cash</div>
                  <div className="space-y-1.5">
                    {placedSnapshot.items.map((it, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex justify-between"><span className="text-stone-700">{it.name} × {it.quantity}</span><span className="font-medium">₹{(it.price * it.quantity).toFixed(0)}</span></div>
                        {it.note && <div className="text-xs text-amber-600 italic pl-1">↳ {it.note}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-stone-100 mt-3 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>₹{placedSnapshot.subtotal.toFixed(0)}</span></div>
                    <div className="flex justify-between text-stone-500"><span>GST (5%)</span><span>₹{placedSnapshot.gst}</span></div>
                    <div className="flex justify-between text-stone-500"><span>Delivery fee</span><span>{placedSnapshot.deliveryFee > 0 ? `₹${placedSnapshot.deliveryFee}` : 'Free'}</span></div>
                    <div className="flex justify-between font-semibold text-stone-900 pt-1"><span>Total</span><span>₹{placedSnapshot.total.toFixed(0)}</span></div>
                  </div>
                  {placedSnapshot.orderType === 'TAKEAWAY' && placedSnapshot.pickupAt && <div className="mt-3 text-xs text-stone-500"><span className="text-stone-400">Pickup at: </span>{formatIST(placedSnapshot.pickupAt, 'dd MMM, h:mm a')}</div>}
                  {placedSnapshot.address && <div className="mt-3 text-xs text-stone-500"><span className="text-stone-400">Deliver to: </span>{placedSnapshot.address}</div>}
                  {(placedSnapshot.name || placedSnapshot.phone) && <div className="text-xs text-stone-500 mt-0.5">{placedSnapshot.name}{placedSnapshot.phone ? ` · ${placedSnapshot.phone}` : ''}</div>}
                </div>
              )}

              <PayAheadQR amount={paidTotal} />

              <button onClick={() => navigate('/orders')} className="btn-secondary w-full justify-center">View my orders</button>
            </>
          )}

          {/* UPI flow */}
          {paymentMethod === 'QR_UPI' && (
            <>
              {/* STEP A: Payment pending */}
              {paymentState !== 'paid' && (
                <div className="card p-5">
                  {paymentState === 'failed' ? (
                    <div className="text-center mb-4">
                      <XCircle size={40} className="text-red-500 mx-auto mb-2" />
                      <h3 className="font-semibold text-stone-900">Payment failed or cancelled</h3>
                      <p className="text-xs text-stone-500 mt-1">Please try again or cancel your order</p>
                    </div>
                  ) : (
                    <div className="text-center mb-4">
                      <Clock size={40} className="text-amber-500 mx-auto mb-2" />
                      <h3 className="font-semibold text-stone-900">Complete your payment</h3>
                      <p className="text-xs text-stone-500 mt-1">Tap a button to open your UPI app with amount pre-filled</p>
                    </div>
                  )}

                  {/* UPI app buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { name: 'Google Pay', scheme: 'gpay', path: 'pay', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                      { name: 'PhonePe', scheme: 'phonepe', path: 'pay', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                      { name: 'Paytm', scheme: 'paytmmp', path: 'pay', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
                      { name: 'CRED', scheme: 'credpay', path: 'upi/pay', bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-300' },
                      { name: 'BHIM / UPI', scheme: 'upi', path: 'pay', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                    ].map(app => (
                      <a
                        key={app.scheme}
                        href={`${app.scheme}://${app.path}?pa=8299018895@okbizaxis&am=${paidTotal.toFixed(2)}&cu=INR`}
                        onClick={() => setPaymentState('attempted')}
                        className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${app.bg} ${app.text} border ${app.border} rounded-xl py-3 transition-all active:scale-95`}
                      >{app.name}</a>
                    ))}
                  </div>

                  {/* Manual UPI ID */}
                  <div className="bg-stone-50 rounded-xl p-2.5 flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-stone-600">8299018895@okbizaxis</span>
                    <button
                      onClick={() => { navigator.clipboard?.writeText('8299018895@okbizaxis'); toast.success('Copied!'); }}
                      className="text-xs text-brand-500 font-medium"
                    >Copy ID</button>
                  </div>

                  {/* After paying - confirm or report failure */}
                  {paymentState === 'attempted' && (
                    <div className="border-t border-stone-100 pt-3 space-y-2">
                      <p className="text-xs text-center text-stone-500">Did your payment go through?</p>
                      <button
                        onClick={handleIvePaid}
                        disabled={notifying}
                        className="btn-primary w-full justify-center py-3 rounded-xl"
                      >
                        {notifying ? 'Confirming…' : '✓ Yes, payment successful'}
                      </button>
                      <button
                        onClick={() => setPaymentState('failed')}
                        className="w-full text-center text-xs text-red-500 py-2"
                      >
                        ✗ No, payment failed / cancelled
                      </button>
                    </div>
                  )}

                  {paymentState === 'failed' && (
                    <div className="border-t border-stone-100 pt-3 space-y-2">
                      <button
                        onClick={() => setPaymentState('idle')}
                        className="btn-primary w-full justify-center py-3 rounded-xl"
                      >
                        <RefreshCw size={15} /> Retry payment
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await ordersApi.cancelOrder(placedOrder.id)
                            toast.success('Order cancelled')
                            navigate('/')
                          } catch { toast.error('Could not cancel — contact restaurant') }
                        }}
                        className="w-full text-center text-xs text-red-500 py-2"
                      >
                        Cancel this order
                      </button>
                    </div>
                  )}

                  {paymentState === 'idle' && (
                    <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-xl p-2">
                      After paying, confirm below so we can prepare your order
                    </p>
                  )}
                </div>
              )}

              {/* STEP B: Payment confirmed — live order tracking */}
              {paymentState === 'paid' && (
                <div className="card p-5">
                  <LiveOrderTracker orderId={placedOrder?.id} pollMs={3000} />
                </div>
              )}
            </>
          )}

          {/* Navigate to orders */}
          <button onClick={() => navigate('/orders')} className="btn-secondary w-full justify-center">
            View all my orders
          </button>
          <button onClick={() => navigate('/')} className="btn-ghost w-full justify-center text-stone-500 text-sm">
            Back to menu
          </button>
        </div>
      )}
    </CustomerLayout>
  )
}
