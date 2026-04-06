require("dotenv").config();
const {Pool}=require("pg");
const pool=new Pool({user:process.env.DB_USER,host:process.env.DB_HOST,database:process.env.DB_NAME,password:String(process.env.DB_PASS),port:process.env.DB_PORT});
(async()=>{
  const academicYear = process.env.ACADEMIC_YEAR || '2024-25';
  const perSemesterIncrease = Number.parseFloat(process.env.SEMESTER_FEE_INCREMENT || '5000') || 5000;
  const baseTuition = 95400;
  const examFee = 8300;
  const stationery = 1200;
  const messAdvance = 47000;
  const hostelFee = 57000;
  const otherFeeConst = stationery + messAdvance; // 48200
  try {
    await pool.query('BEGIN');
    await pool.query('TRUNCATE TABLE fee_structure RESTART IDENTITY');
    for(let sem=1; sem<=8; sem++){
      const tuition = baseTuition + (sem-1)*perSemesterIncrease;
      await pool.query(
        `INSERT INTO fee_structure (academic_year, semester, tuition_fee, hostel_fee, exam_fee, other_fee)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [academicYear, sem, tuition, hostelFee, examFee, otherFeeConst]
      );
    }
    await pool.query('COMMIT');
    console.log('Seeded 8 rows for', academicYear);
  } catch(err){
    await pool.query('ROLLBACK');
    console.error('Seed failed', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
