require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const PDFDocument = require("pdfkit");
const cron = require("node-cron");

const app = express();

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected successfully");
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
  }
})();
// Fee Calculation Logic
const calculateStudentFees = (studentType, year, semester) => {
  const sem = Math.min(Math.max(parseInt(semester, 10) || 1, 1), 8);
  const step = sem - 1;
  const isHosteller = String(studentType || "").toLowerCase() === "hosteller";
  const perSemesterIncrease = Number.parseFloat(process.env.SEMESTER_FEE_INCREMENT || "5000") || 5000;

  // Base fee for semester 1. Increase by a fixed amount every semester
  // so semester-wise totals are always visibly different.
  const tuitionFee = 95400 + (step * perSemesterIncrease);
  const examFee = 8300;
  const stationeryFee = 1200;
  const messAdvance = isHosteller ? 47000 : 0;
  const hostelFee = isHosteller ? 57000 : 0;

  const breakdown = {
    tuition: tuitionFee,
    exam: examFee,
    stationery: stationeryFee,
    refreshment: messAdvance, // Mapping Refreshment to Mess Advance
    hostel: hostelFee,
    placement: 0
  };

  const fees = [
    { name: "COLLEGE FEE", amount: breakdown.tuition, description: "Core academic instruction and development charges" },
    { name: "STATIONERY FEES", amount: breakdown.stationery, description: "Academic stationery, notebooks, and lab records" },
    { name: "EXAM FEES", amount: breakdown.exam, description: "Internal and university examination assessment fees" },
  ];

  if (breakdown.hostel > 0) {
    fees.push({ name: "HOSTEL FEE(FOR FOUR OCCUPANCY ROOM)", amount: breakdown.hostel, description: "Accommodation and facility maintenance charges" });
  }

  if (breakdown.refreshment > 0) {
    fees.push({ name: "MESS ADVANCE", amount: breakdown.refreshment, description: "Daily mess and boarding charges" });
  }

  const totalFee = fees.reduce((sum, item) => sum + item.amount, 0);
  return { breakdown: fees, itemized: breakdown, totalFee };
};

const getFeeTotalForStudent = (studentType, year, semester) => {
  const fallbackYear = parseInt(year, 10) || 1;
  const fallbackSemester = parseInt(semester, 10) || ((fallbackYear - 1) * 2 + 1);
  return calculateStudentFees(studentType || "Day Scholar", fallbackYear, fallbackSemester).totalFee;
};

async function syncStudentFeeSummary(student) {
  const expectedTotal = getFeeTotalForStudent(student.student_type, student.year, student.semester);
  await pool.query(
    `UPDATE student_fees
     SET total_fee = $1,
         unpaid_amount = GREATEST($1 - COALESCE(paid_amount, 0), 0),
         status = CASE WHEN GREATEST($1 - COALESCE(paid_amount, 0), 0) <= 0 THEN 'paid' ELSE 'unpaid' END,
         updated_at = NOW()
     WHERE student_id = $2`,
    [expectedTotal, student.id]
  );
}

async function syncAllStudentFeeSummaries() {
  const rows = await pool.query(
    `SELECT s.id, s.student_type, s.year, s.semester
     FROM students s
     JOIN student_fees sf ON sf.student_id = s.id`
  );

  for (const student of rows.rows) {
    await syncStudentFeeSummary(student);
  }
}

async function ensureStudentFeesForMissingStudents() {
  const missing = await pool.query(
    `SELECT s.id, s.email, s.student_type, s.year, s.semester
     FROM students s
     LEFT JOIN student_fees sf ON sf.student_id = s.id
     WHERE sf.id IS NULL`
  );

  if (missing.rows.length === 0) return;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  for (const student of missing.rows) {
    const totalFee = getFeeTotalForStudent(student.student_type, student.year, student.semester);
    await pool.query(
      `INSERT INTO student_fees (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [student.id, student.email, totalFee, 0, totalFee, dueDateStr]
    );
  }
}

// Helper to ensure semester-wise fees exist for a student
const ensureSemesterFees = async (student) => {
  const { id, email, student_type, year, semester } = student;
  await syncStudentFeeSummary(student);

  // Check if current semester exists
  const check = await pool.query('SELECT 1 FROM student_semester_fees WHERE student_id=$1 AND year=$2 AND semester=$3', [id, parseInt(year), parseInt(semester)]);

  if (check.rows.length === 0) {
    const feeStructure = calculateStudentFees(student_type, year, semester);
    const { totalFee, itemized } = feeStructure;

    // 1. Current Semester (Pending)
    await pool.query(
      `INSERT INTO student_semester_fees 
       (student_id, student_email, year, semester, tuition_fee, exam_fee, stationery_fee, refreshment_fee, hostel_fee, placement_fee, total_fee, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, email, parseInt(year), parseInt(semester), itemized.tuition, itemized.exam, itemized.stationery, itemized.refreshment, itemized.hostel, itemized.placement, totalFee, 'Pending']
    );

    // 2. Past Semesters (Paid for Demo)
    const curSem = parseInt(semester);
    for (let s = 1; s < curSem; s++) {
      const pastYear = Math.ceil(s / 2);
      const pastFee = calculateStudentFees(student_type, pastYear, s);
      const { itemized: pItem, totalFee: pTotal } = pastFee;

      // Check if past semester exists
      const pastCheck = await pool.query('SELECT 1 FROM student_semester_fees WHERE student_id=$1 AND semester=$2', [id, s]);
      if (pastCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO student_semester_fees 
           (student_id, student_email, year, semester, tuition_fee, exam_fee, stationery_fee, refreshment_fee, hostel_fee, placement_fee, total_fee, paid_amount, status, payment_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [id, email, pastYear, s, pItem.tuition, pItem.exam, pItem.stationery, pItem.refreshment, pItem.hostel, pItem.placement, pTotal, pTotal, 'Paid', '2025-01-01']
        );
      }
    }
    console.log(`Initialized semester fees for ${email}`);
  }
};

