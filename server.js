// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const cors = require('cors');
// const helmet = require('helmet');
// const { Server } = require('socket.io');

// const db = require('./src/config/db');
// const rateLimiter = require('./src/middleware/rateLimiter');
// const errorHandler = require('./src/middleware/errorHandler');
// const { initSocket } = require('./src/sockets/chatSocket');

// // Routes
// const authRoutes = require('./src/routes/auth');
// const userRoutes = require('./src/routes/users');
// const activityRoutes = require('./src/routes/activities');
// const eventRoutes = require('./src/routes/events');
// const destinationRoutes = require('./src/routes/destinations');
// const transportRoutes = require('./src/routes/transport');
// const reportRoutes = require('./src/routes/reports');
// const paymentRoutes = require('./src/routes/payments');

// const app = express();
// const server = http.createServer(app);

// // Socket.IO
// const io = new Server(server, {
//   cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] }
// });
// initSocket(io);
// app.set('io', io);

// // Middleware
// app.use(helmet());
// app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));
// app.use(rateLimiter);

// // Health check
// app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// // Routes
// app.use('/auth', authRoutes);
// app.use('/users', userRoutes);
// app.use('/activities', activityRoutes);
// app.use('/events', eventRoutes);
// app.use('/destinations', destinationRoutes);
// app.use('/transport', transportRoutes);
// app.use('/reports', reportRoutes);
// app.use('/payments', paymentRoutes);

// // 404
// app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// // Global error handler
// app.use(errorHandler);

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, async () => {
//   try {
//     await db.query('SELECT 1');
//     console.log(` DB connected`);
//   } catch (e) {
//     console.error(' DB connection failed:', e.message);
//   }
//   console.log(` Streetpleasure API running on port ${PORT}`);
// });

// module.exports = { app, server };

require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/sockets/chatSocket');
const cron = require('node-cron');
const { expireOldChats } = require('./src/services/chatExpiry');
const { releaseEscrowDue } = require('./src/services/escrowRelease');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

// Cron: expire chats 24h after activity, release overdue escrows
cron.schedule('*/15 * * * *', async () => {
  await expireOldChats();
  await releaseEscrowDue();
});

server.listen(PORT, () => {
  console.log(`Twikoranire API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = server;
