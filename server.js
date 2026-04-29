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
