const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function migrateDatabase() {
    try {
        console.log("🔄 Adding missing columns to students table...");
        
        // Add student_type column if it doesn't exist
        await pool.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS student_type VARCHAR(100);
        `);
        console.log("✅ Added student_type column");

        // Add year column if it doesn't exist
        await pool.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS year VARCHAR(50);
        `);
        console.log("✅ Added year column");

        // Add semester column if it doesn't exist
        await pool.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
        `);
        console.log("✅ Added semester column");

        console.log("\n✨ Database migration completed successfully!");

    } catch (err) {
        console.error("❌ Migration Error:", err.message);
    } finally {
        await pool.end();
    }
}

migrateDatabase();
