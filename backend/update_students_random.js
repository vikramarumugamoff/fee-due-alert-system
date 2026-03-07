require("dotenv").config();
const { Pool } = require("pg");

const DEPARTMENT_SHORTFORMS = ["ec", "cs", "it", "cv", "se"];
const COHORT_CODES = ["231", "221"];

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildStudentId({ index, departmentShort, studentIdPrefix, cohortCode }) {
  const padded = String(index).padStart(3, "0");
  const prefix = studentIdPrefix || "7376";
  const cohort = cohortCode || pickRandom(COHORT_CODES);
  return `${prefix}${cohort}${departmentShort}${padded}`;
}

async function updateStudents() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [k, ...rest] = arg.replace(/^--/, "").split("=");
      return [k, rest.join("=") || "true"];
    })
  );

  const limit = Number.parseInt(args.count || "100", 10);
  if (Number.isNaN(limit) || limit < 1) {
    throw new Error("count must be a positive number.");
  }

  const onlyPrefix = args.onlyPrefix || "";
  const res = await pool.query(
    onlyPrefix
      ? "SELECT id FROM students WHERE student_id ILIKE $1 ORDER BY id ASC LIMIT $2"
      : "SELECT id FROM students ORDER BY id ASC LIMIT $1",
    onlyPrefix ? [`${onlyPrefix}%`, limit] : [limit]
  );

  if (res.rows.length === 0) {
    console.log("No students found.");
    return;
  }

  const allIdsRes = await pool.query("SELECT student_id FROM students");
  const usedStudentIds = new Set(
    allIdsRes.rows.map((r) => String(r.student_id || ""))
  );

  await pool.query("BEGIN");
  try {
    for (let i = 0; i < res.rows.length; i++) {
      const row = res.rows[i];
      const departmentShort = pickRandom(DEPARTMENT_SHORTFORMS);
      let studentId = buildStudentId({
        index: i + 1,
        departmentShort,
        studentIdPrefix: args.studentIdPrefix,
        cohortCode: args.cohort,
      });

      let bump = 1;
      while (usedStudentIds.has(studentId)) {
        studentId = buildStudentId({
          index: i + 1 + bump,
          departmentShort,
          studentIdPrefix: args.studentIdPrefix,
          cohortCode: args.cohort,
        });
        bump += 1;
      }

      usedStudentIds.add(studentId);

      await pool.query(
        "UPDATE students SET department = $1, student_id = $2 WHERE id = $3",
        [departmentShort, studentId, row.id]
      );
    }

    await pool.query("COMMIT");
    console.log(`Updated ${res.rows.length} students.`);
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

updateStudents()
  .catch((err) => {
    console.error("Update error:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
