const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/admin/dashboard — summary stats
router.get('/dashboard', authenticateAdmin, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const [
      ordersToday,
      revenueToday,
      pendingOrders,
      totalUsers,
      ordersThisMonth,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: today }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: 'PAYMENT_RECEIVED' } }),
      prisma.user.count(),
      prisma.order.count({
        where: {
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          status: { not: 'CANCELLED' },
        },
      }),
    ]);

    res.json({
      stats: {
        ordersToday,
        revenueToday: revenueToday._sum.total || 0,
        pendingOrders,
        totalUsers,
        ordersThisMonth,
      },
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/fcm-token — update admin FCM token for notifications
router.patch('/fcm-token', authenticateAdmin, async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    await prisma.admin.update({ where: { id: req.admin.id }, data: { fcmToken } });
    res.json({ message: 'FCM token updated' });
  } catch (err) { next(err); }
});

module.exports = router;
