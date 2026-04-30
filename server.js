require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/sockets/chatSocket');
const cron = require('node-cron');
const { expire01Chats } = require('./src/services/chatExiry');
const { releaseEscrowDue } = require('./src/services/escrowRelease');
const { testConnection } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  const server = http.createServer(app);
  initSocket(server);

// Cron: expire chats 24h after activity, release overdue escrows
  cron.schedule('*/15 * * * *', async () => {
    await expire01Chats();
    await releaseEscrowDue();
  });

  server.listen(PORT, () => {
    console.log(`Street pleasure API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });

  return server;
}

start()
  .then(server => {
    module.exports = server;
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