// ================= SIGNUP =================
app.post("/signup", async (req, res) => {
  const { fullName, studentId, email, phone, department, password, studentType, year, semester } = req.body;

  // Email validation
  if (!email.endsWith("@bitsathy.ac.in")) {
    return res.status(400).json({ message: "Email must end with @bitsathy.ac.in" });
  }

  // Strong password validation
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}$/;

  if (!passwordRegex.test(password)) {
    const errors = [];
    if (password.length < 8) errors.push("at least 8 characters");
    if (password.length > 16) errors.push("maximum 16 characters");
    if (!/[A-Z]/.test(password)) errors.push("1 uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("1 lowercase letter");
    if (!/\d/.test(password)) errors.push("1 number");
    if (!/[@$!%*?&]/.test(password)) errors.push("1 special character (@$!%*?&)");

    return res.status(400).json({
      message: `Password must have: ${errors.join(", ")}`,
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const studentResult = await pool.query(
      `INSERT INTO students 
       (full_name, student_id, email, phone, department, password, student_type, year, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, full_name, email`,
      [fullName, studentId, email, phone, department, hashedPassword, studentType, year, semester]
    );

    const student = studentResult.rows[0];

    // Create fee record for new student
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const feeStructure = calculateStudentFees(studentType, year, semester);
    const { totalFee, itemized } = feeStructure;

    await pool.query(
      `INSERT INTO student_fees 
       (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [student.id, email, totalFee, 0, totalFee, dueDate.toISOString().split('T')[0]]
    );

    // Initialize semester-wise table
    // 1. Current Semester (Pending)
    await pool.query(
      `INSERT INTO student_semester_fees 
       (student_id, student_email, year, semester, tuition_fee, exam_fee, stationery_fee, refreshment_fee, hostel_fee, placement_fee, total_fee, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [student.id, email, parseInt(year), parseInt(semester), itemized.tuition, itemized.exam, itemized.stationery, itemized.refreshment, itemized.hostel, itemized.placement, totalFee, 'Pending']
    );

    // 2. Past Semesters (Paid for Demo)
    const curSem = parseInt(semester);
    for (let s = 1; s < curSem; s++) {
      const pastYear = Math.ceil(s / 2);
      const pastFee = calculateStudentFees(studentType, pastYear, s);
      const { itemized: pItem, totalFee: pTotal } = pastFee;

      await pool.query(
        `INSERT INTO student_semester_fees 
         (student_id, student_email, year, semester, tuition_fee, exam_fee, stationery_fee, refreshment_fee, hostel_fee, placement_fee, total_fee, paid_amount, status, payment_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [student.id, email, pastYear, s, pItem.tuition, pItem.exam, pItem.stationery, pItem.refreshment, pItem.hostel, pItem.placement, pTotal, pTotal, 'Paid', '2025-01-01']
      );
    }

    res.json({ message: "Signup successful" });
  } catch (err) {
    console.error("❌ Signup error:", err);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);

    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: "Email or Student ID already exists" });
    }
    return res.status(500).json({ message: err.message || "Signup failed. Please try again." });
  }
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (role === "fee_manager" || role === "admin") {
      const isFeeManager = role === "fee_manager";
      const fallbackEmail = isFeeManager
        ? (process.env.FEE_MANAGER_EMAIL || "feemanager@bitsathy.ac.in")
        : (process.env.ADMIN_EMAIL || "admin@bitsathy.ac.in");
      const fallbackPass = isFeeManager
        ? (process.env.FEE_MANAGER_PASS || "Manaager@1234")
        : (process.env.ADMIN_PASS || "Admin@1234");

      const result = await pool.query("SELECT * FROM admins WHERE email=$1", [email]);
      let admin = result.rows[0];

      if (!admin) {
        if (email !== fallbackEmail || password !== fallbackPass) {
          return res.status(400).json({ message: "Admin not found" });
        }
        const hashed = await bcrypt.hash(password, 10);
        const insertRes = await pool.query(
          "INSERT INTO admins (email, name, role, password) VALUES ($1,$2,$3,$4) RETURNING *",
          [email, isFeeManager ? "Fee Manager" : "Admin", role, hashed]
        );
        admin = insertRes.rows[0];
      } else {
        if (admin.is_active === false) {
          return res.status(403).json({ message: "Account disabled" });
        }
        if (admin.role && admin.role !== role) {
          const canPromoteToAdmin =
            role === "admin" &&
            email === (process.env.ADMIN_EMAIL || "admin@bitsathy.ac.in") &&
            password === (process.env.ADMIN_PASS || "Admin@1234");
          if (!canPromoteToAdmin) {
            return res.status(403).json({ message: "Access denied for this role" });
          }
          const updated = await pool.query(
            "UPDATE admins SET name=$1, role=$2 WHERE id=$3 RETURNING *",
            ["Admin", role, admin.id]
          );
          admin = updated.rows[0];
        }
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
          if (email !== fallbackEmail || password !== fallbackPass) {
            return res.status(400).json({ message: "Wrong password" });
          }
          const hashed = await bcrypt.hash(password, 10);
          const updateRes = await pool.query(
            "UPDATE admins SET password=$1, name=$2, role=$3 WHERE id=$4 RETURNING *",
            [hashed, isFeeManager ? "Fee Manager" : "Admin", role, admin.id]
          );
          admin = updateRes.rows[0];
        }
      }

      const token = jwt.sign({ id: admin.id, role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO sessions (user_id, role, token, expires_at) VALUES ($1,$2,$3,$4)',
        [admin.id, role, token, expiresAt]
      );
      return res.json({ message: `${isFeeManager ? 'Fee Manager' : 'Admin'} login success`, token, name: admin.name, email: admin.email, role });
    }

    // default: student
    const result = await pool.query("SELECT * FROM students WHERE email=$1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: "User not found" });
    const user = result.rows[0];
    if (user.is_active === false) {
      return res.status(403).json({ message: "Account disabled" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });
    const token = jwt.sign({ id: user.id, role: 'student' }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO sessions (user_id, role, token, expires_at) VALUES ($1,$2,$3,$4)',
      [user.id, 'student', token, expiresAt]
    );
    res.json({
      message: "Login success",
      token,
      name: user.full_name,
      email: user.email,
      student_id: user.student_id,
      department: user.department,
      phone: user.phone,
      student_type: user.student_type,
      year: user.year,
      semester: user.semester
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login error' });
  }
});


// ----------------- Auth middleware -----------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    // check session exists and not expired
    pool.query('SELECT role FROM sessions WHERE token=$1 AND expires_at > NOW()', [token])
      .then(result => {
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid or expired token' });
        if (result.rows[0].role !== decoded.role) {
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;
        req.token = token;
        next();
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Auth error' });
      });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Return current user info
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'admin' || role === 'fee_manager') {
      const r = await pool.query('SELECT id, email, name, created_at FROM admins WHERE id=$1', [id]);
      return res.json({ user: r.rows[0] });
    }
    const r = await pool.query('SELECT id, full_name, student_id, email, phone, department, student_type, year, semester, created_at FROM students WHERE id=$1', [id]);
    res.json({ user: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not fetch user' });
  }
});

// Logout (remove session)
app.post('/logout', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE token=$1', [req.token]);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Logout error' });
  }
});

// ================= STUDENT FEE ENDPOINTS =================

// Get student fee breakdown
app.get('/student/fee-structure/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const studentResult = await pool.query('SELECT * FROM students WHERE email=$1', [email]);
    if (studentResult.rows.length === 0) return res.status(404).json({ message: 'Student not found' });

    const student = studentResult.rows[0];
    await ensureSemesterFees(student);

    const { student_type, year } = student;
    const yearInt = parseInt(year);
    const oddSem = (yearInt - 1) * 2 + 1;
    const evenSem = oddSem + 1;

    const oddStructure = calculateStudentFees(student_type, year, oddSem);
    const evenStructure = calculateStudentFees(student_type, year, evenSem);

    res.set("Cache-Control", "no-store");
    res.json({
      academicYear: `2024-25`,
      studentYear: year,
      semesters: [
        { semester: oddSem, type: "Odd Semester", ...oddStructure },
        { semester: evenSem, type: "Even Semester", ...evenStructure }
      ]
    });
  } catch (err) {
    console.error('Error fetching fee structure:', err);
    res.status(500).json({ message: 'Error fetching fee structure' });
  }
});

// Get student fee data
app.get('/student/fees/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;

    // Get student details to ensure fees
    const studentCheck = await pool.query('SELECT * FROM students WHERE email=$1', [email]);
    if (studentCheck.rows.length > 0) {
      await ensureSemesterFees(studentCheck.rows[0]);
    }

    // Get or create fee record for student
    let result = await pool.query(
      'SELECT * FROM student_fees WHERE student_email=$1',
      [email]
    );

    if (result.rows.length === 0) {
      // Create new fee record for student with random paid amount
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Generate random paid amount between 50,000 and 250,000
      // 1. Get student ID from email
      const studentLookup = await pool.query('SELECT id FROM students WHERE email=$1', [email]);
      if (studentLookup.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
      const studentId = studentLookup.rows[0].id;

      // 2. Insert fee record with correct student_id
      const studentData = await pool.query('SELECT student_type, year, semester FROM students WHERE id=$1', [studentId]);
      const initialFee = studentData.rows.length > 0
        ? getFeeTotalForStudent(studentData.rows[0].student_type, studentData.rows[0].year, studentData.rows[0].semester)
        : getFeeTotalForStudent("Day Scholar", 1, 1);

      result = await pool.query(
        `INSERT INTO student_fees 
         (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [studentId, email, initialFee, 0, initialFee, dueDate.toISOString().split('T')[0]]
      );
    }

    const feeData = result.rows[0];
    res.json({
      totalFee: parseFloat(feeData.total_fee),
      paidAmount: parseFloat(feeData.paid_amount),
      unpaidAmount: parseFloat(feeData.unpaid_amount),
      dueDate: new Date(feeData.due_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      lastPaymentDate: new Date(feeData.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    });
  } catch (err) {
    console.error('Error fetching student fees:', err);
    res.status(500).json({ message: 'Error fetching fee data' });
  }
});

// Get completed semesters for receipt download
app.get('/student/completed-semesters/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(
      'SELECT year, semester, status FROM student_semester_fees WHERE student_email=$1 AND status=\'Paid\' ORDER BY year ASC, semester ASC',
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching completed semesters:', err);
    res.status(500).json({ message: 'Error fetching completed semesters' });
  }
});

// Download Receipt PDF
app.get('/student/download-receipt/:email/:year/:semester', authMiddleware, async (req, res) => {
  try {
    const { email, year, semester } = req.params;

    // Fetch student and fee details
    const studentRes = await pool.query('SELECT full_name, student_id, department FROM students WHERE email=$1', [email]);
    const feeRes = await pool.query(
      'SELECT * FROM student_semester_fees WHERE student_email=$1 AND year=$2 AND semester=$3 AND status=\'Paid\'',
      [email, year, semester]
    );

    if (studentRes.rows.length === 0 || feeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Receipt not found or not paid yet' });
    }

    const student = studentRes.rows[0];
    const feeData = feeRes.rows[0];

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt_${student.student_id}_Sem${semester}.pdf`);

    doc.pipe(res);

    // Modern Header structure based on image - Centered
    doc.fillColor('#273c75');
    doc.fontSize(20).font('Helvetica-Bold').text('BANNARI AMMAN INSTITUTE OF TECHNOLOGY', 50, 60, { align: 'center', width: 500 });

    doc.fillColor('black');
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica').text('An Autonomous Institution Affiliated to Anna University Chennai - Approved by AICTE - Accredited by NAAC with "A+" Grade', { align: 'center', width: 500 });
    doc.fontSize(9).font('Helvetica-Bold').text('SATHYAMANGALAM - 638 401    ERODE DISTRICT    TAMIL NADU    INDIA', { align: 'center', width: 500 });
    doc.fontSize(8).font('Helvetica').text('Ph: 04295-226000 / 221289    Fax: 04295-226666    E-mail: stayahead@bitsathy.ac.in    Web: www.bitsathy.ac.in', { align: 'center', width: 500 });

    doc.moveDown(1.5);
    doc.fontSize(16).font('Helvetica-Bold').text(`Fee Receipt`, { align: 'center' });
    doc.moveDown(1);

    // Student Metadata Section
    const metaY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Name:   ${student.full_name.toUpperCase()}`, 50, metaY);

    doc.moveDown(1.5);
    const metaY2 = doc.y;
    doc.text(`Roll No:  ${student.student_id}`, 50, metaY2);
    doc.text(`Year/Branch:  ${year === '1' ? 'I' : year === '2' ? 'II' : year === '3' ? 'III' : 'IV'}/ ${student.department || 'ISE'}`, 250, metaY2);
    doc.text(`H/D:  ${feeData.hostel_fee > 0 ? 'H' : 'D'}`, 430, metaY2);
    doc.text(`Cat:  GQ`, 500, metaY2);

    doc.moveDown(1);

    // Fee Table Header
    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 20).stroke();
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('FEE DETAILS', 60, tableTop + 5);
    doc.text('AMOUNT', 400, tableTop + 5, { align: 'right', width: 140 });

    doc.moveTo(350, tableTop).lineTo(350, tableTop + 20).stroke();

    let currentY = tableTop + 20;
    const items = [
      { name: 'COLLEGE FEE', amount: feeData.tuition_fee },
      { name: 'STATIONERY FEES', amount: feeData.stationery_fee },
      { name: 'EXAM FEES', amount: feeData.exam_fee }
    ];

    if (parseFloat(feeData.hostel_fee) > 0) {
      items.push({ name: 'HOSTEL FEE(FOR FOUR OCCUPANCY ROOM)', amount: feeData.hostel_fee });
    }

    if (parseFloat(feeData.refreshment_fee) > 0) {
      items.push({ name: 'MESS ADVANCE', amount: feeData.refreshment_fee });
    }

    doc.font('Helvetica');
    items.forEach(item => {
      doc.rect(50, currentY, 500, 20).stroke();
      doc.moveTo(350, currentY).lineTo(350, currentY + 20).stroke();
      doc.text(item.name.toUpperCase(), 55, currentY + 5);
      doc.text(parseFloat(item.amount).toLocaleString(), 400, currentY + 5, { align: 'right', width: 140 });
      currentY += 20;
    });

    // Total Row
    doc.rect(50, currentY, 500, 20).stroke();
    doc.moveTo(350, currentY).lineTo(350, currentY + 20).stroke();
    doc.font('Helvetica-Bold').text('TOTAL', 60, currentY + 5, { align: 'right', width: 280 });
    doc.text(parseFloat(feeData.total_fee).toLocaleString(), 400, currentY + 5, { align: 'right', width: 140 });

    // Previous Year Fee Excess
    currentY += 20;
    doc.rect(50, currentY, 500, 20).stroke();
    doc.moveTo(350, currentY).lineTo(350, currentY + 20).stroke();
    doc.font('Helvetica-Bold').text('LESS: PREVIOUS YEAR FEE EXCESS', 60, currentY + 5);
    doc.text('0', 400, currentY + 5, { align: 'right', width: 140 });

    // Net Total
    currentY += 20;
    doc.rect(50, currentY, 500, 20).stroke();
    doc.moveTo(350, currentY).lineTo(350, currentY + 20).stroke();
    doc.font('Helvetica-Bold').text('NET TOTAL', 60, currentY + 5, { align: 'right', width: 280 });
    doc.text(parseFloat(feeData.total_fee).toLocaleString(), 400, currentY + 5, { align: 'right', width: 140 });


    // PAID Stamp - Moved down 2 lines from table
    doc.moveDown(2);
    const paidY = doc.y;
    doc.save();
    doc.rotate(-20, { origin: [480, paidY + 30] });
    doc.fontSize(32).font('Helvetica-Bold').fillColor('red', 0.35);
    doc.text('PAID', 410, paidY + 5, { align: 'center', width: 120 });
    doc.restore();

    // Footer - Positioned one line below PAID
    doc.moveDown(1);
    doc.fillColor('black').fontSize(9).font('Helvetica-Bold');
    doc.text("Note: This is a computer-generated receipt and does not", { align: 'center', lineGap: -1 });
    doc.text("require a physical signature.", { align: 'center', lineGap: -1 });

    doc.end();

  } catch (err) {
    console.error('Error generating receipt:', err);
    res.status(500).json({ message: 'Error generating receipt' });
  }
});

// Get student payment history
app.get('/student/payment-history/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(
      `SELECT id, amount_paid as amount, payment_date, transaction_id as reference_id, 'Fee Payment - Semester Fee' as description, payment_status as status, payment_method 
       FROM payments 
       WHERE student_email=$1 
       ORDER BY payment_date DESC`,
      [email]
    );

    const payments = result.rows.map(payment => ({
      id: payment.id,
      amount: parseFloat(payment.amount),
      date: new Date(payment.payment_date),
      referenceId: payment.reference_id,
      description: payment.description,
      status: payment.status,
      paymentMethod: payment.payment_method
    }));

    res.json(payments);
  } catch (err) {
    console.error('Error fetching payment history:', err);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
});

