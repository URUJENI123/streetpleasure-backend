require('dotenv').config();
const { query } = require('../src/config/db');

async function check() {
  try {
    const res = await query("SELECT title, scheduled_at, NOW() as current_time, scheduled_at > NOW() as is_future FROM activities ORDER BY created_at DESC LIMIT 5;");
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
