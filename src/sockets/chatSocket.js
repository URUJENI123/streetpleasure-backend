const { Server }  = require('socket.io');
const jwt         = require('jsonwebtoken');
const { query }   = require('../config/db');
const { send }    = require('../services/fcm');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
  });

  // Authenticate every socket connection via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const { rows } = await query(
        'SELECT id, full_name, avatar_url, role, locked_at FROM users WHERE id=$1',
        [payload.userId]
      );
      if (!rows.length || rows[0].locked_at) return next(new Error('Unauthorized'));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] ${socket.user.full_name || socket.user.id} connected`);

    // Join a chat room
    socket.on('chat:join', async ({ chatId }) => {
      try {
        const { rows: [chat] } = await query(
          'SELECT * FROM chats WHERE id=$1', [chatId]
        );
        if (!chat) return socket.emit('error', { message: 'Chat not found' });
        if (new Date() > new Date(chat.expires_at)) return socket.emit('error', { message: 'Chat expired' });

        // Verify user is participant in the related entity
        let isMember = false;
        if (chat.related_entity_type === 'activity') {
          const { rows } = await query(
            'SELECT 1 FROM activity_participants WHERE activity_id=$1 AND user_id=$2',
            [chat.related_entity_id, socket.user.id]
          );
          isMember = rows.length > 0;
        } else if (chat.related_entity_type === 'event') {
          const { rows } = await query(
            'SELECT 1 FROM event_attendees WHERE event_id=$1 AND user_id=$2',
            [chat.related_entity_id, socket.user.id]
          );
          isMember = rows.length > 0;
        }

        if (!isMember) return socket.emit('error', { message: 'Not a member of this chat' });

        socket.join(`chat:${chatId}`);

        // Load last 50 messages
        const { rows: history } = await query(`
          SELECT m.id, m.text, m.sent_at,
                 u.id AS sender_id, u.full_name AS sender_name, u.avatar_url AS sender_avatar
          FROM messages m
          JOIN users u ON u.id = m.sender_id
          WHERE m.chat_id = $1
          ORDER BY m.sent_at ASC
          LIMIT 50
        `, [chatId]);

        socket.emit('chat:history', { chatId, messages: history });

        // Broadcast join notification
        socket.to(`chat:${chatId}`).emit('chat:system', {
          text: `${socket.user.full_name || 'A user'} joined the chat`,
          ts:   new Date(),
        });
      } catch (err) {
        console.error('[socket] chat:join error', err.message);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Send a message
    socket.on('chat:message', async ({ chatId, text }) => {
      try {
        if (!text?.trim()) return;
        if (text.length > 1000) return socket.emit('error', { message: 'Message too long' });

        // Confirm still in room
        if (!socket.rooms.has(`chat:${chatId}`)) {
          return socket.emit('error', { message: 'Not in this chat room' });
        }

        // Verify chat not expired
        const { rows: [chat] } = await query(
          'SELECT expires_at FROM chats WHERE id=$1', [chatId]
        );
        if (!chat || new Date() > new Date(chat.expires_at)) {
          return socket.emit('error', { message: 'Chat has expired' });
        }

        // Persist message
        const { rows: [msg] } = await query(`
          INSERT INTO messages(chat_id, sender_id, text)
          VALUES ($1,$2,$3)
          RETURNING id, chat_id, text, sent_at
        `, [chatId, socket.user.id, text.trim()]);

        const payload = {
          id:            msg.id,
          chatId,
          text:          msg.text,
          sentAt:        msg.sent_at,
          sender: {
            id:     socket.user.id,
            name:   socket.user.full_name,
            avatar: socket.user.avatar_url,
          },
        };

        // Broadcast to room (including sender for confirmation)
        io.to(`chat:${chatId}`).emit('chat:message', payload);

        // Push notification to offline members
        await notifyOfflineMembers(chatId, chat, socket.user, text.trim());
      } catch (err) {
        console.error('[socket] chat:message error', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('chat:typing', ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        userId:   socket.user.id,
        name:     socket.user.full_name,
        isTyping,
      });
    });

    // Leave chat room
    socket.on('chat:leave', ({ chatId }) => {
      socket.leave(`chat:${chatId}`);
      socket.to(`chat:${chatId}`).emit('chat:system', {
        text: `${socket.user.full_name || 'A user'} left the chat`,
        ts:   new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] ${socket.user.full_name || socket.user.id} disconnected`);
    });
  });

  return io;
};

const notifyOfflineMembers = async (chatId, chat, sender, text) => {
  try {
    let memberQuery;
    if (chat.related_entity_type === 'activity') {
      memberQuery = `
        SELECT u.fcm_token FROM users u
        JOIN activity_participants ap ON ap.user_id = u.id
        WHERE ap.activity_id = $1 AND u.id != $2 AND u.fcm_token IS NOT NULL
      `;
    } else {
      memberQuery = `
        SELECT u.fcm_token FROM users u
        JOIN event_attendees ea ON ea.user_id = u.id
        WHERE ea.event_id = $1 AND u.id != $2 AND u.fcm_token IS NOT NULL
      `;
    }

    const { rows } = await query(memberQuery, [chat.related_entity_id, sender.id]);

    for (const { fcm_token } of rows) {
      // Only notify if not currently in the room (approximate: always notify, client dedupes)
      await send({
        token: fcm_token,
        title: sender.full_name || 'New message',
        body:  text.length > 60 ? text.slice(0, 60) + '…' : text,
        data:  { chatId, type: 'message' },
      });
    }
  } catch (err) {
    console.warn('[socket] notify offline members error:', err.message);
  }
};

const getIO = () => io;

module.exports = { initSocket, getIO };