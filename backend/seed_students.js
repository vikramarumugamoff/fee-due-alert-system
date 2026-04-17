require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const MAX_BULK_COUNT = 100;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    out[key] = value === "" ? true : value;
  }
  return out;
}

function calculateStudentFees(studentType, semester) {
  const sem = Math.min(Math.max(parseInt(semester, 10) || 1, 1), 8);
  const step = sem - 1;
  const perSemesterIncrease =
    Number.parseFloat(process.env.SEMESTER_FEE_INCREMENT || "5000") || 5000;
  const isHosteller = String(studentType || "")
    .toLowerCase()
    .includes("hosteller");

  const tuitionFee = 95400 + step * perSemesterIncrease;
  const examFee = 8300;
  const stationeryFee = 1200;
  const messAdvance = isHosteller ? 47000 : 0;
  const hostelFee = isHosteller ? 57000 : 0;

  return tuitionFee + examFee + stationeryFee + messAdvance + hostelFee;
}

const TAMIL_FIRST_NAMES = [
  "Arun",
  "Karthik",
  "Vignesh",
  "Praveen",
  "Suresh",
  "Dinesh",
  "Harish",
  "Naveen",
  "Lokesh",
  "Santhosh",
  "Raghavan",
  "Balaji",
  "Gokul",
  "Manikandan",
  "Saravanan",
  "Vijay",
  "Ajith",
  "Kavin",
  "Nithin",
  "Madhan",
  "Priya",
  "Divya",
  "Nivetha",
  "Keerthana",
  "Swathi",
  "Anitha",
  "Pavithra",
  "Harini",
  "Janani",
  "Kavya",
  "Meena",
  "Aarthi",
  "Gayathri",
  "Sowmya",
  "Revathi",
  "Lakshmi",
  "Deepika",
  "Roshini",
  "Shalini",
  "Yamini",
];

const TAMIL_LAST_NAMES = [
  "Kumar",
  "Raj",
  "Subramanian",
  "Raman",
  "Murugan",
  "Selvam",
  "Babu",
  "Narayanan",
  "Srinivasan",
  "Perumal",
  "Arumugam",
  "Mohan",
  "Velan",
  "Senthil",
  "Anand",
  "Krishnan",
  "Balasubramaniam",
  "Chandrasekar",
  "Shankar",
  "Prakash",
  "Devi",
  "Lakshmanan",
  "Mahadevan",
  "Natarajan",
  "Ravichandran",
  "Ilango",
  "Durai",
  "Pandian",
  "Thangavel",
  "Paramasivam",
];

const DEPARTMENT_SHORTFORMS = ["ec", "cs", "it", "cv", "se"];
const COHORT_CODES = ["231", "221"];

function slugifyName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function getTamilStyleName(index) {
  const first = TAMIL_FIRST_NAMES[(index - 1) % TAMIL_FIRST_NAMES.length];
  const last = TAMIL_LAST_NAMES[
    Math.floor((index - 1) / TAMIL_FIRST_NAMES.length) % TAMIL_LAST_NAMES.length
  ];
  return `${first} ${last}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildStudentId({ index, departmentShort, studentIdPrefix, cohortCode }) {
  const padded = String(index).padStart(3, "0");
  const prefix = studentIdPrefix || "7376";
  const cohort = cohortCode || pickRandom(COHORT_CODES);
  return `${prefix}${cohort}${departmentShort}${padded}`;
}

function buildStudent(index, options, emailRegistry) {
  const padded = String(index).padStart(3, "0");
  const fullName =
    options.namePrefix
      ? `${options.namePrefix} ${padded}`
      : getTamilStyleName(index);
  const emailDomain = options.emailDomain || "bitsathy.ac.in";
  const phonePrefix = options.phonePrefix || "90000";
  const baseEmailLocal = slugifyName(fullName) || `student${padded}`;

  const departmentShort = (options.department || pickRandom(DEPARTMENT_SHORTFORMS)).toLowerCase();
  const studentId = buildStudentId({
    index,
    departmentShort,
    studentIdPrefix: options.studentIdPrefix,
    cohortCode: options.cohort,
  });

  let emailLocal = baseEmailLocal;
  let suffix = 1;
  while (emailRegistry.has(`${emailLocal}@${emailDomain}`)) {
    suffix += 1;
    emailLocal = `${baseEmailLocal}${suffix}`;
  }

  const email = `${emailLocal}@${emailDomain}`;
  emailRegistry.add(email);

  return {
    fullName,
    studentId,
    email,
    phone: `${phonePrefix}${String(index).padStart(5, "0")}`.slice(0, 10),
    department: departmentShort,
    studentType: options.studentType || "Day Scholar",
    year: options.year || "1",
    semester: options.semester || "1",
  };
}

async function seedStudents() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`Usage:
node seed_students.js --count=100 --password=Student@123

Optional:
--start=1
--namePrefix=Student
--studentIdPrefix=BTS
--emailDomain=bitsathy.ac.in
--phonePrefix=90000
--department=cs
--cohort=231
--studentType=Day Scholar
--year=1
--semester=1`);
    process.exit(0);
  }

  const rawCount = parseInt(args.count || "100", 10);
  if (Number.isNaN(rawCount) || rawCount < 1) {
    throw new Error("count must be a positive number.");
  }
  if (rawCount > MAX_BULK_COUNT) {
    throw new Error(`count cannot exceed ${MAX_BULK_COUNT}.`);
  }

  const start = parseInt(args.start || "1", 10);
  if (Number.isNaN(start) || start < 1) {
    throw new Error("start must be a positive number.");
  }

  const sharedPassword = args.password || "Student@123";
  const dueDate =
    args.dueDate ||
    new Date(new Date().setDate(new Date().getDate() + 30))
      .toISOString()
      .split("T")[0];
  const hashedPassword = await bcrypt.hash(sharedPassword, 10);

  const existingEmails = await pool.query(
    "SELECT email FROM students WHERE email ILIKE '%' || $1",
    [`@${args.emailDomain || "bitsathy.ac.in"}`]
  );
  const emailRegistry = new Set(existingEmails.rows.map((r) => r.email));

  let inserted = 0;
  let skipped = 0;

  for (let i = start; i < start + rawCount; i++) {
    const s = buildStudent(i, args, emailRegistry);
    const totalFee = calculateStudentFees(s.studentType, s.semester);

    try {
      const studentRes = await pool.query(
        `INSERT INTO students (full_name, student_id, email, phone, department, password, student_type, year, semester)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [
          s.fullName,
          s.studentId,
          s.email,
          s.phone,
          s.department,
          hashedPassword,
          s.studentType,
          s.year,
          s.semester,
        ]
      );

      if (studentRes.rows.length === 0) {
        skipped++;
        continue;
      }

      const studentDbId = studentRes.rows[0].id;
      await pool.query(
        `INSERT INTO student_fees (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studentDbId, s.email, totalFee, 0, totalFee, dueDate]
      );

      inserted++;
    } catch (err) {
      if (err.code === "23505") {
        skipped++;
        continue;
      }
      throw err;
    }
  }

  console.log("Student seed completed.");
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Shared password used: ${sharedPassword}`);
}

seedStudents()
  .catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