// Student notifications feed
app.get('/student/notifications', authMiddleware, requireRole(["student"]), async (req, res) => {
  try {
    const studentId = req.user.id;
    const result = await pool.query(
      `SELECT id, title, message, created_at, is_read
       FROM notifications
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [studentId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// Record a payment
app.post('/student/pay-fee', authMiddleware, async (req, res) => {
  try {
    const { email, amount, paymentMethod, semester } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Simulate 2-3 second payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    // Generate transaction ID
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `TXN${todayStr}${randomSuffix}`;

    // Get student_id
    const studentRes = await pool.query('SELECT id FROM students WHERE email = $1', [email]);
    if (studentRes.rows.length === 0) {
       return res.status(404).json({ message: 'Student not found' });
    }
    const studentId = studentRes.rows[0].id;

    // Insert payment record into new payments table
    await pool.query(
      `INSERT INTO payments 
       (student_id, student_email, amount_paid, payment_method, transaction_id, payment_status, semester)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [studentId, email, amount, paymentMethod || 'Online', transactionId, 'Success', semester || 1]
    );

    // Update student fees
    await pool.query(
      `UPDATE student_fees 
       SET paid_amount = paid_amount + $1,
           unpaid_amount = GREATEST(total_fee - (paid_amount + $1), 0),
           status = CASE WHEN (total_fee - (paid_amount + $1)) <= 0 THEN 'paid' ELSE 'Partially Paid' END,
           updated_at = NOW()
       WHERE student_email = $2`,
      [amount, email]
    );

    res.json({
      message: 'Payment Successful',
      transactionId: transactionId
    });
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ message: 'Error processing payment' });
  }
});

// ================= ADMIN DASHBOARD ENDPOINTS =================

