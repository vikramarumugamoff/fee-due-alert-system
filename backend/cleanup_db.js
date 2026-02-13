const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function cleanup() {
    try {
        const res = await pool.query("DELETE FROM students WHERE full_name ILIKE '%test%' OR full_name ILIKE '%verify%' OR email ILIKE '%test%' OR email ILIKE '%verify%'");
        console.log(`✅ Deleted ${res.rowCount} test student records.`);

        // Also cleanup orphaned fees if any
        const feeRes = await pool.query("DELETE FROM student_fees WHERE student_email NOT IN (SELECT email FROM students)");
        console.log(`✅ Cleaned up ${feeRes.rowCount} orphaned fee records.`);

    } catch (err) {
        console.error("Cleanup Error:", err.message);
    } finally {
        await pool.end();
    }
}

cleanup();
