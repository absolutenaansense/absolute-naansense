const axios = require('axios');
const logger = require('../utils/logger');

const PETPOOJA_API_URL = process.env.PETPOOJA_API_URL || 'https://api.petpooja.com/v2';

/**
 * Push a confirmed order to PetPooja as a KOT.
 * PetPooja API docs: https://api.petpooja.com/docs
 *
 * The order object must include:
 *   - order.orderNumber
 *   - order.type (DELIVERY | DINE_IN)
 *   - order.items[].menuItem.name, .quantity, .unitPrice
 *   - order.user.name, .phone
 *   - order.address (optional, for delivery)
 */
async function createOrder(order) {
  const payload = {
    app_key: process.env.PETPOOJA_APP_KEY,
    app_secret: process.env.PETPOOJA_APP_SECRET,
    access_token: process.env.PETPOOJA_ACCESS_TOKEN,
    restaurant_id: process.env.PETPOOJA_RESTAURANT_ID,

    // Order details
    order: {
      order_type: order.type === 'DELIVERY' ? 'delivery' : 'dinein',
      order_id: order.orderNumber,
      customer_name: order.user.name,
      customer_phone: order.user.phone,
      delivery_address: order.address
        ? `${order.address.line1}, ${order.address.line2 || ''}, ${order.address.city} - ${order.address.pincode}`.trim()
        : null,

      items: order.items.map(item => ({
        item_name: item.menuItem.name,
        item_qty: item.quantity,
        item_price: parseFloat(item.unitPrice),
        item_total: parseFloat(item.subtotal),
        // Map your menu item IDs to PetPooja item IDs here if configured
        // petpooja_item_id: item.menuItem.petpoojaItemId,
      })),

      subtotal: parseFloat(order.subtotal),
      delivery_charges: parseFloat(order.deliveryFee),
      total: parseFloat(order.total),
      payment_mode: order.paymentMethod === 'QR_UPI' ? 'online' : 'cash',
      notes: order.notes || '',
    },
  };

  try {
    const response = await axios.post(`${PETPOOJA_API_URL}/create-order`, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data && response.data.status === 1) {
      logger.info(`PetPooja KOT created: ${response.data.order_id} for ${order.orderNumber}`);
      return { success: true, petpoojaOrderId: response.data.order_id };
    } else {
      logger.warn(`PetPooja KOT failed for ${order.orderNumber}: ${JSON.stringify(response.data)}`);
      return { success: false, petpoojaOrderId: null, error: response.data?.message };
    }
  } catch (err) {
    logger.error(`PetPooja API error for ${order.orderNumber}: ${err.message}`);
    // Don't throw — KOT failure shouldn't break the confirm flow
    // Admin will see KOT status in the dashboard
    return { success: false, petpoojaOrderId: null, error: err.message };
  }
}

/**
 * GET /api/petpooja/menu — sync PetPooja menu to local DB (optional)
 * Useful for initial setup or keeping prices in sync.
 */
async function fetchPetpoojaMenu() {
  const payload = {
    app_key: process.env.PETPOOJA_APP_KEY,
    app_secret: process.env.PETPOOJA_APP_SECRET,
    access_token: process.env.PETPOOJA_ACCESS_TOKEN,
    restaurant_id: process.env.PETPOOJA_RESTAURANT_ID,
  };

  const response = await axios.post(`${PETPOOJA_API_URL}/get-menu`, payload, { timeout: 15000 });
  return response.data;
}

module.exports = { createOrder, fetchPetpoojaMenu };
