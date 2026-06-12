const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message} — ${req.originalUrl} — ${req.method} — ${req.ip}`);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with this value already exists' });
    }
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = { errorHandler };
