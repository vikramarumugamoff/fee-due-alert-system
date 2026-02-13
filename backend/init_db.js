require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDB() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false,
  });

  try {
    console.log('📡 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Read and execute SQL
    const sqlPath = path.join(__dirname, 'create_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 Creating tables...');
    await client.query(sql);
    console.log('✅ Tables created successfully!');

    client.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

initDB();