// Get admin dashboard stats
app.get('/admin/dashboard-stats', authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  try {
    const studentRows = await pool.query(
      `SELECT s.id, s.email, s.student_type, s.year, s.semester,
              sf.id AS fee_id, sf.paid_amount, sf.unpaid_amount, sf.due_date
       FROM students s
       LEFT JOIN student_fees sf ON sf.student_id = s.id`
    );

    const totalStudents = studentRows.rows.length;
    let totalFeeCollected = 0;
    let totalPendingFee = 0;
    let pendingStudents = 0;
    let overdueCount = 0;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const missingFees = [];

    for (const row of studentRows.rows) {
      if (!row.fee_id) {
        const totalFee = getFeeTotalForStudent(row.student_type, row.year, row.semester);
        totalPendingFee += totalFee;
        pendingStudents += totalFee > 0 ? 1 : 0;
        missingFees.push({
          student_id: row.id,
          student_email: row.email,
          total_fee: totalFee,
          unpaid_amount: totalFee,
          due_date: dueDateStr
        });
        continue;
      }

      const paid = parseFloat(row.paid_amount || 0);
      const unpaid = parseFloat(row.unpaid_amount || 0);
      totalFeeCollected += paid;
      totalPendingFee += unpaid;
      if (unpaid > 0) pendingStudents += 1;

      if (row.due_date) {
        const due = new Date(row.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < today && unpaid > 0) overdueCount += 1;
      }
    }

    if (missingFees.length > 0) {
      await pool.query("BEGIN");
      try {
        for (const fee of missingFees) {
          await pool.query(
            `INSERT INTO student_fees (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [fee.student_id, fee.student_email, fee.total_fee, 0, fee.unpaid_amount, fee.due_date]
          );
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
    }

    // 5. Recent Activity (fetch from new payments table)
    // fetching last 5 payments
    const historyResult = await pool.query(
      `SELECT p.*, s.full_name 
       FROM payments p
       JOIN students s ON p.student_id = s.id
       ORDER BY p.payment_date DESC LIMIT 5`
    );

    // Format for frontend
    // Use Intl.NumberFormat for currency
    const formatCurrency = (amount) => {
      // Logic to display in Cr/L if needed, or just raw for frontend to format
      return amount;
    };

    res.json({
      totalStudents,
      totalFeeCollected,
      totalPendingFee,
      pendingStudents,
      overdueCount,
      recentActivity: historyResult.rows
    });

  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

// ================= ADMIN USER MANAGEMENT =================

app.get("/admin/users", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, role, is_active, created_at FROM admins ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

app.post("/admin/users", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { name, email, role, password } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!email.endsWith("@bitsathy.ac.in")) {
    return res.status(400).json({ message: "Email must end with @bitsathy.ac.in" });
  }

  if (!["admin", "fee_manager"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must be 8-16 chars and include upper, lower, number, and special (@$!%*?&)",
    });
  }

  try {
    const exists = await pool.query("SELECT 1 FROM admins WHERE email=$1", [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO admins (email, name, role, password) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, is_active, created_at",
      [email, name || (role === "admin" ? "Admin" : "Fee Manager"), role, hashed]
    );
    res.json({ message: "User created", user: result.rows[0] });
  } catch (err) {
    console.error("Error creating admin user:", err);
    res.status(500).json({ message: "Error creating user" });
  }
});

app.put("/admin/users/:id/status", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== "boolean") {
    return res.status(400).json({ message: "is_active must be boolean" });
  }

  if (parseInt(id, 10) === req.user.id && is_active === false) {
    return res.status(400).json({ message: "Cannot disable your own account" });
  }

  try {
    const result = await pool.query(
      "UPDATE admins SET is_active=$1 WHERE id=$2 RETURNING id, email, name, role, is_active, created_at",
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Status updated", user: result.rows[0] });
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ message: "Error updating status" });
  }
});

app.put("/admin/users/:id/password", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}$/;

  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must be 8-16 chars and include upper, lower, number, and special (@$!%*?&)",
    });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "UPDATE admins SET password=$1 WHERE id=$2 RETURNING id, email, name, role, is_active, created_at",
      [hashed, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Password reset", user: result.rows[0] });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

// ================= ADMIN FEE STRUCTURE =================
app.get("/admin/fee-structure", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fee_structure ORDER BY academic_year DESC, semester ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching fee structure:", err);
    res.status(500).json({ message: "Error fetching fee structure" });
  }
});

app.post("/admin/fee-structure", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { academic_year, semester, tuition_fee, hostel_fee, exam_fee, other_fee } = req.body;

  if (!academic_year || !semester) {
    return res.status(400).json({ message: "academic_year and semester are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO fee_structure
       (academic_year, semester, tuition_fee, hostel_fee, exam_fee, other_fee)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        academic_year,
        parseInt(semester, 10),
        tuition_fee || 0,
        hostel_fee || 0,
        exam_fee || 0,
        other_fee || 0,
      ]
    );
    res.json({ message: "Fee structure created", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating fee structure:", err);
    res.status(500).json({ message: "Error creating fee structure" });
  }
});

app.put("/admin/fee-structure/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { academic_year, semester, tuition_fee, hostel_fee, exam_fee, other_fee } = req.body;

  try {
    const result = await pool.query(
      `UPDATE fee_structure
       SET academic_year=$1, semester=$2, tuition_fee=$3, hostel_fee=$4, exam_fee=$5, other_fee=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING *`,
      [
        academic_year,
        parseInt(semester, 10),
        tuition_fee || 0,
        hostel_fee || 0,
        exam_fee || 0,
        other_fee || 0,
        id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Fee structure updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating fee structure:", err);
    res.status(500).json({ message: "Error updating fee structure" });
  }
});

app.delete("/admin/fee-structure/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM fee_structure WHERE id=$1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Fee structure deleted" });
  } catch (err) {
    console.error("Error deleting fee structure:", err);
    res.status(500).json({ message: "Error deleting fee structure" });
  }
});

// Alert history for a student
app.get("/admin/students/:id/alerts", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.id, a.sent_at, a.message, a.sent_by,
              adm.name AS sent_by_name, adm.email AS sent_by_email
       FROM alerts a
       LEFT JOIN admins adm ON adm.id = a.sent_by
       WHERE a.student_id = $1
       ORDER BY a.sent_at DESC`,
      [id]
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error("Error fetching alert history:", err);
    res.status(500).json({ message: "Could not load alert history" });
  }
});

// ================= ADMIN ACADEMIC STRUCTURE =================
app.get("/admin/academic-structure", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM academic_structure ORDER BY academic_year DESC, semester ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching academic structure:", err);
    res.status(500).json({ message: "Error fetching academic structure" });
  }
});

app.post("/admin/academic-structure", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { academic_year, semester, start_date, end_date } = req.body;
  if (!academic_year || !semester) {
    return res.status(400).json({ message: "academic_year and semester are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO academic_structure
       (academic_year, semester, start_date, end_date)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [academic_year, parseInt(semester, 10), start_date || null, end_date || null]
    );
    res.json({ message: "Academic structure created", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating academic structure:", err);
    res.status(500).json({ message: "Error creating academic structure" });
  }
});

app.put("/admin/academic-structure/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { academic_year, semester, start_date, end_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE academic_structure
       SET academic_year=$1, semester=$2, start_date=$3, end_date=$4, updated_at=NOW()
       WHERE id=$5
       RETURNING *`,
      [academic_year, parseInt(semester, 10), start_date || null, end_date || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Academic structure updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating academic structure:", err);
    res.status(500).json({ message: "Error updating academic structure" });
  }
});

app.delete("/admin/academic-structure/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM academic_structure WHERE id=$1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Academic structure deleted" });
  } catch (err) {
    console.error("Error deleting academic structure:", err);
    res.status(500).json({ message: "Error deleting academic structure" });
  }
});

// ================= ADMIN STUDENT MANAGEMENT (ADMIN ONLY) =================
app.get("/api/students", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const { search, status, department } = req.query;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.email,
        s.phone,
        s.department,
        s.student_type,
        s.year,
        s.semester,
        s.is_active,
        COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date AS due_date,
        COALESCE(sf.paid_amount, 0) AS paid_amount,
        COALESCE(sf.total_fee, 0) AS total_fee,
        CASE
          WHEN COALESCE(sf.total_fee, 0) > 0 AND COALESCE(sf.paid_amount, 0) >= COALESCE(sf.total_fee, 0) THEN 'Paid'
          WHEN COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date < CURRENT_DATE THEN 'Overdue'
          ELSE 'Pending'
        END AS status
      FROM students s
      LEFT JOIN student_fees sf ON s.email = sf.student_email
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      baseQuery += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      baseQuery += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (status) {
      baseQuery += ` AND LOWER(
        CASE
          WHEN COALESCE(sf.total_fee, 0) > 0 AND COALESCE(sf.paid_amount, 0) >= COALESCE(sf.total_fee, 0) THEN 'Paid'
          WHEN COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date < CURRENT_DATE THEN 'Overdue'
          ELSE 'Pending'
        END
      ) = $${paramIndex}`;
      params.push(String(status).toLowerCase());
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*)::int AS total FROM (${baseQuery}) base`;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const dataQuery = `${baseQuery} ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const dataParams = [...params, limit, offset];
    const result = await pool.query(dataQuery, dataParams);

    res.json({
      data: result.rows,
      total,
      totalPages,
      page,
    });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Error fetching students" });
  }
});

app.post("/api/students", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { fullName, studentId, email, phone, department, password, studentType, year, semester, dueDate } = req.body;

  if (!fullName || !studentId || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!email.endsWith("@bitsathy.ac.in")) {
    return res.status(400).json({ message: "Email must end with @bitsathy.ac.in" });
  }

  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must be 8-16 chars and include upper, lower, number, and special (@$!%*?&)",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedStudentType = studentType || "Day Scholar";
    const normalizedYear = year || "1";
    const normalizedSemester = semester || "1";

    const studentResult = await pool.query(
      `INSERT INTO students 
       (full_name, student_id, email, phone, department, password, student_type, year, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, full_name, email, student_id`,
      [fullName, studentId, email, phone, department, hashedPassword, normalizedStudentType, normalizedYear, normalizedSemester]
    );

    const student = studentResult.rows[0];

    const feeAmount = getFeeTotalForStudent(normalizedStudentType, normalizedYear, normalizedSemester);
    const dueDateValue = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    await pool.query(
      `INSERT INTO student_fees 
       (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [student.id, email, feeAmount, 0, feeAmount, dueDateValue]
    );

    await ensureSemesterFees({
      id: student.id,
      email,
      student_type: normalizedStudentType,
      year: normalizedYear,
      semester: normalizedSemester
    });

    res.json({ message: "Student created", student });
  } catch (err) {
    console.error("Error creating student:", err);
    if (err.code === '23505') {
      return res.status(400).json({ message: "Email or Student ID already exists" });
    }
    res.status(500).json({ message: "Error creating student" });
  }
});

app.put("/api/students/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, department, year, semester } = req.body;

  try {
    const current = await pool.query("SELECT email FROM students WHERE id=$1", [id]);
    if (current.rows.length === 0) return res.status(404).json({ message: "Student not found" });
    const oldEmail = current.rows[0].email;

    const result = await pool.query(
      `UPDATE students
       SET full_name=$1, email=$2, phone=$3, department=$4, year=$5, semester=$6
       WHERE id=$7
       RETURNING id, full_name, email, phone, department, year, semester`,
      [fullName, email, phone, department, year, semester, id]
    );

    if (oldEmail !== email) {
      // Also update email in related tables
      await pool.query("UPDATE student_fees SET student_email=$1 WHERE student_email=$2", [email, oldEmail]);
      await pool.query("UPDATE payments SET student_email=$1 WHERE student_email=$2", [email, oldEmail]);
      await pool.query("UPDATE sessions SET user_id=$1 WHERE user_id=$2 AND role='student'", [id, id]);
    }

    const updatedStudentRes = await pool.query(
      "SELECT id, email, student_type, year, semester FROM students WHERE id=$1",
      [id]
    );
    if (updatedStudentRes.rows.length > 0) {
      await ensureSemesterFees(updatedStudentRes.rows[0]);
    }

    res.json({ message: "Student updated", student: result.rows[0] });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ message: "Error updating student" });
  }
});

