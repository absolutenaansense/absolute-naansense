import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

const UPI_ID = '8299018895@okbizaxis'

const UPI_APPS = [
  { name: 'Google Pay', scheme: 'gpay',    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  { name: 'PhonePe',     scheme: 'phonepe', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { name: 'Paytm',       scheme: 'paytmmp', bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  { name: 'BHIM / UPI',  scheme: 'upi',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
]

// Optional "pay ahead" UPI section for COD orders: scan the QR or tap a UPI
// app to pay the order amount online instead of waiting for cash on delivery.
export default function PayAheadQR({ amount }) {
  const amt = parseFloat(amount || 0).toFixed(2)
  const link = (scheme) => `${scheme}://pay?pa=${UPI_ID}&am=${amt}&cu=INR`

  return (
    <div className="card p-4">
      <div className="text-center mb-3">
        <div className="text-sm font-semibold text-stone-800">Pay ahead (optional)</div>
        <div className="text-xs text-stone-400">Scan or tap to pay ₹{parseFloat(amount || 0).toFixed(0)} now — or just pay cash on delivery</div>
      </div>

      <div className="flex justify-center mb-3">
        <div className="bg-white p-3 rounded-2xl border border-stone-100">
          <QRCodeSVG value={link('upi')} size={184} level="M" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {UPI_APPS.map(app => (
          <a
            key={app.scheme}
            href={link(app.scheme)}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${app.bg} ${app.text} border ${app.border} rounded-xl py-3 transition-all active:scale-95`}
          >
            {app.name}
          </a>
        ))}
      </div>

      <div className="bg-stone-50 rounded-xl p-2.5 flex items-center justify-between">
        <span className="text-xs font-mono text-stone-600">{UPI_ID}</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(UPI_ID); toast.success('UPI ID copied!') }}
          className="text-xs text-brand-500 font-medium bg-brand-50 px-3 py-1.5 rounded-lg"
        >
          Copy
        </button>
      </div>
    </div>
  )
}
