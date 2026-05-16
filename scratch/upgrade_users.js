require('dotenv').config();
const { query } = require('../src/config/db');

async function upgradeUsers() {
  try {
    const res = await query("UPDATE users SET role = 'verified_local' RETURNING phone_number, role;");
    console.log('Upgraded users:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

upgradeUsers();
