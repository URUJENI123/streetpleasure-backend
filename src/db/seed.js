require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  // Create migrations tracking table
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await db.query(
      'SELECT id FROM schema_migrations WHERE filename = $1',
      [file]
    );

    if (rows.length > 0) {
      console.log(`⏭  Skipping ${file} (already applied)`);
      continue;
    }

    console.log(` Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(` Applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(` Failed: ${file}`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(' All migrations complete');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});