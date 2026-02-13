const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function inspectSchema() {
    try {
        const studentsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'students'
    `);
        console.log("Students Columns:", studentsCols.rows.map(r => `${r.column_name} (${r.data_type})`));

        const feesCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_fees'
    `);
        console.log("Student Fees Columns:", feesCols.rows.map(r => `${r.column_name} (${r.data_type})`));

        const sampleFees = await pool.query('SELECT * FROM student_fees LIMIT 1');
        console.log("Sample Fee Record:", sampleFees.rows[0]);

    } catch (err) {
        console.error("Schema Error:", err.message);
    } finally {
        await pool.end();
    }
}

inspectSchema();
