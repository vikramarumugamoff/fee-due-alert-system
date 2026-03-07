-- Run this SQL once to create required tables in Postgres

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  student_id VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  student_type VARCHAR(100),
  year VARCHAR(50),
  semester VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'fee_manager',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'fee_manager',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Sessions table to store active tokens (optional session store)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student Fees table
CREATE TABLE IF NOT EXISTS student_fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  total_fee DECIMAL(10, 2) DEFAULT 104900,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  unpaid_amount DECIMAL(10, 2) DEFAULT 104900,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  due_date DATE,
  reminder_7d_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_48h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_7d_sent_at TIMESTAMP,
  reminder_48h_sent_at TIMESTAMP,
  reminder_24h_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

ALTER TABLE student_fees
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS reminder_7d_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_48h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_7d_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reminder_48h_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP;

-- Payment History table
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  reference_id VARCHAR(100) UNIQUE,
  description VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Fee Structure table
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
);

-- Academic Structure table
CREATE TABLE IF NOT EXISTS academic_structure (
  id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL,
  semester INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (academic_year, semester)
);
