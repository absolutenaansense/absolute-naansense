// The two Absolute Naansense outlets. The menu for Renukoot comes from the
// database (admin-managed); Renusagar is served from a static menu file.
export const OUTLETS = [
  {
    id: 'renukoot',
    name: 'Renukoot',
    source: 'db',
    tagline: 'Above SBI RACC, Near Nagar Panchayat',
    phone: '9140875438',
    whatsapp: '919140875438',   // WhatsApp number (country code, no +)
  },
  {
    id: 'renusagar',
    name: 'Renusagar',
    source: 'static',
    tagline: '50Hz Cafeteria — Cafe & Kitchen',
    phone: '9580111016',
    whatsapp: '919580111016',
  },
]

export const getOutlet = (id) => OUTLETS.find(o => o.id === id) || null
