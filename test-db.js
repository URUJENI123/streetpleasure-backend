require('dotenv').config();
const { pool } = require('./src/config/db');

pool.query('SELECT NOW()')
  .then(r => {
    console.log('Database Connected! Server time:', r.rows[0].now);
    pool.end();
  })
  .catch(e => {
    console.error(' Connection failed:', e.message);
    process.exit(1);
  });
