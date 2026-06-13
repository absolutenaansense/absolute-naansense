// Shared helpers for the PetPooja POS integration.
//
// IMPORTANT: PetPooja hands you the exact Save Order payload schema, endpoint
// URLs, and status callback codes during integration onboarding. The structure
// below follows PetPooja's documented "Save Order" online-ordering format, but
// every spot marked `// TODO(petpooja)` must be reconciled with the doc/credentials
// they send you. Field names occasionally differ by integration version.

export interface OrderRow {
  id: string
  total: string | number
  notes: string | null
  paymentMethod: string | null
  type?: string | null
  createdAt: string
  petpoojaOrderId?: string | null
  user?: { name?: string; phone?: string; email?: string } | null
  address?: {
    line1?: string; line2?: string; city?: string; pincode?: string
  } | null
  items?: Array<{
    quantity: number
    price: string | number
    menuItem?: { name?: string; petpoojaItemId?: string | null } | null
  }>
}

export interface PetpoojaEnv {
  appKey: string
  appSecret: string
  accessToken: string
  restID: string
  callbackUrl: string
}

// Build the PetPooja "Save Order" payload that generates the KOT.
// See: https://onlineorderingapisv210.docs.apiary.io/
export function buildSaveOrderPayload(order: OrderRow, env: PetpoojaEnv) {
  const items = (order.items ?? []).map((it) => ({
    // TODO(petpooja): `id` MUST be the PetPooja item id, not our menu id.
    id: it.menuItem?.petpoojaItemId ?? '',
    name: it.menuItem?.name ?? '',
    price: Number(it.price).toFixed(2),
    final_price: (Number(it.price) * it.quantity).toFixed(2),
    quantity: String(it.quantity),
    gst_liability: 'vendor',
    item_tax: [],
    item_discount: '0',
    description: '',
    variation_name: '',
    variation_id: '',
    AddonItem: { details: [] },
  }))

  const address = order.address
    ? `${order.address.line1 ?? ''} ${order.address.line2 ?? ''}, ${order.address.city ?? ''} - ${order.address.pincode ?? ''}`.trim()
    : ''

  return {
    app_key: env.appKey,
    app_secret: env.appSecret,
    access_token: env.accessToken,
    orderinfo: {
      OrderInfo: {
        Restaurant: { details: { restID: env.restID } },
        Customer: {
          details: {
            email: order.user?.email ?? '',
            name: order.user?.name ?? 'Customer',
            address,
            phone: order.user?.phone ?? '',
            latitude: '',
            longitude: '',
          },
        },
        Order: {
          details: {
            orderID: order.id,
            // TODO(petpooja): confirm accepted values, e.g. 'H'=delivery, 'P'=pickup, 'D'=dine-in
            order_type: order.type === 'DELIVERY' ? 'H' : 'D',
            // TODO(petpooja): 'COD' / 'now' / gateway name as per their doc
            payment_type: order.paymentMethod === 'QR_UPI' ? 'ONLINE' : 'COD',
            // 1 = collect cash on delivery (COD), 0 = already paid
            collect_cash: order.paymentMethod === 'QR_UPI' ? '0' : '1',
            table_no: '',
            no_of_persons: '0',
            discount_total: '0',
            tax_total: '0',
            delivery_charges: '0',
            packing_charges: '0',
            service_charge: '0',
            total: Number(order.total).toFixed(2),
            description: order.notes ?? '',
            created_on: order.createdAt,
            enable_delivery: order.type === 'DELIVERY' ? '1' : '0',
            min_prep_time: '20',
            // PetPooja POSTs status updates back to this URL.
            callback_url: env.callbackUrl,
          },
        },
        OrderItem: { details: items },
        Tax: { details: [] },
        Discount: { details: [] },
      },
      udid: '',
      device_type: 'Web',
    },
  }
}

// Map a PetPooja status callback value to our internal Order.status.
// Returns null for statuses we don't act on.
//
// TODO(petpooja): VERIFY these against your onboarding doc — PetPooja sends
// either status strings or numeric codes depending on integration version.
export function mapPetpoojaStatus(raw: string | number): string | null {
  const s = String(raw).trim().toLowerCase()
  const map: Record<string, string> = {
    // KOT printed / order accepted at the POS -> start preparing
    'accepted': 'preparing',
    'preparing': 'preparing',
    '1': 'preparing',
    // food ready / out the door
    'food ready': 'out_for_delivery',
    'ready': 'out_for_delivery',
    'dispatched': 'out_for_delivery',
    'dispatch': 'out_for_delivery',
    '3': 'out_for_delivery',
    'delivered': 'delivered',
    '5': 'delivered',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    '-1': 'cancelled',
  }
  return map[s] ?? null
}
