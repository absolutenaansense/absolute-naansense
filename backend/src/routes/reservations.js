const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authenticateAdmin } = require('../middleware/auth');
const fcmService = require('../services/fcm');

const prisma = new PrismaClient();

// GET /api/reservations — admin: all reservations
router.get('/', authenticateAdmin, async (req, res, next) => {
  try {
    const { date, month, year } = req.query;
    let where = {};

    if (date) {
      const d = new Date(date);
      where.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 1);
      where.date = { gte: start, lt: end };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: { table: true },
      orderBy: { date: 'asc' },
    });
    res.json({ reservations });
  } catch (err) { next(err); }
});

// GET /api/reservations/availability — check table availability for a date+time
router.get('/availability', async (req, res, next) => {
  try {
    const { date, timeSlot } = req.query;
    const d = new Date(date);

    const booked = await prisma.reservation.findMany({
      where: {
        date: { gte: d, lt: new Date(d.getTime() + 86400000) },
        timeSlot,
        status: 'CONFIRMED',
      },
      select: { tableId: true },
    });

    const bookedTableIds = booked.map(r => r.tableId);
    const available = await prisma.table.findMany({
      where: { isActive: true, id: { notIn: bookedTableIds } },
    });

    res.json({ available });
  } catch (err) { next(err); }
});

// POST /api/reservations — create reservation (admin or customer)
router.post('/', [
  body('guestName').notEmpty().withMessage('Guest name is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone required'),
  body('guestCount').isInt({ min: 1 }).withMessage('Guest count must be at least 1'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('timeSlot').notEmpty().withMessage('Time slot required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { guestName, phone, guestCount, tableId, date, timeSlot, notes } = req.body;

    // Check for conflicts
    if (tableId) {
      const conflict = await prisma.reservation.findFirst({
        where: {
          tableId,
          timeSlot,
          status: 'CONFIRMED',
          date: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) },
        },
      });
      if (conflict) return res.status(409).json({ error: 'Table already booked for this slot' });
    }

    const reservation = await prisma.reservation.create({
      data: { guestName, phone, guestCount, tableId, date: new Date(date), timeSlot, notes },
      include: { table: true },
    });

    // Notify admin
    await fcmService.notifyAdmin({
      title: `📅 New reservation — ${guestName}`,
      body: `${guestCount} guests, ${new Date(date).toDateString()}, ${timeSlot}`,
      data: { reservationId: reservation.id, type: 'NEW_RESERVATION' },
    });

    res.status(201).json({ reservation });
  } catch (err) { next(err); }
});

// PATCH /api/reservations/:id — admin update
router.patch('/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const { status, tableId, notes } = req.body;
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status, tableId, notes },
      include: { table: true },
    });
    res.json({ reservation });
  } catch (err) { next(err); }
});

// DELETE /api/reservations/:id — admin cancel
router.delete('/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ message: 'Reservation cancelled' });
  } catch (err) { next(err); }
});

// GET /api/reservations/tables — list all tables
router.get('/tables', async (req, res, next) => {
  try {
    const tables = await prisma.table.findMany({ where: { isActive: true } });
    res.json({ tables });
  } catch (err) { next(err); }
});

module.exports = router;
