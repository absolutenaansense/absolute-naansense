const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const fcmService = require('../services/fcm');

const prisma = new PrismaClient();

// POST /api/payments/webhook — Razorpay calls this on payment.captured
// Body is raw (registered before express.json in index.js)
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body.toString());

  if (event.event === 'payment.captured') {
    const { order_id, id: paymentId } = event.payload.payment.entity;

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: order_id },
      include: { user: true },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayPaymentId: paymentId, paymentStatus: 'PAID', status: 'PAYMENT_RECEIVED' },
      });

      // Auto-notify admin
      await fcmService.notifyAdmin({
        title: `💰 Payment confirmed — ${order.orderNumber}`,
        body: `Razorpay confirmed ₹${order.total} from ${order.user.name}. Tap to confirm order.`,
        data: { orderId: order.id, type: 'PAYMENT_CAPTURED' },
      });
    }
  }

  res.json({ received: true });
});

// POST /api/payments/verify — client-side manual verify after Razorpay checkout
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (razorpay_signature !== expectedSig) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: 'PAID',
      status: 'PAYMENT_RECEIVED',
    },
  });

  res.json({ verified: true });
});

module.exports = router;
