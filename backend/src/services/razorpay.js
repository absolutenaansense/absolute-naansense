const Razorpay = require('razorpay');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createOrder(amount, receiptId) {
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: receiptId,
    notes: { restaurant: 'Absolute Naansense', location: 'Renukoot' },
  });
  logger.info(`Razorpay order created: ${order.id} for ₹${amount}`);
  return order;
}

module.exports = { createOrder };