app.delete("/api/students/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE students SET is_active=FALSE WHERE id=$1 RETURNING id, full_name, email, is_active",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deactivated", student: result.rows[0] });
  } catch (err) {
    console.error("Error deactivating student:", err);
    res.status(500).json({ message: "Error deactivating student" });
  }
});

app.patch("/api/students/:id/status", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ message: "is_active must be boolean" });
  }
  try {
    const result = await pool.query(
      "UPDATE students SET is_active=$1 WHERE id=$2 RETURNING id, full_name, email, is_active",
      [is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Status updated", student: result.rows[0] });
  } catch (err) {
    console.error("Error updating student status:", err);
    res.status(500).json({ message: "Error updating status" });
  }
});

app.patch("/api/students/:id/reset-password", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}$/;

  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must be 8-16 chars and include upper, lower, number, and special (@$!%*?&)",
    });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "UPDATE students SET password=$1 WHERE id=$2 RETURNING id, full_name, email",
      [hashed, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Password reset", student: result.rows[0] });
  } catch (err) {
    console.error("Error resetting student password:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

// ================= ADMIN STUDENT MANAGEMENT =================

// GET /admin/students - List all students with search and filter
app.get("/admin/students", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  try {
    const { search, status, department } = req.query;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.email,
        s.department,
        s.student_type,
        s.year,
        s.semester,
        COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date AS due_date,
        COALESCE(sf.paid_amount, 0) AS paid_amount,
        COALESCE(sf.total_fee, 0) AS total_fee,
        CASE
          WHEN COALESCE(sf.total_fee, 0) > 0 AND COALESCE(sf.paid_amount, 0) >= COALESCE(sf.total_fee, 0) THEN 'Paid'
          WHEN COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date < CURRENT_DATE THEN 'Overdue'
          ELSE 'Pending'
        END AS status
      FROM students s
      LEFT JOIN student_fees sf ON s.email = sf.student_email
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      baseQuery += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      baseQuery += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (status) {
      baseQuery += ` AND LOWER(
        CASE
          WHEN COALESCE(sf.total_fee, 0) > 0 AND COALESCE(sf.paid_amount, 0) >= COALESCE(sf.total_fee, 0) THEN 'Paid'
          WHEN COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date < CURRENT_DATE THEN 'Overdue'
          ELSE 'Pending'
        END
      ) = $${paramIndex}`;
      params.push(String(status).toLowerCase());
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*)::int AS total FROM (${baseQuery}) base`;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const pageQuery = `
      SELECT * FROM (${baseQuery}) base
      ORDER BY id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const pageParams = [...params, limit, offset];
    const result = await pool.query(pageQuery, pageParams);

    res.json({
      data: result.rows,
      total,
      page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /admin/students - Add new student
app.post("/admin/students", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  const { fullName, studentId, email, phone, department, password, dueDate, year, semester, studentType } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password || "Student@123", 10);
    const normalizedYear = year || "1";
    const normalizedSemester = semester || "1";
    const normalizedStudentType = studentType || "Day Scholar";

    const studentResult = await pool.query(
      `INSERT INTO students (full_name, student_id, email, phone, department, password, student_type, year, semester)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [fullName, studentId, email, phone, department, hashedPassword, normalizedStudentType, normalizedYear, normalizedSemester]
    );

    const newStudentId = studentResult.rows[0].id;
    const feeAmount = getFeeTotalForStudent(normalizedStudentType, normalizedYear, normalizedSemester);
    const initialDue = dueDate || new Date(new Date().setDate(new Date().getDate() + 30));

    await pool.query(
      `INSERT INTO student_fees (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newStudentId, email, feeAmount, 0, feeAmount, initialDue]
    );

    res.json({ message: "Student added successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: "Student ID or Email already exists" });
    }
    res.status(500).json({ message: "Error adding student" });
  }
});

// PUT /admin/students/:id/due-date - Update due date
app.put("/admin/students/:id/due-date", authMiddleware, requireRole(["fee_manager"]), async (req, res) => {
  const { id } = req.params;
  const { dueDate } = req.body;

  try {
    // Check if student exists first to be safe, or just update
    // Update using student_id (which is 'id' in params here as per route, but let's be careful.
    // In GET /admin/students, we return s.id as 'id'. 
    // student_fees has student_id column which links to students.id.

    // UPSERT style: Update or Insert if missing
    const check = await pool.query('SELECT * FROM student_fees WHERE student_id = $1', [id]);

    if (check.rows.length > 0) {
      await pool.query(
        `UPDATE student_fees
         SET due_date = $1,
             reminder_7d_sent = FALSE,
             reminder_48h_sent = FALSE,
             reminder_24h_sent = FALSE,
             reminder_7d_sent_at = NULL,
             reminder_48h_sent_at = NULL,
             reminder_24h_sent_at = NULL,
             updated_at = NOW()
         WHERE student_id = $2`,
        [dueDate, id]
      );
    } else {
      // Fetch email to insert
      const student = await pool.query('SELECT email, student_type, year, semester FROM students WHERE id = $1', [id]);
      if (student.rows.length > 0) {
        const computedTotal = getFeeTotalForStudent(
          student.rows[0].student_type,
          student.rows[0].year,
          student.rows[0].semester
        );
        await pool.query(
          `INSERT INTO student_fees (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, student.rows[0].email, computedTotal, 0, computedTotal, dueDate]
        );
      }
    }

    res.json({ message: "Due date updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating due date" });
  }
});

// ================= FEE MANAGEMENT =================

// GET /admin/fee-management - List students with original fee, fine, and total
app.get("/admin/fee-management", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  try {
    const { search, status, department } = req.query;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.email,
        s.department,
        s.student_type,
        s.year,
        s.semester,
        COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date AS due_date,
        COALESCE(sf.paid_amount, 0) AS paid_amount,
        COALESCE(sf.total_fee, 0) AS total_fee,
        CASE
          WHEN (COALESCE(sf.total_fee, 0) - COALESCE(sf.paid_amount, 0)) <= 0 THEN 'Paid'
          WHEN COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date < CURRENT_DATE THEN
            CASE
              WHEN (CURRENT_DATE - COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date) > 60 THEN 'Critical'
              WHEN (CURRENT_DATE - COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date) > 30 THEN 'Overdue'
              ELSE 'Overdue'
            END
          WHEN COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date = CURRENT_DATE THEN 'Urgent'
          ELSE 'Pending'
        END AS status
      FROM students s
      LEFT JOIN student_fees sf ON s.email = sf.student_email
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      baseQuery += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      baseQuery += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    let statusClause = "";
    if (status) {
      if (String(status).toLowerCase() === "overdue") {
        statusClause = ` AND status IN ('Overdue', 'Critical', 'Urgent')`;
      } else {
        statusClause = ` AND LOWER(status) = $${paramIndex}`;
        params.push(String(status).toLowerCase());
        paramIndex++;
      }
    }

    const countQuery = `SELECT COUNT(*)::int AS total FROM (${baseQuery}) base WHERE 1=1${statusClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const pageQuery = `
      SELECT * FROM (${baseQuery}) base
      WHERE 1=1${statusClause}
      ORDER BY id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const pageParams = [...params, limit, offset];
    const result = await pool.query(pageQuery, pageParams);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let feeData = result.rows.map(student => {
      const effectiveTotal = student.total_fee != null
        ? parseFloat(student.total_fee)
        : getFeeTotalForStudent(student.student_type, student.year, student.semester);
      const originalFee = effectiveTotal - parseFloat(student.paid_amount || 0);
      const dueDateStr = student.due_date || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];
      const dueDate = new Date(dueDateStr);
      dueDate.setHours(0, 0, 0, 0);

      let fineAmount = 0;
      let statusLabel = 'Pending';
      let daysLate = 0;

      if (originalFee <= 0) {
        statusLabel = 'Paid';
      } else if (dueDate < today) {
        const diffTime = Math.abs(today - dueDate);
        daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fineAmount = daysLate * 50;

        if (daysLate > 60) statusLabel = 'Critical';
        else if (daysLate > 30) statusLabel = 'Overdue';
        else statusLabel = 'Overdue';
      } else if (dueDate.getTime() === today.getTime()) {
        statusLabel = 'Urgent';
      }

      return {
        ...student,
        originalFee,
        fineAmount,
        totalDue: originalFee + fineAmount,
        due_date: dueDateStr,
        status: statusLabel,
        daysLate
      };
    });

    res.json({
      data: feeData,
      total,
      page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /admin/fee-stats - Summary cards
app.get("/admin/fee-stats", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                SUM(total_fee - paid_amount) as total_pending
            FROM student_fees
            WHERE total_fee > paid_amount
        `);

    const allFees = await pool.query('SELECT due_date, total_fee, paid_amount FROM student_fees WHERE due_date < NOW() AND total_fee > paid_amount');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalFine = 0;
    allFees.rows.forEach(f => {
      const dueDate = new Date(f.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(today - dueDate) / (1000 * 60 * 60 * 24));
      totalFine += diffDays * 50;
    });

    res.json({
      totalPending: parseFloat(result.rows[0].total_pending || 0),
      totalFine: totalFine,
      alertsSent: 156 // Mock constant for UI consistency
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching fee stats" });
  }
});

const nodemailer = require("nodemailer");

// Email Transporter for Alerts
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true,
  logger: true
});

const REMINDER_CONFIG = {
  "7d": {
    emailFlagColumn: "reminder_7d_sent",
    emailSentAtColumn: "reminder_7d_sent_at",
    intervalSql: "INTERVAL '7 days'",
    title: "Gentle Reminder",
    tone: "This is a gentle reminder that your fee due date is approaching.",
  },
  "48h": {
    emailFlagColumn: "reminder_48h_sent",
    emailSentAtColumn: "reminder_48h_sent_at",
    intervalSql: "INTERVAL '48 hours'",
    title: "Urgent Reminder",
    tone: "Your due date is near. Please pay soon to avoid a fine.",
  },
  "24h": {
    emailFlagColumn: "reminder_24h_sent",
    emailSentAtColumn: "reminder_24h_sent_at",
    intervalSql: "INTERVAL '24 hours'",
    title: "Final Warning",
    tone: "Final warning: your fee is due within 24 hours and a fine may be applied after the due date.",
  },
};

const REMINDER_ORDER = ["7d", "48h", "24h"];

const REMINDER_SQL = {
  "7d": `
    SELECT sf.id, sf.student_id, sf.student_email, sf.unpaid_amount, sf.due_date, s.full_name,
           sf.reminder_7d_sent AS email_sent
    FROM student_fees sf
    JOIN students s ON s.id = sf.student_id
    WHERE sf.status = 'unpaid'
      AND sf.unpaid_amount > 0
      AND sf.reminder_7d_sent = FALSE
      AND (
        sf.due_date::timestamp BETWEEN (NOW() + INTERVAL '7 days') AND (NOW() + INTERVAL '7 days' + INTERVAL '1 hour')
        OR sf.due_date = (NOW() + INTERVAL '7 days')::date
      )
  `,
  "48h": `
    SELECT sf.id, sf.student_id, sf.student_email, sf.unpaid_amount, sf.due_date, s.full_name,
           sf.reminder_48h_sent AS email_sent
    FROM student_fees sf
    JOIN students s ON s.id = sf.student_id
    WHERE sf.status = 'unpaid'
      AND sf.unpaid_amount > 0
      AND sf.reminder_48h_sent = FALSE
      AND (
        sf.due_date::timestamp BETWEEN (NOW() + INTERVAL '48 hours') AND (NOW() + INTERVAL '48 hours' + INTERVAL '1 hour')
        OR sf.due_date = (NOW() + INTERVAL '48 hours')::date
      )
  `,
  "24h": `
    SELECT sf.id, sf.student_id, sf.student_email, sf.unpaid_amount, sf.due_date, s.full_name,
           sf.reminder_24h_sent AS email_sent
    FROM student_fees sf
    JOIN students s ON s.id = sf.student_id
    WHERE sf.status = 'unpaid'
      AND sf.unpaid_amount > 0
      AND sf.reminder_24h_sent = FALSE
      AND (
        sf.due_date::timestamp BETWEEN (NOW() + INTERVAL '24 hours') AND (NOW() + INTERVAL '24 hours' + INTERVAL '1 hour')
        OR sf.due_date = (NOW() + INTERVAL '24 hours')::date
      )
  `,
};

const BULK_ALERT_COOLDOWN_MINUTES = parseInt(process.env.BULK_ALERT_COOLDOWN_MINUTES || "30", 10);

const normalizeBulkFilters = (payload = {}) => ({
  department: payload.department || "",
  semester: payload.semester ? parseInt(payload.semester, 10) || null : null,
  year: payload.year ? parseInt(payload.year, 10) || null : null,
  status: (payload.status || "all").toString().toLowerCase(),
});

function buildBulkAlertClause(filters) {
  const conditions = ["s.is_active = TRUE"];
  const params = [];
  let idx = 1;

  if (filters.department) {
    conditions.push(`s.department = $${idx++}`);
    params.push(filters.department);
  }
  if (filters.semester) {
    conditions.push(`s.semester = $${idx++}`);
    params.push(filters.semester);
  }
  if (filters.year) {
    conditions.push(`s.year = $${idx++}`);
    params.push(filters.year);
  }

  if (filters.status === "pending") {
    conditions.push(`COALESCE(sf.unpaid_amount, 0) > 0 AND COALESCE(sf.paid_amount, 0) = 0`);
  } else if (filters.status === "partially paid" || filters.status === "partially_paid") {
    conditions.push(`COALESCE(sf.unpaid_amount, 0) > 0 AND COALESCE(sf.paid_amount, 0) > 0`);
  } else if (filters.status === "pending_or_partial") {
    conditions.push(`COALESCE(sf.unpaid_amount, 0) > 0`);
  }

  if (conditions.length === 0) conditions.push("1=1");
  return { whereClause: conditions.join(" AND "), params };
}

const formatFiltersForLog = (filters) =>
  JSON.stringify({
    department: filters.department || "All",
    semester: filters.semester || "All",
    year: filters.year || "All",
    status: filters.status || "all",
  });

const computePendingAmount = (row) => {
  if (row.unpaid_amount != null) return parseFloat(row.unpaid_amount);
  const total = parseFloat(row.total_fee || 0);
  const paid = parseFloat(row.paid_amount || 0);
  return Math.max(total - paid, 0);
};

async function sendBulkAlertEmail(student, alertMessage, pendingAmount, dueDate) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_HOST) return false;
    const formattedAmount = `Rs. ${Number(pendingAmount || 0).toLocaleString("en-IN")}`;
    const formattedDue = dueDate ? new Date(dueDate).toLocaleDateString("en-IN") : "N/A";
    const html = `
      <p>Hi ${student.full_name || student.name || "Student"},</p>
      <p>Your pending fee amount is <strong>${formattedAmount}</strong> and is due on <strong>${formattedDue}</strong>.</p>
      <p>${alertMessage}</p>
      <p>Regards,<br/>Fee Management Team</p>
    `;

    await transporter.sendMail({
      from: `"Fee Alert" <${process.env.EMAIL_USER}>`,
      to: student.email || student.student_email,
      subject: "Fee Payment Reminder",
      html,
    });
    return true;
  } catch (err) {
    console.error("[bulk-alert] email send failed:", err.message);
    return false;
  }
}

let isReminderJobRunning = false;

async function ensureReminderColumns() {
  await pool.query(`
    ALTER TABLE student_fees
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS reminder_7d_sent BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reminder_48h_sent BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reminder_7d_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reminder_48h_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP
  `);

  await pool.query(`
    UPDATE student_fees
    SET status = CASE WHEN unpaid_amount <= 0 THEN 'paid' ELSE 'unpaid' END
    WHERE status IS NULL OR status NOT IN ('paid', 'unpaid')
  `);
}

async function ensureAdminRoleColumn() {
  await pool.query(`
    ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'fee_manager'
  `);

  await pool.query(`
    UPDATE admins
    SET role = 'fee_manager'
    WHERE role IS NULL OR role = ''
  `);
}

async function ensureAdminActiveColumn() {
  await pool.query(`
    ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    UPDATE admins
    SET is_active = TRUE
    WHERE is_active IS NULL
  `);
}

async function ensureStudentActiveColumn() {
  await pool.query(`
    ALTER TABLE students
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    UPDATE students
    SET is_active = TRUE
    WHERE is_active IS NULL
  `);
}

// Track alert counts + last sent timestamp on students
async function ensureStudentAlertColumns() {
  await pool.query(`
    ALTER TABLE students
      ADD COLUMN IF NOT EXISTS alert_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_alert_sent TIMESTAMP
  `);
}

// In-app notifications store for students
async function ensureNotificationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL DEFAULT 'Fee Alert',
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_read BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_student_created ON notifications (student_id, created_at DESC)`);
}

// Persist bulk alert audit trail
async function ensureAlertLogTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_log (
      alert_id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      alert_sent_by INTEGER REFERENCES admins(id),
      alert_date TIMESTAMP NOT NULL DEFAULT NOW(),
      filter_used TEXT
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_alert_log_student_date ON alert_log (student_id, alert_date DESC)`);
}

async function ensureFeeStructureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fee_structure (
      id SERIAL PRIMARY KEY,
      academic_year VARCHAR(20) NOT NULL,
      semester INTEGER NOT NULL,
      tuition_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      hostel_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      exam_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      other_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (academic_year, semester)
    )
  `);
}

// Seed default fee structure (all 8 semesters) if none exist
async function ensureDefaultFeeStructure() {
  const existing = await pool.query("SELECT COUNT(*) FROM fee_structure");
  if (parseInt(existing.rows[0].count, 10) > 0) return;

  const academicYear = process.env.ACADEMIC_YEAR || "2024-25";

  for (let sem = 1; sem <= 8; sem++) {
    // use hosteller profile to include hostel + mess in default grid
    const fee = calculateStudentFees("Hosteller", 1, sem);
    const { itemized } = fee;

    // map to columns
    const tuition_fee = itemized.tuition || 0;
    const hostel_fee = itemized.hostel || 0;
    const exam_fee = itemized.exam || 0;
    // place stationery + mess advance into other_fee for visibility/editing
    const other_fee = (itemized.stationery || 0) + (itemized.refreshment || 0);

    await pool.query(
      `INSERT INTO fee_structure (academic_year, semester, tuition_fee, hostel_fee, exam_fee, other_fee)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [academicYear, sem, tuition_fee, hostel_fee, exam_fee, other_fee]
    );
  }
  console.log("Seeded default fee structure for 8 semesters");
}

