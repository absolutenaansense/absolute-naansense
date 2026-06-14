import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

// Minimal standalone layout for public legal pages (Terms, Privacy).
// Works whether or not the visitor is signed in.
export default function LegalLayout({ title, updated, children }) {
  const navigate = useNavigate()
  return (
    <div className="customer-theme min-h-screen">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40 safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 p-2">
            <ChevronLeft size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-8 w-8 rounded-full object-cover ring-1 ring-stone-200" />
            <span className="font-semibold text-stone-900">Absolute</span>
            <span className="font-semibold text-brand-500">Naansense</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        {updated && <p className="text-xs text-stone-400 mt-1">Last updated: {updated}</p>}
        <div className="legal-body mt-5 space-y-5 text-sm text-stone-600 leading-relaxed">
          {children}
        </div>

        <div className="mt-8 pt-5 border-t border-stone-100 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <Link to="/contact" className="text-brand-600 font-medium hover:underline">Contact Us</Link>
          <Link to="/terms" className="text-brand-600 font-medium hover:underline">Terms &amp; Conditions</Link>
          <Link to="/refund" className="text-brand-600 font-medium hover:underline">Cancellation &amp; Refund</Link>
          <Link to="/privacy" className="text-brand-600 font-medium hover:underline">Privacy Policy</Link>
        </div>
      </main>
    </div>
  )
}

// Small helpers for consistent section styling.
export function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-stone-800 mb-1.5">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
