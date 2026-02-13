-- Run this SQL once to create required tables in Postgres

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  student_id VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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
  total_fee DECIMAL(10, 2) DEFAULT 275000,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  unpaid_amount DECIMAL(10, 2) DEFAULT 275000,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

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
