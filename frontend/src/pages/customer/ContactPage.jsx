import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import LegalLayout, { Section } from '../../components/customer/LegalLayout'

const ADDRESS = '1ST FLOOR NEAR NAGAR NIGAM OFFICE MALAKAR PLAZA, RENUKOOT VARANASI HIGHWAY, RENUKOOT, SONBHADRA, UTTAR PRADESH, 231217, Renukoot, Uttar Pradesh, PIN: 231217'

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>You may contact us using the information below:</p>

      <Section heading="Merchant Legal entity name">
        <p>ABSOLUTE NAANSENSE</p>
      </Section>

      <Section heading="Registered Address">
        <p>{ADDRESS}</p>
      </Section>

      <Section heading="Operational Address">
        <p>{ADDRESS}</p>
      </Section>

      <Section heading="Telephone No">
        <p><a href="tel:+918299018895" className="text-brand-600 font-medium hover:underline">8299018895</a></p>
      </Section>

      <Section heading="E-Mail ID">
        <p><a href="mailto:naansense.absolute@gmail.com" className="text-brand-600 font-medium hover:underline">naansense.absolute@gmail.com</a></p>
      </Section>

      {/* Quick contact actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <a href="tel:+918299018895" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Phone size={18} className="text-brand-500" /></div>
          <div><div className="text-sm font-semibold text-stone-800">Call us</div><div className="text-xs text-stone-500">+91 82990 18895</div></div>
        </a>
        <a href="https://wa.me/918299018895" target="_blank" rel="noopener noreferrer" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><MessageCircle size={18} className="text-green-600" /></div>
          <div><div className="text-sm font-semibold text-stone-800">WhatsApp</div><div className="text-xs text-stone-500">+91 82990 18895</div></div>
        </a>
        <a href="mailto:naansense.absolute@gmail.com" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center"><Mail size={18} className="text-stone-600" /></div>
          <div><div className="text-sm font-semibold text-stone-800">Email</div><div className="text-xs text-stone-500 break-all">naansense.absolute@gmail.com</div></div>
        </a>
      </div>

      <div className="flex items-start gap-2 text-xs text-stone-400 pt-2">
        <MapPin size={14} className="flex-shrink-0 mt-0.5" />
        <span>Renukoot, Sonbhadra, Uttar Pradesh — 231217</span>
      </div>
    </LegalLayout>
  )
}
