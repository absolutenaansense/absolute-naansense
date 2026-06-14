import { useState } from 'react'
import { Phone, X } from 'lucide-react'
import { OUTLETS } from '../../config/outlets'

const PHONE = '+918299018895'

const WhatsAppIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="#fff" aria-hidden="true">
    <path d="M16.04 4C9.9 4 4.9 9 4.9 15.14c0 2.13.6 4.12 1.63 5.82L4 28l7.2-2.47a11.07 11.07 0 0 0 4.84 1.12h.01c6.14 0 11.14-5 11.14-11.14C27.19 9 22.19 4 16.04 4zm6.5 15.6c-.27.77-1.6 1.48-2.2 1.54-.59.06-1.12.27-3.77-.79-3.2-1.26-5.24-4.5-5.4-4.71-.16-.21-1.3-1.73-1.3-3.3 0-1.58.83-2.35 1.12-2.67.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.27.64.91 2.21.99 2.37.08.16.13.35.02.56-.1.21-.16.35-.32.54-.16.18-.34.41-.48.55-.16.16-.33.34-.14.66.18.32.81 1.34 1.74 2.17 1.2 1.07 2.21 1.4 2.52 1.56.32.16.5.13.69-.08.18-.21.79-.92 1-1.24.21-.32.42-.27.71-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.77-.19 1.54z"/>
  </svg>
)

// Pre-written opening message the customer sends to the chosen outlet.
const waHref = (o) => `https://wa.me/${o.whatsapp}?text=${encodeURIComponent(`Hi, Absolute Naansense, ${o.name} Outlet`)}`

// Always-visible floating Call + WhatsApp buttons for customers. WhatsApp first
// asks which outlet, then opens a chat to that outlet with a pre-filled greeting.
export default function FloatingContact() {
  const [pickOutlet, setPickOutlet] = useState(false)

  return (
    <>
      {/* Outlet chooser for WhatsApp */}
      {pickOutlet && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setPickOutlet(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-stone-900">Chat on WhatsApp</h3>
              <button onClick={() => setPickOutlet(false)} className="p-1 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <p className="text-sm text-stone-500 mb-4">Which outlet would you like to message?</p>
            <div className="space-y-2.5">
              {OUTLETS.map(o => (
                <a
                  key={o.id}
                  href={waHref(o)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setPickOutlet(false)}
                  className="flex items-center gap-3 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl p-3 transition-all"
                >
                  <span className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0"><WhatsAppIcon size={18} /></span>
                  <span className="text-sm font-semibold text-stone-800">{o.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed right-4 bottom-24 z-40 flex flex-col gap-3 print:hidden">
        <button
          onClick={() => setPickOutlet(true)}
          aria-label="Chat on WhatsApp"
          className="w-12 h-12 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <WhatsAppIcon />
        </button>
        <a
          href={`tel:${PHONE}`}
          aria-label="Call us"
          className="w-12 h-12 rounded-full bg-brand-500 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Phone size={22} className="text-white" />
        </a>
      </div>
    </>
  )
}
