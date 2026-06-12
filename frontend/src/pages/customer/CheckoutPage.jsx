import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, CreditCard, Truck, UtensilsCrossed, QrCode, Banknote, Check, Plus, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { authApi, ordersApi } from '../../services/api'

const DELIVERY_FEE = 40

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
  const [paymentMethod, setPaymentMethod] = useState('QR_UPI')
  const [newAddress, setNewAddress] = useState({ label: 'Home', line1: '', line2: '', city: '', pincode: '' })
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [notifying, setNotifying] = useState(false)

  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, clearCart, getTotal, getOrderItems } = useCartStore()

  const subtotal = getTotal()
  const deliveryFee = orderType === 'DELIVERY' ? DELIVERY_FEE : 0
  const total = subtotal + deliveryFee

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.me().then(r => r.data),
  })

  const addresses = profileData?.user?.addresses || []

  const handleSaveAddress = async () => {
    if (!newAddress.line1 || !newAddress.city || !newAddress.pincode) {
      toast.error('Please fill address, city and pincode')
      return
    }
    try {
      await authApi.addAddress({ ...newAddress, isDefault: addresses.length === 0 })
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
      const { data } = await ordersApi.createOrder({
        items: getOrderItems(),
        addressId: selectedAddressId,
        type: orderType,
        paymentMethod,
        notes: '',
      })
      setPlacedOrder(data.order)
      setStep(2)
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
      toast.success('Restaurant notified! Confirming your order…')
    } catch {
      toast.error('Failed to notify restaurant')
    } finally {
      setNotifying(false)
    }
  }

  if (Object.keys(items).length === 0 && step < 2) {
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
            <div className="space-y-2">
              {Object.values(items).map(({ item, quantity }) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-stone-600">{item.name} × {quantity}</span>
                  <span className="font-medium text-stone-900">₹{(parseFloat(item.price) * quantity).toFixed(0)}</span>
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

            {!user?.isReturning && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-700">
                First-time orders require payment via QR/UPI. Cash on delivery becomes available on your next order.
              </div>
            )}

            <div className="space-y-3">
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

              <button
                onClick={() => user?.isReturning && setPaymentMethod('CASH_ON_DELIVERY')}
                disabled={!user?.isReturning}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'CASH_ON_DELIVERY' ? 'border-brand-500 bg-brand-50' :
                  user?.isReturning ? 'border-stone-100 hover:border-stone-200' : 'border-stone-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Banknote size={20} className="text-stone-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-800">Cash on delivery</div>
                      <div className="text-xs text-stone-500">{user?.isReturning ? 'Pay when your order arrives' : 'Available on your second order onwards'}</div>
                    </div>
                  </div>
                  {paymentMethod === 'CASH_ON_DELIVERY' && <Check size={16} className="text-brand-500" />}
                </div>
              </button>
            </div>
          </div>

          {paymentMethod === 'QR_UPI' && (
            <div className="card p-4 text-center">
              <div className="text-xs text-stone-500 mb-3">Scan to pay ₹{total.toFixed(0)}</div>
              <div className="w-40 h-40 bg-stone-100 rounded-2xl mx-auto flex items-center justify-center mb-3">
                <QrCode size={80} className="text-stone-400" />
              </div>
              <div className="text-sm font-semibold text-stone-900">absolutenaansense@okaxis</div>
              <div className="text-xs text-stone-400 mt-1">After paying, tap "Place order" and then "I've paid"</div>
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
      {step === 2 && placedOrder && (
        <div className="px-4 py-6 space-y-4">
          <div className="card p-6 text-center">
            {paymentMethod === 'QR_UPI' ? (
              <>
                <Clock size={40} className="text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-stone-900 mb-1">Order placed!</h3>
                <p className="text-sm text-stone-500 mb-4">
                  Tap below after paying via UPI/QR so the restaurant can confirm your order.
                </p>
                <button onClick={handleIvePaid} disabled={notifying} className="btn-primary w-full justify-center py-3.5 rounded-2xl">
                  {notifying ? 'Notifying restaurant…' : "I've paid — notify restaurant"}
                  <Check size={16} />
                </button>
              </>
            ) : (
              <>
                <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-stone-900 mb-1">Order confirmed!</h3>
                <p className="text-sm text-stone-500">Your order is being prepared. Pay ₹{total.toFixed(0)} on delivery.</p>
              </>
            )}

            <div className="mt-5 bg-stone-50 rounded-xl p-4 text-left">
              <div className="text-xs text-stone-400 mb-2">Order reference</div>
              <div className="font-mono font-semibold text-stone-800">{placedOrder.orderNumber}</div>
            </div>
          </div>

          <button onClick={() => navigate('/orders')} className="btn-secondary w-full justify-center">
            View my orders
          </button>
          <button onClick={() => navigate('/')} className="btn-ghost w-full justify-center text-stone-500">
            Back to menu
          </button>
        </div>
      )}
    </CustomerLayout>
  )
}
