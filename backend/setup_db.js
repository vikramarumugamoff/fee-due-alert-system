const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER, 
    host: process.env.DB_HOST, 
    database: process.env.DB_NAME, 
    password: process.env.DB_PASS, 
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS student_semester_fees (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_email VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL,
        semester INTEGER NOT NULL,
        tuition_fee DECIMAL(10, 2) NOT NULL,
        exam_fee DECIMAL(10, 2) NOT NULL,
        stationery_fee DECIMAL(10, 2) NOT NULL,
        refreshment_fee DECIMAL(10, 2) NOT NULL,
        hostel_fee DECIMAL(10, 2) DEFAULT 0,
        placement_fee DECIMAL(10, 2) DEFAULT 0,
        total_fee DECIMAL(10, 2) NOT NULL,
        paid_amount DECIMAL(10, 2) DEFAULT 0,
        payment_date DATE,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (student_id) REFERENCES students(id)
      );
    `);
        console.log('Table student_semester_fees ensured');
        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