// Ensure payments table exists (needed for the payment gateway)
async function ensurePaymentsTable() {
  // 1) Create table if missing (fresh setups)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      student_email VARCHAR(255),
      amount_paid NUMERIC NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'Online',
      transaction_id VARCHAR(50) UNIQUE NOT NULL,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      payment_status VARCHAR(50) DEFAULT 'Success',
      semester INTEGER
    )
  `);

  // 2) Backfill columns for older schemas (if table already existed)
  await pool.query(`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS student_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Success',
      ADD COLUMN IF NOT EXISTS semester INTEGER,
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NOT NULL DEFAULT 'Online'
  `);

  // 3) Keep transaction_id unique
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_idx ON payments(transaction_id)'
  );

  // 4) One-time migration of successful rows from legacy payment_history
  const existing = await pool.query('SELECT COUNT(*) FROM payments');
  if (parseInt(existing.rows[0].count, 10) === 0) {
    const history = await pool.query("SELECT * FROM payment_history WHERE status = 'Success'");
    for (const row of history.rows) {
      const studentRes = await pool.query(
        'SELECT id, semester FROM students WHERE email = $1',
        [row.student_email]
      );
      if (studentRes.rows.length === 0) continue;
      const student = studentRes.rows[0];
      await pool.query(
        `INSERT INTO payments (student_id, student_email, amount_paid, payment_method, transaction_id, payment_date, payment_status, semester)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (transaction_id) DO NOTHING`,
        [
          student.id,
          row.student_email,
          row.amount,
          'Net Banking',
          row.reference_id,
          row.payment_date,
          row.status || 'Success',
          student.semester || 1
        ]
      );
    }
  }
}

async function ensureAcademicStructureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic_structure (
      id SERIAL PRIMARY KEY,
      academic_year VARCHAR(20) NOT NULL,
      semester INTEGER NOT NULL,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (academic_year, semester)
    )
  `);
}

