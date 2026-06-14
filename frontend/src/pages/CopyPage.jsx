import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Lightweight, public, no-login page used by the order-notification email's
// "Copy order details" button. The details are passed in the URL hash (so they
// never hit the server), decoded here, and copied to the clipboard in one tap.
export default function CopyPage() {
  const text = (() => { try { return decodeURIComponent((window.location.hash || '').slice(1)) } catch { return '' } })()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(text) }
    catch {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      ta.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-lg font-semibold text-stone-900 mb-3">Order details</h1>
        {text ? (
          <>
            <button onClick={copy} className="btn-primary w-full justify-center py-3 rounded-xl mb-3">
              {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy order details</>}
            </button>
            <pre className="whitespace-pre-wrap bg-white border border-stone-200 rounded-xl p-4 text-sm text-stone-700 select-all">{text}</pre>
          </>
        ) : (
          <div className="text-stone-400 text-sm">No order details in this link.</div>
        )}
      </div>
    </div>
  )
}
