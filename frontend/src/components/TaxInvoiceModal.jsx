import { X, Printer } from 'lucide-react'
import { formatIST } from '../utils/dateIST'
import { getOrderMeta } from '../utils/orderNotes'
import { printBill } from '../utils/printKot'
import { RESTAURANT, CGST_RATE, SGST_RATE } from '../config/restaurant'

const nameOf = (it) => it.menuItem?.name || it.itemName || ''

// On-screen tax invoice. Customer side is view-only; admin side passes
// `printable` to show a Print button (which generates the printable bill).
export default function TaxInvoiceModal({ order, onClose, printable = false }) {
  if (!order) return null

  const meta = getOrderMeta(order)
  const items = order.items || []
  const type = (meta.type || '').toUpperCase()
  const heading = type === 'DINE_IN' ? `Dine In: ${meta.table || ''}` : (type === 'TAKEAWAY' ? 'Take Away' : 'Delivery')
  // Online orders don't set customerName/Phone — fall back to the linked user.
  const custName = meta.name || order.user?.name || ''
  const custPhone = meta.phone || order.user?.phone || ''
  const cancelled = order.status === 'cancelled'
  const displayedAt = formatIST(new Date().toISOString(), 'dd MMM yyyy, h:mm:ss a')

  const subtotal = items.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0)
  const comp = !!order.isComplimentary
  const discount = comp ? subtotal : Math.min(parseFloat(order.discount || 0), subtotal)
  const taxable = Math.max(0, subtotal - discount)
  const cgst = comp ? 0 : taxable * CGST_RATE
  const sgst = comp ? 0 : taxable * SGST_RATE
  const grand = comp ? 0 : (order.total != null ? parseFloat(order.total) : Math.round(taxable + cgst + sgst))
  const roundOff = grand - (taxable + cgst + sgst)
  const totalQty = items.reduce((s, it) => s + it.quantity, 0)

  const paid = comp ? 'Complimentary'
    : (order.paymentMethod === 'SPLIT' && Array.isArray(order.payments))
      ? 'Split — ' + order.payments.map(p => `${p.method} ₹${Number(p.amount).toFixed(0)}`).join(', ')
      : (order.paymentMethod === 'QR_UPI' ? 'UPI / Prepaid' : 'Cash')

  const money = (n) => n.toFixed(2)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <span className="font-semibold text-stone-900">Tax invoice</span>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        {/* Receipt body */}
        <div className="relative overflow-y-auto px-5 py-4 font-mono text-[13px] text-stone-800 leading-relaxed">
          {cancelled && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
              <span className="text-red-600/70 font-extrabold tracking-widest border-4 border-red-600/70 rounded px-4 py-1 text-3xl -rotate-45 select-none">
                CANCELLED
              </span>
            </div>
          )}
          <div className="text-center">
            <div className="text-base font-bold">{RESTAURANT.name}</div>
            <div className="text-xs">{RESTAURANT.address}</div>
            <div className="text-xs">GSTIN No - {RESTAURANT.gstin}</div>
            <div className="text-xs">FSSAI Lic No - {RESTAURANT.fssai}</div>
            <div className="text-xs">Mobile - {RESTAURANT.mobile}</div>
          </div>

          <div className="border-t border-dashed border-stone-300 my-2" />
          <div className="text-center font-bold tracking-wider">TAX INVOICE</div>
          <div className="border-t border-dashed border-stone-300 my-2" />

          <div className="text-stone-500">Displayed on {displayedAt} IST</div>
          <div>Name: {custName}</div>
          {custPhone && <div>Phone: {custPhone}</div>}
          {meta.address && <div>Address: {meta.address}</div>}
          <div className="flex justify-between">
            <span>Date: {formatIST(order.createdAt || new Date().toISOString(), 'dd/MM/yy HH:mm')}</span>
            <span>{heading}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier: {RESTAURANT.cashier}</span>
            <span>Bill No.: {order.billNo ?? '-'}</span>
          </div>

          <div className="border-t border-dashed border-stone-300 my-2" />

          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="font-semibold">No.</th>
                <th className="font-semibold">Item</th>
                <th className="font-semibold text-right">Qty</th>
                <th className="font-semibold text-right">Price</th>
                <th className="font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id || i} className="align-top">
                  <td>{i + 1}</td>
                  <td className="pr-1 break-words">{nameOf(it)}</td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">{money(parseFloat(it.price))}</td>
                  <td className="text-right">{money(parseFloat(it.price) * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-stone-300 my-2" />

          <div className="flex justify-between"><span>Total Qty: {totalQty}</span><span>Sub Total&nbsp;&nbsp;{money(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between"><span /><span>Discount&nbsp;&nbsp;-{money(discount)}</span></div>}
          <div className="flex justify-between"><span /><span>CGST 2.5%&nbsp;&nbsp;{money(cgst)}</span></div>
          <div className="flex justify-between"><span /><span>SGST 2.5%&nbsp;&nbsp;{money(sgst)}</span></div>
          <div className="flex justify-between"><span /><span>Round off&nbsp;&nbsp;{roundOff >= 0 ? '+' : ''}{money(roundOff)}</span></div>

          <div className="border-t border-dashed border-stone-300 my-2" />
          <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span>₹ {grand.toFixed(2)}</span></div>
          <div className="border-t border-dashed border-stone-300 my-2" />

          <div>Paid via {paid}</div>
          {cancelled && <div className="text-red-600 font-bold">Status: CANCELLED</div>}
          <div className="border-t border-dashed border-stone-300 my-2" />
          <div className="text-center">{RESTAURANT.footer}</div>
        </div>

        <div className="px-4 py-3 border-t border-stone-100 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Close</button>
          {printable && (
            <button onClick={() => printBill(order)} className="btn-primary flex-1 justify-center">
              <Printer size={16} /> Print
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
