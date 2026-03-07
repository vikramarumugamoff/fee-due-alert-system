const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});

(async () => {
    try {
        const res = await pool.query("SELECT year, semester, status, total_fee FROM student_semester_fees WHERE student_email = 'receipt.test@bitsathy.ac.in' ORDER BY year, semester");
        console.log(JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