function buildReminderEmailHtml({ fullName, unpaidAmount, dueDate, reminderType }) {
  const reminder = REMINDER_CONFIG[reminderType];
  const dueDateText = new Date(dueDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const pendingFee = Number.parseFloat(unpaidAmount) || 0;

  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  let fineAmount = 0;
  if (due < today) {
    const diffDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
    fineAmount = diffDays * 50;
  }

  const totalDue = pendingFee + fineAmount;
  const toneColor = reminderType === "24h" ? "#c0392b" : reminderType === "48h" ? "#d35400" : "#273c75";

  return `
    <div style="font-family: Arial, sans-serif; background: #f7f8fa; padding: 12px;">
      <div style="max-width: 980px; margin: 0 auto; border: 1px solid #273c75; border-radius: 10px; padding: 18px 20px; color: #2c3e50;">
        <div style="text-align: center; border-bottom: 1px solid #273c75; padding-bottom: 12px; margin-bottom: 18px;">
          <h1 style="margin: 0; color: #273c75; font-size: 38px; font-weight: 800; letter-spacing: 0.3px;">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
          <p style="margin: 8px 0 0; font-weight: 700;">Sathyamangalam</p>
        </div>

        <h2 style="margin: 0 0 14px; color: #273c75; font-size: 30px; font-weight: 800;">
          <span style="background: #ffef99; padding: 0 4px;">Fee</span> Payment Reminder
        </h2>

        <p style="margin: 0 0 14px;">Dear <strong>${fullName}</strong>,</p>
        <p style="margin: 0 0 16px;">
          This is a reminder regarding your pending <span style="background: #ffef99; padding: 0 3px;">fee</span> payments for the current semester at
          <strong>Bannari Amman Institute of Technology</strong>.
        </p>

        <p style="margin: 0 0 14px; color: ${toneColor}; font-weight: 800;">${reminder.title}</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 15px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e5ea; width: 52%;"><strong>Pending <span style="background: #ffef99; padding: 0 3px;">Fee</span>:</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e5ea;">Rs. ${pendingFee.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e5ea;"><strong>Fine Amount:</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e5ea; color: ${fineAmount > 0 ? "#e74c3c" : "#2c3e50"};">Rs. ${fineAmount.toLocaleString("en-IN")}</td>
          </tr>
          <tr style="background: #f5f7fb;">
            <td style="padding: 10px; border: 1px solid #e2e5ea;"><strong>Total <span style="background: #ffef99; padding: 0 3px;">Due</span>:</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e5ea;"><strong>Rs. ${totalDue.toLocaleString("en-IN")}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e5ea;"><strong><span style="background: #ffef99; padding: 0 3px;">Due</span> Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e5ea; color: #e74c3c;">${dueDateText}</td>
          </tr>
        </table>

        <p style="margin: 16px 0 0;">Please login to the student portal to clear your dues at the earliest to avoid further penalties.</p>

        <div style="margin-top: 24px; border-top: 1px solid #e2e5ea; padding-top: 16px; color: #637282; font-size: 14px; line-height: 1.55;">
          <p style="margin: 0;"><strong>Admin Office</strong></p>
          <p style="margin: 0;">Bannari Amman Institute of Technology, Sathyamangalam</p>
          <p style="margin: 0;">Erode District, Tamil Nadu - 638401</p>
        </div>
      </div>
    </div>
  `;
}

async function sendFeeReminderEmail(student, reminderType) {
  const html = buildReminderEmailHtml({
    fullName: student.full_name,
    unpaidAmount: student.unpaid_amount,
    dueDate: student.due_date,
    reminderType,
  });

  await transporter.sendMail({
    from: `"Bannari Amman Institute" <${process.env.EMAIL_USER}>`,
    to: student.student_email,
    subject: `Fee Due Reminder - ${REMINDER_CONFIG[reminderType].title}`,
    html,
  });
}

// Store alert record for history
async function recordAlert(studentId, sentByAdminId, message) {
  await pool.query(
    `INSERT INTO alerts (student_id, message, sent_by, sent_at)
     VALUES ($1, $2, $3, NOW())`,
    [studentId, message || "Fee reminder sent", sentByAdminId || null]
  );
}

async function getStudentsForReminder(reminderType) {
  const result = await pool.query(REMINDER_SQL[reminderType]);
  return result.rows;
}

async function markReminderSent(feeId, flagColumn, sentAtColumn) {
  await pool.query(
    `UPDATE student_fees
     SET ${flagColumn} = TRUE,
         ${sentAtColumn} = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [feeId]
  );
}

async function processReminderWindow(reminderType) {
  const students = await getStudentsForReminder(reminderType);
  const reminder = REMINDER_CONFIG[reminderType];

  for (const student of students) {
    if (!student.email_sent) {
      try {
        await sendFeeReminderEmail(student, reminderType);
        await markReminderSent(student.id, reminder.emailFlagColumn, reminder.emailSentAtColumn);
        await recordAlert(student.student_id || student.id, null, `${reminderType} reminder`);
        await pool.query(
          `UPDATE students
           SET alert_count = COALESCE(alert_count, 0) + 1,
               last_alert_sent = NOW()
           WHERE id = $1`,
          [student.student_id || student.id]
        );
        console.log(`[fee-reminder][email] ${reminderType} reminder sent to ${student.student_email}`);
      } catch (err) {
        console.error(`[fee-reminder][email] failed for ${student.student_email}:`, err.message);
      }
    }
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}

async function runFeeReminderJob() {
  if (isReminderJobRunning) {
    console.warn("[fee-reminder] previous run is still active, skipping");
    return;
  }

  isReminderJobRunning = true;

  try {
    await ensureReminderColumns();
    for (const reminderType of REMINDER_ORDER) {
      await processReminderWindow(reminderType);
    }
  } catch (err) {
    console.error("[fee-reminder] cron job failed:", err.message);
  } finally {
    isReminderJobRunning = false;
  }
}

cron.schedule("0 * * * *", async () => {
  await runFeeReminderJob();
});

// Preview recipient count for a bulk alert
app.post("/admin/bulk-alert/preview", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  const filters = normalizeBulkFilters(req.body || {});
  const { whereClause, params } = buildBulkAlertClause(filters);
  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM students s
       LEFT JOIN student_fees sf ON sf.student_id = s.id
       WHERE ${whereClause}`,
      params
    );
    res.json({
      total: countRes.rows[0]?.total || 0,
      filtersUsed: formatFiltersForLog(filters),
    });
  } catch (err) {
    console.error("[bulk-alert] preview error:", err);
    res.status(500).json({ message: "Could not compute bulk alert recipients" });
  }
});

