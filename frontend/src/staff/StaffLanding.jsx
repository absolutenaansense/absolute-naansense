import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Store, ChevronRight, ConciergeBell } from 'lucide-react'

const MANAGEMENT = [
  { to: '/super_admin', label: 'Super Admin', desc: 'All outlets · reports & monitoring', icon: Shield },
  { to: '/renukoot_biller', label: 'Renukoot Biller', desc: 'Billing & online orders · Renukoot', icon: Store },
  { to: '/renusagar_biller', label: 'Renusagar Biller', desc: 'Billing & online orders · Renusagar', icon: Store },
]
const STAFF = [
  { to: '/renukoot_captain', label: 'Renukoot Captain', desc: 'Tableside ordering · Renukoot', icon: ConciergeBell },
  { to: '/renusagar_captain', label: 'Renusagar Captain', desc: 'Tableside ordering · Renusagar', icon: ConciergeBell },
]

// Landing page for absolutenaansense.in — choose between management panels and
// the (upcoming) staff section.
export default function StaffLanding() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('management')

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Absolute Naansense" className="h-24 w-24 rounded-full object-cover mx-auto mb-4 ring-2 ring-stone-700" />
          <h1 className="text-2xl font-semibold text-white">Welcome to Absolute Naansense</h1>
          <p className="text-stone-400 text-sm mt-1">Choose where you'd like to go.</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-stone-800 p-1 rounded-2xl mb-5">
          {[['management', 'Restaurant Management'], ['staff', 'Staff Section']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === k ? 'bg-brand-500 text-white' : 'text-stone-300 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(
          <div className="space-y-3">
            {(tab === 'management' ? MANAGEMENT : STAFF).map(({ to, label, desc, icon: Icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-2xl p-4 text-left transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold">{label}</div>
                  <div className="text-stone-400 text-xs truncate">{desc}</div>
                </div>
                <ChevronRight size={18} className="text-stone-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
