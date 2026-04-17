const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
});

async function checkDb() {
    try {
        const students = await pool.query('SELECT count(*) FROM students');
        const fees = await pool.query('SELECT count(*) FROM student_fees');
        const academic = await pool.query('SELECT count(*) FROM academic_structure');
        console.log(`Students: ${students.rows[0].count}`);
        console.log(`Student Fees: ${fees.rows[0].count}`);
        console.log(`Academic Structure: ${academic.rows[0].count}`);
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await pool.end();
    }
}

checkDb();