// Send bulk alerts to students by filter
app.post("/admin/bulk-alert/send", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  const filters = normalizeBulkFilters(req.body || {});
  const { whereClause, params } = buildBulkAlertClause(filters);
  const filterUsed = formatFiltersForLog(filters);
  const reminderLine = req.body.message || "Reminder: Your college fee payment is pending. Please complete the payment before the due date.";
  const now = Date.now();

  try {
    const studentsRes = await pool.query(
      `SELECT s.id, s.student_id, s.full_name, s.email, s.department, s.semester, s.year,
              COALESCE(sf.unpaid_amount, 0) AS unpaid_amount,
              COALESCE(sf.total_fee, 0) AS total_fee,
              COALESCE(sf.paid_amount, 0) AS paid_amount,
              COALESCE(sf.due_date, CURRENT_DATE + INTERVAL '30 days')::date AS due_date,
              s.last_alert_sent,
              COALESCE(s.alert_count, 0) AS alert_count
       FROM students s
       LEFT JOIN student_fees sf ON sf.student_id = s.id
       WHERE ${whereClause}`,
      params
    );

    let sent = 0;
    let skipped = 0;
    let recentSkipped = 0;
    let noPendingSkipped = 0;
    let emailSent = 0;

    for (const student of studentsRes.rows) {
      const pendingAmount = computePendingAmount(student);
      if (pendingAmount <= 0) {
        skipped += 1;
        noPendingSkipped += 1;
        continue;
      }

      const last = student.last_alert_sent ? new Date(student.last_alert_sent).getTime() : 0;
      if (last && (now - last) < BULK_ALERT_COOLDOWN_MINUTES * 60 * 1000) {
        skipped += 1;
        recentSkipped += 1;
        continue;
      }

      const dueDate = student.due_date;
      const friendlyDue = dueDate ? new Date(dueDate).toLocaleDateString("en-IN") : "N/A";
      const personalized = `Hi ${student.full_name}, your pending fee amount is Rs. ${pendingAmount.toLocaleString("en-IN")} due on ${friendlyDue}. ${reminderLine}`;

      await pool.query(
        `INSERT INTO notifications (student_id, title, message)
         VALUES ($1, $2, $3)`,
        [student.id, "Fee Payment Reminder", personalized]
      );

      await pool.query(
        `INSERT INTO alert_log (student_id, message, alert_sent_by, filter_used)
         VALUES ($1, $2, $3, $4)`,
        [student.id, personalized, req.user.id || null, filterUsed]
      );

      await recordAlert(student.id, req.user.id, "Bulk alert");

      await pool.query(
        `UPDATE students
         SET alert_count = COALESCE(alert_count, 0) + 1,
             last_alert_sent = NOW()
         WHERE id = $1`,
        [student.id]
      );

      const emailDelivered = await sendBulkAlertEmail(student, reminderLine, pendingAmount, dueDate);
      if (emailDelivered) emailSent += 1;

      sent += 1;
    }

    res.json({
      message: `Alert successfully sent to ${sent} students.`,
      sent,
      skipped,
      recentSkipped,
      noPendingSkipped,
      totalMatched: studentsRes.rows.length,
      emailSent,
      filterUsed,
    });
  } catch (err) {
    console.error("[bulk-alert] send error:", err);
    res.status(500).json({ message: "Failed to send bulk alerts" });
  }
});

// POST /admin/send-alert - Send one manual reminder email
app.post("/admin/send-alert", authMiddleware, requireRole(["fee_manager", "admin"]), async (req, res) => {
  const { email, reminderType: requestedReminderType, dueDate } = req.body;

  const deriveReminderType = (dateValue) => {
    if (!dateValue) return "48h";
    const due = new Date(dateValue);
    if (Number.isNaN(due.getTime())) return "48h";
    const diffHours = (due.getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHours <= 24) return "24h";
    if (diffHours <= 48) return "48h";
    return "7d";
  };

  const reminderType = requestedReminderType || deriveReminderType(dueDate);

  if (!REMINDER_CONFIG[reminderType]) {
    return res.status(400).json({ message: "Invalid reminderType. Use 7d, 48h or 24h." });
  }

  try {
    // Refresh fee summary first to avoid stale amounts
    const studentRow = await pool.query(
      `SELECT id, full_name, student_type, year, semester, email FROM students WHERE email=$1 LIMIT 1`,
      [email]
    );
    if (studentRow.rows.length === 0) return res.status(404).json({ message: "Student not found" });
    await syncStudentFeeSummary(studentRow.rows[0]);

    const result = await pool.query(
      `SELECT sf.id, sf.student_email, sf.unpaid_amount, sf.due_date, s.full_name, s.id AS student_id
       FROM student_fees sf
       JOIN students s ON s.id = sf.student_id
       WHERE sf.student_email = $1
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student fee record not found" });
    }

    const student = result.rows[0];
    await sendFeeReminderEmail(student, reminderType);
    await recordAlert(student.student_id, req.user.id, `Manual ${reminderType} reminder`);
    const updateRes = await pool.query(
      `UPDATE students
       SET alert_count = COALESCE(alert_count, 0) + 1,
           last_alert_sent = NOW()
       WHERE id = $1
       RETURNING alert_count, last_alert_sent`,
      [student.student_id]
    );

    await pool.query(
      `INSERT INTO alert_log (student_id, message, alert_sent_by, filter_used)
       VALUES ($1, $2, $3, $4)`,
      [student.student_id, `Manual ${reminderType} reminder`, req.user.id || null, "manual"]
    );

    res.json({
      message: "Alert sent: email=yes",
      emailSent: true,
      reminderType,
      email: student.student_email,
      alert_count: updateRes.rows[0]?.alert_count || 0,
      last_alert_sent: updateRes.rows[0]?.last_alert_sent || null
    });
  } catch (err) {
    console.error("[manual-alert] send failed:", err);
    res.status(500).json({ message: "Failed to send alert email", error: err.message });
  }
});
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await ensureAdminRoleColumn();
    await ensureAdminActiveColumn();
    await ensureStudentActiveColumn();
    await ensureStudentAlertColumns();
    await ensureNotificationsTable();
    await ensureAlertLogTable();
    await ensureFeeStructureTable();
    await ensureDefaultFeeStructure();
    await ensureAcademicStructureTable();
    await ensurePaymentsTable();
    await ensureReminderColumns();
    await ensureStudentFeesForMissingStudents();
    await syncAllStudentFeeSummaries();
    await runFeeReminderJob();
  } catch (err) {
    console.error("Reminder bootstrap failed:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
