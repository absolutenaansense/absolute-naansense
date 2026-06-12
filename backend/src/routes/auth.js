const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const smsService = require('../services/sms');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().withMessage('Enter a valid email'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'Phone number already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, phone, email, passwordHash },
    });

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user.id, name: user.name, phone: user.phone, isReturning: user.isReturning },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', [
  body('phone').notEmpty(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(401).json({ error: 'Invalid phone or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid phone or password' });

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, phone: user.phone, isReturning: user.isReturning },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/send-otp  (optional OTP flow for password-less login)
router.post('/send-otp', [
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone required'),
], async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'Phone not registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.otpToken.create({ data: { userId: user.id, otp, expiresAt } });
    await smsService.sendOtp(phone, otp);

    res.json({ message: 'OTP sent' });
  } catch (err) { next(err); }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'Phone not registered' });

    const token = await prisma.otpToken.findFirst({
      where: { userId: user.id, otp, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!token) return res.status(401).json({ error: 'Invalid or expired OTP' });

    await prisma.otpToken.update({ where: { id: token.id }, data: { used: true } });
    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

    const jwtToken = generateToken(user.id);
    res.json({ token: jwtToken, user: { id: user.id, name: user.name, phone: user.phone, isReturning: user.isReturning } });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { addresses: { orderBy: { isDefault: 'desc' } } },
  });
  res.json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email, isReturning: user.isReturning, addresses: user.addresses } });
});

// POST /api/auth/addresses
router.post('/addresses', authenticate, [
  body('label').notEmpty(),
  body('line1').notEmpty(),
  body('city').notEmpty(),
  body('pincode').isLength({ min: 6, max: 6 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { label, line1, line2, city, pincode, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }

    const address = await prisma.address.create({
      data: { userId: req.user.id, label, line1, line2, city, pincode, isDefault: isDefault || false },
    });
    res.status(201).json({ address });
  } catch (err) { next(err); }
});

// DELETE /api/auth/addresses/:id
router.delete('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ message: 'Address deleted' });
  } catch (err) { next(err); }
});

// Admin login
router.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ adminId: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) { next(err); }
});

module.exports = router;
