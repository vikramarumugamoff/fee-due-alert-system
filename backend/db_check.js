require('dotenv').config();
const { Pool } = require('pg');

async function check() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false,
  });

  try {
    const r = await pool.query('SELECT NOW() as now');
    console.log('DB connected, now =', r.rows[0].now);
  } catch (err) {
    console.error('DB connection error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
