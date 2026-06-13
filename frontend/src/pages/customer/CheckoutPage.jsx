import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Truck, UtensilsCrossed, QrCode, Banknote, Check, Plus, Minus, Trash2, ChevronRight, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomerLayout from '../../components/customer/CustomerLayout'
import LiveOrderTracker from '../../components/customer/LiveOrderTracker'
import PayAheadQR from '../../components/customer/PayAheadQR'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { addressApi, ordersApi } from '../../services/api'

const DELIVERY_FEE = 50 // charged on delivery orders below FREE_DELIVERY_THRESHOLD
const FREE_DELIVERY_THRESHOLD = 501 // orders >= this amount get free delivery
const GST_RATE = 0.05 // 5% GST applied to every order's subtotal
const UPI_ENABLED = false // UPI temporarily disabled — set to true to re-enable online payment

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
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(UPI_ENABLED ? 'QR_UPI' : 'CASH_ON_DELIVERY')
  const [newAddress, setNewAddress] = useState({ label: 'Home', line1: '', line2: '', city: '', pincode: '' })
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [paidTotal, setPaidTotal] = useState(0)
  const [orderComplete, setOrderComplete] = useState(false)
  const [paymentState, setPaymentState] = useState('idle') // idle | attempted | paid | failed
  const [liveStatus, setLiveStatus] = useState(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { items, addItem, removeItem, deleteItem, setItemNote, clearCart, getTotal, getOrderItems } = useCartStore()

  const subtotal = getTotal()
  const deliveryFee = orderType === 'DELIVERY' && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0
  const gst = Math.round(subtotal * GST_RATE)
  const total = subtotal + deliveryFee + gst

  const { data: addresses = [], refetch: refetchProfile } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => addressApi.getAddresses(user?.id).then(r => r.data),
    enabled: !!user?.id,
  })

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

  const handlePlaceOrder = async () => {
    if (orderType === 'DELIVERY' && !selectedAddressId) {
      toast.error('Please select a delivery address')
      return
    }
    setConfirming(true)
    try {
      const orderItems = getOrderItems()
      const selectedAddress = addresses.find(a => a.id === selectedAddressId)
      const addressText = selectedAddress
        ? `${selectedAddress.line1}${selectedAddress.line2 ? ', ' + selectedAddress.line2 : ''}, ${selectedAddress.city} - ${selectedAddress.pincode}`
        : null
      const { data } = await ordersApi.createOrder({
        userId: user.id,
        items: orderItems,
        paymentMethod,
        total,
        orderType,
        deliveryAddress: addressText,
      })
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

  if (Object.keys(items).length === 0 && !orderComplete) {
    navigate('/')
    return null
  }

  return (
    <CustomerLayout showBack title="Checkout">
      <StepBar current={step} />

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
                <span>Delivery fee</span><span>{deliveryFee > 0 ? `₹${deliveryFee}` : 'Free'}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-500">
                <span>GST (5%)</span><span>₹{gst}</span>
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
                { value: 'DINE_IN', icon: UtensilsCrossed, label: 'Dine-in' },
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

          {orderType === 'DELIVERY' && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Delivery address</div>
              <div className="space-y-2">
                {addresses.map(addr => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50' : 'border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-stone-800">{addr.label}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>
                        <div className="text-xs text-stone-500">{addr.city} — {addr.pincode}</div>
                      </div>
                      {selectedAddressId === addr.id && <Check size={16} className="text-brand-500" />}
                    </div>
                  </button>
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

          {orderType === 'DINE_IN' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
              <MapPin size={15} className="inline mr-1" />
              For dine-in, your order will be prepared when you arrive. You can book a table under "Reservations".
            </div>
          )}

          <button onClick={() => setStep(1)} className="btn-primary w-full justify-center py-3.5 rounded-2xl">
            Continue to payment <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Payment */}
      {step === 1 && (
        <div className="px-4 space-y-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Payment method</div>

            {UPI_ENABLED && !user?.isReturning && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-700">
                First-time orders require payment via QR/UPI. Cash on delivery becomes available on your next order.
              </div>
            )}

            <div className="space-y-3">
              {UPI_ENABLED && (
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
                onClick={() => (UPI_ENABLED ? user?.isReturning : true) && setPaymentMethod('CASH_ON_DELIVERY')}
                disabled={UPI_ENABLED && !user?.isReturning}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'CASH_ON_DELIVERY' ? 'border-brand-500 bg-brand-50' :
                  (!UPI_ENABLED || user?.isReturning) ? 'border-stone-100 hover:border-stone-200' : 'border-stone-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Banknote size={20} className="text-stone-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-800">Cash on delivery</div>
                      <div className="text-xs text-stone-500">{(!UPI_ENABLED || user?.isReturning) ? 'Pay when your order arrives' : 'Available on your second order onwards'}</div>
                    </div>
                  </div>
                  {paymentMethod === 'CASH_ON_DELIVERY' && <Check size={16} className="text-brand-500" />}
                </div>
              </button>
            </div>
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

          <button
            onClick={handlePlaceOrder}
            disabled={confirming}
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
                <p className="text-sm text-stone-500">Pay ₹{paidTotal.toFixed(0)} cash when your order arrives.</p>
                <div className="mt-4 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                  Waiting for restaurant to confirm your order…
                </div>
              </div>
              <PayAheadQR amount={paidTotal} />
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
                      { name: 'Google Pay', scheme: 'gpay', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                      { name: 'PhonePe', scheme: 'phonepe', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                      { name: 'Paytm', scheme: 'paytmmp', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
                      { name: 'BHIM / UPI', scheme: 'upi', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                    ].map(app => (
                      <a
                        key={app.scheme}
                        href={`${app.scheme}://pay?pa=8299018895@okbizaxis&am=${paidTotal.toFixed(2)}&cu=INR`}
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
                  <LiveOrderTracker orderId={placedOrder?.id} />
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
