const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    console.log("Creating payments table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        amount_paid NUMERIC NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(50) UNIQUE NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_status VARCHAR(50) DEFAULT 'Success',
        semester INTEGER,
        student_email VARCHAR(255)
      );
    `);
    console.log("Successfully created payments table.");
    
    // Copy existing successful payments from payment_history to payments if any exist
    // Check if we need to migrate any data
    const existing = await pool.query('SELECT COUNT(*) FROM payments');
    if (parseInt(existing.rows[0].count) === 0) {
      console.log("Migrating existing payment history...");
      const history = await pool.query("SELECT * FROM payment_history WHERE status = 'Success'");
      for (const row of history.rows) {
         // Get student_id from email
         const studentRes = await pool.query('SELECT id, semester FROM students WHERE email = $1', [row.student_email]);
         if (studentRes.rows.length > 0) {
             const student = studentRes.rows[0];
             await pool.query(`
                INSERT INTO payments (student_id, student_email, amount_paid, payment_method, transaction_id, payment_date, payment_status, semester)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             `, [student.id, row.student_email, row.amount, 'Net Banking', row.reference_id, row.payment_date, 'Success', student.semester]);
         }
      }
      console.log("Migration complete.");
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
