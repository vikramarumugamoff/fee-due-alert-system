require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

async function seed() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bitsathy.ac.in';
    const adminPass = process.env.ADMIN_PASS || 'Admin@1234';

    const hashed = await bcrypt.hash(adminPass, 10);

    // Ensure admins table exists - simple create if not exists
    await pool.query(
      `CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    );

    // Ensure students table exists
    await pool.query(
      `CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        student_id VARCHAR(100) UNIQUE NOT NULL,
        department VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    );

    // Ensure sessions table exists
    await pool.query(
      `CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    );

    const exists = await pool.query('SELECT * FROM admins WHERE email=$1', [adminEmail]);
    if (exists.rows.length > 0) {
      console.log('Admin already exists:', adminEmail);
      process.exit(0);
    }

    await pool.query('INSERT INTO admins (email, name, password) VALUES ($1,$2,$3)', [
      adminEmail,
      'Default Admin',
      hashed,
    ]);

    console.log('Admin seeded:', adminEmail);
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

seed();
