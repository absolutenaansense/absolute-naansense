const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const razorpayService = require('../services/razorpay');
const petpoojaService = require('../services/petpooja');
const fcmService = require('../services/fcm');

const prisma = new PrismaClient();

// Generate human-readable order number
async function generateOrderNumber() {
  const count = await prisma.order.count();
  return `ABN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

// POST /api/orders — create a new order
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { items, addressId, type, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    // Validate payment method for first-time users
    if (!req.user.isReturning && paymentMethod === 'CASH_ON_DELIVERY') {
      return res.status(400).json({ error: 'First-time customers must pay via QR/UPI' });
    }

    // Fetch menu items and calculate totals
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ error: 'One or more items are unavailable' });
    }

    const orderItems = items.map(i => {
      const mi = menuItems.find(m => m.id === i.menuItemId);
      return {
        menuItemId: mi.id,
        quantity: i.quantity,
        unitPrice: mi.price,
        subtotal: parseFloat(mi.price) * i.quantity,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const deliveryFee = type === 'DELIVERY' ? 40 : 0;
    const total = subtotal + deliveryFee;
    const orderNumber = await generateOrderNumber();

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        addressId: addressId || null,
        orderNumber,
        type,
        paymentMethod,
        subtotal,
        deliveryFee,
        total,
        notes,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        items: { create: orderItems },
      },
      include: { items: { include: { menuItem: true } }, address: true },
    });

    // If QR payment — create Razorpay order for tracking
    let razorpayOrder = null;
    if (paymentMethod === 'QR_UPI') {
      razorpayOrder = await razorpayService.createOrder(total, order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: razorpayOrder.id },
      });
    }

    res.status(201).json({ order, razorpayOrder });
  } catch (err) { next(err); }
});

// POST /api/orders/:id/payment-received — user says they've paid via QR
router.post('/:id/payment-received', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ error: 'Order is not awaiting payment' });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_RECEIVED' },
    });

    // Notify admin via FCM
    await fcmService.notifyAdmin({
      title: `💰 Payment received — ${order.orderNumber}`,
      body: `${req.user.name} has paid ₹${order.total}. Tap to confirm.`,
      data: { orderId: order.id, type: 'PAYMENT_RECEIVED' },
    });

    res.json({ message: 'Admin notified. Your order will be confirmed shortly.' });
  } catch (err) { next(err); }
});

// GET /api/orders/my — user's own orders
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { menuItem: true } }, address: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ orders });
  } catch (err) { next(err); }
});

// GET /api/orders/:id — single order (user must own it)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: { include: { menuItem: true } }, address: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) { next(err); }
});

// ---- Admin routes ----

// GET /api/orders/admin/all — admin: list all orders
router.get('/admin/all', authenticateAdmin, async (req, res, next) => {
  try {
    const { status, date, page = 1 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          items: { include: { menuItem: { select: { name: true } } } },
          address: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: (parseInt(page) - 1) * 20,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(page) });
  } catch (err) { next(err); }
});

// POST /api/orders/:id/confirm — admin confirms payment & triggers KOT
router.post('/:id/confirm', authenticateAdmin, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        items: { include: { menuItem: true } },
        address: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        confirmedAt: new Date(),
      },
    });

    // Mark user as returning (unlocks COD)
    await prisma.user.update({
      where: { id: order.userId },
      data: { isReturning: true },
    });

    // Push KOT to PetPooja
    const kotResult = await petpoojaService.createOrder(order);
    if (kotResult.petpoojaOrderId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { petpoojaOrderId: kotResult.petpoojaOrderId, kotSentAt: new Date() },
      });
    }

    // Notify customer
    if (order.user.fcmToken) {
      await fcmService.notifyUser(order.user.fcmToken, {
        title: `✅ Order confirmed — ${order.orderNumber}`,
        body: 'Your order is confirmed and being prepared!',
        data: { orderId: order.id, type: 'ORDER_CONFIRMED' },
      });
    }

    res.json({ message: 'Order confirmed and KOT sent to PetPooja', kotResult });
  } catch (err) { next(err); }
});

// POST /api/orders/:id/cancel — admin cancels
router.post('/:id/cancel', authenticateAdmin, async (req, res, next) => {
  try {
    const { reason } = req.body;
    await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ message: 'Order cancelled' });
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status — update order status (preparing, out for delivery, delivered)
router.patch('/:id/status', authenticateAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: true },
    });

    const messages = {
      PREPARING: 'Your order is being prepared in our kitchen 👨‍🍳',
      OUT_FOR_DELIVERY: 'Your order is on its way! 🛵',
      DELIVERED: 'Your order has been delivered. Enjoy your meal! 🍽️',
    };

    if (order.user.fcmToken) {
      await fcmService.notifyUser(order.user.fcmToken, {
        title: `Order ${order.orderNumber}`,
        body: messages[status],
        data: { orderId: order.id, type: 'STATUS_UPDATE', status },
      });
    }

    res.json({ order });
  } catch (err) { next(err); }
});

module.exports = router;
