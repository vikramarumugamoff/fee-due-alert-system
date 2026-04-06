require("dotenv").config();
const {Pool}=require("pg");
const pool=new Pool({user:process.env.DB_USER,host:process.env.DB_HOST,database:process.env.DB_NAME,password:String(process.env.DB_PASS),port:process.env.DB_PORT});
(async()=>{
  const rows=[
    {year:'2024-25', sem:1, start:'2024-07-01', end:'2024-12-15'},
    {year:'2024-25', sem:2, start:'2025-01-05', end:'2025-05-20'},
    {year:'2025-26', sem:3, start:'2025-07-01', end:'2025-12-15'},
    {year:'2025-26', sem:4, start:'2026-01-05', end:'2026-05-20'},
    {year:'2026-27', sem:5, start:'2026-07-01', end:'2026-12-15'},
    {year:'2026-27', sem:6, start:'2027-01-05', end:'2027-05-20'},
    {year:'2027-28', sem:7, start:'2027-07-01', end:'2027-12-15'},
    {year:'2027-28', sem:8, start:'2028-01-05', end:'2028-05-20'}
  ];
  try{
    await pool.query('BEGIN');
    for(const r of rows){
      await pool.query(
        `INSERT INTO academic_structure (academic_year, semester, start_date, end_date)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (academic_year, semester) DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date`,
        [r.year, r.sem, r.start, r.end]
      );
    }
    await pool.query('COMMIT');
    console.log('Upserted academic periods:', rows.length);
  }catch(err){
    await pool.query('ROLLBACK');
    console.error(err);
    process.exit(1);
  }finally{await pool.end();}
})();
