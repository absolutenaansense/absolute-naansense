require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const reservationRoutes = require('./routes/reservations');
const adminRoutes = require('./routes/admin');
const petpoojaRoutes = require('./routes/petpooja');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Razorpay webhook needs raw body — register before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/petpooja', petpoojaRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Absolute Naansense API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
