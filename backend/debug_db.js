const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debugData() {
    try {
        const studentCount = await pool.query('SELECT COUNT(*) FROM students');
        console.log("Total Students in 'students' table:", studentCount.rows[0].count);

        const feeCount = await pool.query('SELECT COUNT(*) FROM student_fees');
        console.log("Total Records in 'student_fees' table:", feeCount.rows[0].count);

        const joinedCount = await pool.query(`
      SELECT COUNT(*) 
      FROM students s
      JOIN student_fees sf ON s.email = sf.student_email
    `);
        console.log("Joined Records (Normal JOIN on email):", joinedCount.rows[0].count);

        const leftJoinedCount = await pool.query(`
      SELECT COUNT(*) 
      FROM students s
      LEFT JOIN student_fees sf ON s.email = sf.student_email
    `);
        console.log("Joined Records (LEFT JOIN on email):", leftJoinedCount.rows[0].count);

        if (parseInt(studentCount.rows[0].count) > 0) {
            const sampleStudent = await pool.query('SELECT email FROM students LIMIT 1');
            const email = sampleStudent.rows[0].email;
            console.log("Sample Student Email:", email);

            const feeCheck = await pool.query('SELECT student_email FROM student_fees WHERE student_email = $1', [email]);
            console.log("Matching Fee Record for sample:", feeCheck.rows.length > 0 ? "YES" : "NO");
        }

    } catch (err) {
        console.error("Debug Error:", err.message);
    } finally {
        await pool.end();
    }
}

debugData();
