const { query } = require('../config/db');


const initNotifSocket = (io) => {
  const nsp = io.of('/notifications');

  // Auth middleware for this namespace
  nsp.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const { rows } = await query(
        'SELECT id, full_name, locked_at FROM users WHERE id = $1',
        [payload.userId]
      );
      if (!rows.length || rows[0].locked_at) return next(new Error('Unauthorized'));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  nsp.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Each user gets their own private room
    socket.join(`user:${userId}`);
    console.log(`[notif] ${socket.user.full_name || userId} connected`);

    // Send unread count immediately on connect
    await emitUnreadCount(nsp, userId);

    // Mark a single notification as read
    socket.on('notif:read', async ({ notifId }) => {
      try {
        await query(
          'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
          [notifId, userId]
        );
        await emitUnreadCount(nsp, userId);
      } catch (err) {
        console.error('[notif] read error:', err.message);
      }
    });

    // Mark all notifications as read
    socket.on('notif:read_all', async () => {
      try {
        await query(
          'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
          [userId]
        );
        nsp.to(`user:${userId}`).emit('notif:unread_count', { count: 0 });
      } catch (err) {
        console.error('[notif] read_all error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[notif] ${socket.user.full_name || userId} disconnected`);
    });
  });

  return nsp;
};

const emitUnreadCount = async (nsp, userId) => {
  try {
    const { rows } = await query(
      'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
    nsp.to(`user:${userId}`).emit('notif:unread_count', {
      count: parseInt(rows[0].cnt),
    });
  } catch (err) {
    console.warn('[notif] emitUnreadCount error:', err.message);
  }
};

const pushNotification = async (io, { userId, type, title, body, entityType, entityId }) => {
  try {
    // Persist to DB
    const { rows: [notif] } = await query(`
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, type, title, body, entityType || null, entityId || null]);

    // Emit to connected socket (if online)
    const nsp = io.of('/notifications');
    nsp.to(`user:${userId}`).emit('notif:new', notif);

    // Also update unread count
    await emitUnreadCount(nsp, userId);
  } catch (err) {
    console.error('[notif] pushNotification error:', err.message);
  }
};

module.exports = { initNotifSocket, pushNotification };