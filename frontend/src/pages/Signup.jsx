import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function Signup({ inline = false }) {
  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    department: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const departments = [
    "CSE",
    "ECE",
    "MECH",
    "CIVIL",
    "EEE",
    "OTHER",
  ];

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Full name is required";
    if (!form.studentId.trim()) return "Student ID is required";
    if (!form.department) return "Please select a department";
    if (!form.email.trim()) return "Email is required";
    if (!form.phone.trim()) return "Phone number is required";
    if (!form.password) return "Password is required";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSignup = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/signup", {
        fullName: form.fullName,
        studentId: form.studentId,
        department: form.department,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      alert(res.data.message || "Registered successfully");
    } catch (e) {
      alert(e?.response?.data?.message || "Signup failed");
    }
  };

  // If inline prop is true, render only the inner form container so it can be embedded
  const FormContainer = (
    <div className="card p-8 mx-auto" style={{ maxWidth: 520 }}>
      <div className="mb-5">
        <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Full Name *</label>
        <input
          value={form.fullName}
          name="full_name_reg"
          autoComplete="off"
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="e.g. Jane Doe"
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Student ID *</label>
          <input
            value={form.studentId}
            name="student_id_reg"
            autoComplete="off"
            onChange={(e) => handleChange("studentId", e.target.value)}
            placeholder="e.g. 2023-CSE-045"
            className="input-field"
          />
          {form.studentId && (
            <p className="text-[10px] text-[#ff8c42] mt-1 font-bold">
              Entered ID: {form.studentId}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Department *</label>
          <select
            value={form.department}
            onChange={(e) => handleChange("department", e.target.value)}
            className="input-field"
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Email Address *</label>
        <input
          value={form.email}
          name="email_address_reg"
          autoComplete="off"
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="name@bitsathy.ac.in"
          className="input-field"
        />
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Phone Number *</label>
        <input
          value={form.phone}
          name="phone_number_reg"
          autoComplete="off"
          onChange={(e) => handleChange("phone", e.target.value)}
          placeholder="e.g. +91 98765 43210"
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-7">
        <div>
          <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Password *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              name="password_new_reg"
              autoComplete="new-password"
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Create password"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#273c75]"
            >
              {showPassword ? "👁️" : "🙈"}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#273c75] block mb-2 font-montserrat">Confirm Password *</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              name="confirm_password_reg"
              autoComplete="new-password"
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              placeholder="Repeat password"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#273c75]"
            >
              {showConfirmPassword ? "👁️" : "🙈"}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSignup}
        className="btn-primary w-full mb-4"
      >
        Sign Up
      </button>

      <p className="text-center text-xs text-[#5a6c7d]">
        Already have an account? <Link to="/login" className="text-[#273c75] font-semibold hover:text-[#ff8c42] transition">Login here</Link>
      </p>

      <div className="mt-5 p-4 bg-[#ffe4cc] rounded-lg text-xs text-[#273c75] border border-[#ff8c42] font-montserrat">
        ℹ️ Admin accounts are created by the institution and cannot be registered here.
      </div>
    </div>
  );

  if (inline) {
    return FormContainer;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f6fa] to-[#ece8e0] flex items-start">
      <div className="w-full max-w-2xl mx-auto py-16 px-4">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-[#273c75] to-[#ff8c42] text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg font-montserrat">
              F
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#273c75] mb-2 font-montserrat">Student Registration</h2>
          <p className="text-[#5a6c7d] font-semibold text-sm">Fee Due Alert System</p>
          <p className="text-xs text-[#5a6c7d] mt-3">Create your student account to receive timely fee due alerts and access your dashboard.</p>
        </div>

        {FormContainer}

        <p className="text-center text-xs text-[#5a6c7d] mt-8">By registering, you agree to the institution's data and usage policies.</p>
      </div>
    </div>
  );
}
