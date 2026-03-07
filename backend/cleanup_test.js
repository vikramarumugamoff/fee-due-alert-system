const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASS, port: process.env.DB_PORT
});

(async () => {
    try {
        const res = await pool.query("SELECT email, student_id FROM students WHERE email LIKE '%test%' OR student_id LIKE '%TEST%'");
        console.log('Found:', res.rows);

        // Detailed cleanup
        const emails = res.rows.map(r => r.email);
        for (const email of emails) {
            await pool.query("DELETE FROM student_semester_fees WHERE student_email = $1", [email]);
            await pool.query("DELETE FROM payment_history WHERE student_email = $1", [email]);
            await pool.query("DELETE FROM student_fees WHERE student_email = $1", [email]);
            await pool.query("DELETE FROM students WHERE email = $1", [email]);
        }
        console.log('Cleanup complete');

        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
