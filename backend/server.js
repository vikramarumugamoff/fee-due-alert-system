require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

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
// ================= SIGNUP =================
app.post("/signup", async (req, res) => {
  const { fullName, studentId, email, phone, department, password } = req.body;

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
       (full_name, student_id, email, phone, department, password)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, full_name, email`,
      [fullName, studentId, email, phone, department, hashedPassword]
    );

    const student = studentResult.rows[0];

    // Create fee record for new student with random paid amount
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Generate random paid amount between 50,000 and 250,000
    // Initialize fee record with 0 paid
    const unpaidAmount = 275000;

    await pool.query(
      `INSERT INTO student_fees 
       (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [student.id, email, 275000, 0, unpaidAmount, dueDate.toISOString().split('T')[0]]
    );

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
    if (role === "admin") {
      const result = await pool.query("SELECT * FROM admins WHERE email=$1", [email]);
      if (result.rows.length === 0) return res.status(400).json({ message: "Admin not found" });
      const admin = result.rows[0];
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(400).json({ message: "Wrong password" });
      const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
      // store session
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await pool.query(
        'INSERT INTO sessions (user_id, role, token, expires_at) VALUES ($1,$2,$3,$4)',
        [admin.id, 'admin', token, expiresAt]
      );
      return res.json({ message: 'Admin login success', token });
    }

    // default: student
    const result = await pool.query("SELECT * FROM students WHERE email=$1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: "User not found" });
    const user = result.rows[0];
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
      phone: user.phone
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
    pool.query('SELECT * FROM sessions WHERE token=$1 AND expires_at > NOW()', [token])
      .then(result => {
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid or expired token' });
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
    if (role === 'admin') {
      const r = await pool.query('SELECT id, email, name, created_at FROM admins WHERE id=$1', [id]);
      return res.json({ user: r.rows[0] });
    }
    const r = await pool.query('SELECT id, full_name, student_id, email, phone, department, created_at FROM students WHERE id=$1', [id]);
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

// Get student fee data
app.get('/student/fees/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;

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
      result = await pool.query(
        `INSERT INTO student_fees 
         (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [studentId, email, 275000, 0, 275000, dueDate.toISOString().split('T')[0]]
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

// Get student payment history
app.get('/student/payment-history/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      `SELECT id, amount, payment_date, reference_id, description, status 
       FROM payment_history 
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
      status: payment.status
    }));

    res.json(payments);
  } catch (err) {
    console.error('Error fetching payment history:', err);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
});

// Record a payment
app.post('/student/pay-fee', authMiddleware, async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Generate reference ID
    const referenceId = `TXN${Date.now()}`;

    // Insert payment record
    await pool.query(
      `INSERT INTO payment_history 
       (student_email, amount, reference_id, description, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, amount, referenceId, `Fee Payment - Semester Fee`, 'Success']
    );

    // Update student fees
    await pool.query(
      `UPDATE student_fees 
       SET paid_amount = paid_amount + $1,
           unpaid_amount = total_fee - (paid_amount + $1),
           updated_at = NOW()
       WHERE student_email = $2`,
      [amount, email]
    );

    res.json({
      message: 'Payment recorded successfully',
      referenceId: referenceId
    });
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ message: 'Error processing payment' });
  }
});

// ================= ADMIN DASHBOARD ENDPOINTS =================

// Get admin dashboard stats
app.get('/admin/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // 1. Total Students
    // Base: 1304, plus count from DB
    const studentCountResult = await pool.query('SELECT COUNT(*) FROM students');
    const dbStudentCount = parseInt(studentCountResult.rows[0].count);
    const totalStudents = 1304 + dbStudentCount;

    // 2. Fees Collected
    // Base: 21.2 Crores (21,20,00,000), plus sum of paid_amount from student_fees
    const feeCollectedResult = await pool.query('SELECT SUM(paid_amount) FROM student_fees');
    const dbFeeCollected = parseFloat(feeCollectedResult.rows[0].sum || 0);
    const initialFeeCollected = 212000000; // 21.2 Cr
    const totalFeeCollected = initialFeeCollected + dbFeeCollected;

    // 3. Pending Fees
    // Base: 13 Lakhs (13,00,000), plus sum of unpaid_amount from student_fees
    const pendingFeeResult = await pool.query('SELECT SUM(unpaid_amount) FROM student_fees');
    const dbPendingFee = parseFloat(pendingFeeResult.rows[0].sum || 0);
    const initialPendingFee = 1300000; // 13 L
    const totalPendingFee = initialPendingFee + dbPendingFee;

    // 4. Overdue Alerts
    // Count of students with overdue fees (assuming due_date < now and unpaid_amount > 0)
    const overdueResult = await pool.query(
      'SELECT COUNT(*) FROM student_fees WHERE due_date < NOW() AND unpaid_amount > 0'
    );
    const overdueCount = parseInt(overdueResult.rows[0].count);

    // 5. Recent Activity (Mock for now, or fetch from payment_history)
    // fetching last 5 payments
    const historyResult = await pool.query(
      `SELECT ph.*, s.full_name 
       FROM payment_history ph
       JOIN students s ON ph.student_id = s.id
       ORDER BY ph.created_at DESC LIMIT 5`
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
      overdueCount,
      recentActivity: historyResult.rows
    });

  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

// ================= ADMIN STUDENT MANAGEMENT =================

// GET /admin/students - List all students with search and filter
app.get("/admin/students", authMiddleware, async (req, res) => {
  try {
    const { search, status, department } = req.query;

    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.email,
        s.department,
        sf.due_date,
        sf.paid_amount,
        sf.total_fee
      FROM students s
      LEFT JOIN student_fees sf ON s.email = sf.student_email
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      query += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    query += ` ORDER BY s.id DESC`;

    const result = await pool.query(query, params);
    let students = result.rows;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    students = students.map(student => {
      let computedStatus = 'Pending';
      const paid = parseFloat(student.paid_amount || 0);
      const total = parseFloat(student.total_fee || 275000); // Default total fee
      const dueDateStr = student.due_date || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];
      const dueDate = new Date(dueDateStr);

      // Ensure dueDate is also at midnight for accurate comparison
      dueDate.setHours(0, 0, 0, 0);

      if (paid >= total && total > 0) {
        computedStatus = 'Paid';
      } else if (dueDate < today) {
        computedStatus = 'Overdue';
      }

      return {
        ...student,
        status: computedStatus,
        due_date: dueDateStr,
        paid_amount: paid,
        total_fee: total
      };
    });

    if (status) {
      students = students.filter(s => s.status.toLowerCase() === status.toLowerCase());
    }

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /admin/students - Add new student
app.post("/admin/students", authMiddleware, async (req, res) => {
  const { fullName, studentId, email, phone, department, password, dueDate } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password || "Student@123", 10);

    const studentResult = await pool.query(
      `INSERT INTO students (full_name, student_id, email, phone, department, password)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [fullName, studentId, email, phone, department, hashedPassword]
    );

    const newStudentId = studentResult.rows[0].id;
    const feeAmount = 275000;
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
app.put("/admin/students/:id/due-date", authMiddleware, async (req, res) => {
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
        `UPDATE student_fees SET due_date = $1 WHERE student_id = $2`,
        [dueDate, id]
      );
    } else {
      // Fetch email to insert
      const student = await pool.query('SELECT email FROM students WHERE id = $1', [id]);
      if (student.rows.length > 0) {
        await pool.query(
          `INSERT INTO student_fees (student_id, student_email, total_fee, paid_amount, unpaid_amount, due_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, student.rows[0].email, 275000, 0, 275000, dueDate]
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
app.get("/admin/fee-management", authMiddleware, async (req, res) => {
  try {
    const { search, status, department } = req.query;

    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.email,
        s.department,
        sf.due_date,
        sf.paid_amount,
        sf.total_fee
      FROM students s
      LEFT JOIN student_fees sf ON s.email = sf.student_email
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      query += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    query += ` ORDER BY s.id DESC`;

    const result = await pool.query(query, params);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let feeData = result.rows.map(student => {
      const originalFee = parseFloat(student.total_fee || 275000) - parseFloat(student.paid_amount || 0);
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

    if (status) {
      if (status.toLowerCase() === 'overdue') {
        feeData = feeData.filter(s => s.status === 'Overdue' || s.status === 'Critical' || s.status === 'Urgent');
      } else {
        feeData = feeData.filter(s => s.status.toLowerCase() === status.toLowerCase());
      }
    }

    res.json(feeData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /admin/fee-stats - Summary cards
app.get("/admin/fee-stats", authMiddleware, async (req, res) => {
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
  debug: true, // Enable debug output
  logger: true  // Log to console
});

// POST /admin/send-alert - Send email alert
app.post("/admin/send-alert", authMiddleware, async (req, res) => {
  const { email, name, originalFee, fineAmount, dueDate } = req.body;
  try {
    console.log(`📢 ALERT: Attempting to send fee due notification to ${email}...`);

    const mailOptions = {
      from: `"Bannari Amman Institute" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Important: Fee Due Notification - BANNARI AMMAN INSTITUTE OF TECHNOLOGY",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #273c75; border-radius: 10px; color: #2c3e50;">
          <div style="text-align: center; border-bottom: 2px solid #273c75; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color: #273c75; margin: 0; font-size: 24px;">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
            <p style="margin: 5px 0; font-weight: bold;">Sathyamangalam</p>
          </div>
          
          <h2 style="color: #273c75;">Fee Payment Reminder</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>This is a reminder regarding your pending fee payments for the current semester at <strong>Bannari Amman Institute of Technology</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #eee;"><strong>Original Fee:</strong></td>
              <td style="padding: 10px; border: 1px solid #eee;">Rs. ${originalFee.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee;"><strong>Fine Amount:</strong></td>
              <td style="padding: 10px; border: 1px solid #eee; color: ${fineAmount > 0 ? '#e74c3c' : 'inherit'};">Rs. ${fineAmount.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #eee;"><strong>Total Due:</strong></td>
              <td style="padding: 10px; border: 1px solid #eee;"><strong>Rs. ${(originalFee + fineAmount).toLocaleString()}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee;"><strong>Due Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #eee; color: #e74c3c;">${new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px;">Please login to the student portal to clear your dues at the earliest to avoid further penalties.</p>
          
          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #7f8c8d;">
            <p><strong>Admin Office</strong><br>
            Bannari Amman Institute of Technology, Sathyamangalam<br>
            Erode District, Tamil Nadu - 638401</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Success: Alert email sent to ${email}`);
    res.json({ message: `Alert email sent successfully to ${email}!` });
  } catch (err) {
    console.error("❌ Email error DETAILS:", err);
    res.status(500).json({
      message: "Failed to send alert email",
      error: err.message,
      code: err.code
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});