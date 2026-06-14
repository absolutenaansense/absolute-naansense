// Static restaurant details for printed bills / invoices. Each outlet has its
// own legal name, address, GSTIN and FSSAI licence — pick with restaurantFor().
export const RESTAURANTS = {
  renukoot: {
    name: 'ABSOLUTE NAANSENSE',
    address: '1st Floor, Above SBI RACC, Near Nagar Panchayat, Renukoot, Sonebhadra -231217',
    gstin: '09ABZFA3822G1Z3',
    fssai: '12723043000014',
    mobile: '9140875438',
    cashier: 'biller',
    footer: 'Waiting to Serve Your Taste Buds Again :)',
    kotWhatsApp: '918299018895',  // KOTs are sent here on WhatsApp (country code, no +)
  },
  renusagar: {
    name: 'Absolute Naansense @50 Hz Cafeteria',
    address: 'Hindalco Renupower Colony, Renusagar Power Division, Renusagar, Sonebhadra',
    gstin: '09ACLFA4131B1ZT',
    fssai: '12725043000041',
    mobile: '9580111016',
    cashier: 'biller',
    footer: 'Waiting to Serve Your Taste Buds Again :)',
    kotWhatsApp: '918299018895',
  },
}

// Resolve the billing block for an outlet ('renukoot' | 'renusagar'),
// defaulting to Renukoot for legacy/POS orders with no outlet tag.
export const restaurantFor = (outlet) => RESTAURANTS[outlet] || RESTAURANTS.renukoot

// Default restaurant block (Renukoot) — kept for the many call sites that
// reference a single outlet (WhatsApp number, legal pages, etc.).
export const RESTAURANT = RESTAURANTS.renukoot

export const GST_RATE = 0.05      // total GST
export const CGST_RATE = 0.025    // split halves
export const SGST_RATE = 0.025
