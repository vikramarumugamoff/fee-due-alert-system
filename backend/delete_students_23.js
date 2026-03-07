const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function deleteStudentsWithEmail23() {
    try {
        // First, show which students will be deleted
        const checkRes = await pool.query("SELECT id, full_name, email FROM students WHERE email ILIKE '%23%'");
        console.log(`\n📋 Found ${checkRes.rows.length} student(s) with '23' in email:`);
        checkRes.rows.forEach(row => {
            console.log(`   - ${row.full_name} (${row.email})`);
        });

        // Delete from related tables first (foreign key dependencies)
        const paymentRes = await pool.query("DELETE FROM payment_history WHERE student_email ILIKE '%23%'");
        console.log(`\n✅ Deleted ${paymentRes.rowCount} payment history records.`);

        const semesterFeesRes = await pool.query("DELETE FROM student_semester_fees WHERE student_id IN (SELECT id FROM students WHERE email ILIKE '%23%')");
        console.log(`✅ Deleted ${semesterFeesRes.rowCount} semester fee records.`);

        // Delete from student_fees
        const feesRes = await pool.query("DELETE FROM student_fees WHERE student_email ILIKE '%23%'");
        console.log(`✅ Deleted ${feesRes.rowCount} student fee records.`);

        // Delete from students table
        const studentRes = await pool.query("DELETE FROM students WHERE email ILIKE '%23%'");
        console.log(`✅ Deleted ${studentRes.rowCount} student records from students table.`);

        console.log('\n✨ Deletion complete!');

    } catch (err) {
        console.error("❌ Deletion Error:", err.message);
    } finally {
        await pool.end();
    }
}

deleteStudentsWithEmail23();
