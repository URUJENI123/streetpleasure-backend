const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const activityRoutes    = require('./routes/activities');
const eventRoutes       = require('./routes/events');
const destinationRoutes = require('./routes/destinations');
const transportRoutes   = require('./routes/transport');
const reportRoutes      = require('./routes/reports');
const paymentRoutes     = require('./routes/payments');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/activities',   activityRoutes);
app.use('/api/events',       eventRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/transport',    transportRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/payments',     paymentRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;