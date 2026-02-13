import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [role, setRole] = useState("student"); // 'student' or 'admin'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", {
        email,
        password,
        role,
      });

      alert(res.data.message);
      console.log(res.data);

      // Save token to localStorage
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      // Save user data and navigate based on role
      if (role === "student") {
        localStorage.setItem("studentData", JSON.stringify({
          name: res.data.name || email.split("@")[0],
          email: email,
          student_id: res.data.student_id,
          department: res.data.department,
          phone: res.data.phone
        }));
        navigate("/student-dashboard");
      } else if (role === "admin") {
        localStorage.setItem("adminData", JSON.stringify({
          name: res.data.name || email.split("@")[0],
          email: email,
        }));
        navigate("/admin-dashboard");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#f5f6fa] to-[#ece8e0] py-10">
      <div className="w-full max-w-lg px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-10">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-[#273c75] to-[#ff8c42] text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg transform hover:scale-110 transition-transform duration-300 font-montserrat">
              F
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-[#273c75] mb-1 font-montserrat">Fee Due Alert System</h1>
          <p className="text-center text-[#5a6c7d] mb-8 text-xs">Official College Portal</p>

          {/* Role Selector */}
          <div className="bg-[#f5f6fa] p-2 rounded-xl mb-8 flex gap-2 w-full border border-[#dcdde1]">
            <button
              onClick={() => setRole("student")}
              className={`px-6 py-3 rounded-lg text-xs font-bold w-1/2 transition-all duration-300 ${role === "student"
                ? "bg-white text-[#273c75] shadow-md border-2 border-[#273c75] transform scale-105"
                : "text-[#5a6c7d] hover:text-[#273c75]"
                }`}
            >
              Student Portal
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`px-6 py-3 rounded-lg text-xs font-bold w-1/2 transition-all duration-300 ${role === "admin"
                ? "bg-white text-[#273c75] shadow-md border-2 border-[#273c75] transform scale-105"
                : "text-[#5a6c7d] hover:text-[#273c75]"
                }`}
            >
              Administrator
            </button>
          </div>

          {/* Form */}
          <div className="w-full spacey-4">
            <div className="mb-5">
              <label className="text-xs font-semibold text-[#273c75] font-montserrat">{role === "student" ? "Student ID or Email" : "Admin ID"}</label>
              <input
                type="text"
                placeholder={role === "student" ? "e.g. 7376231SE... or email" : "admin@bitsathy.ac.in"}
                className="input-field mt-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold text-[#273c75] font-montserrat">Password</label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="input-field text-sm pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="btn-primary w-full py-3 rounded-xl mb-4 text-sm font-bold"
            >
              Login
            </button>

            {role === "student" && (
              <Link to="/signup">
                <button className="w-full bg-white border-2 border-[#273c75] text-[#273c75] py-3 rounded-xl font-bold hover:bg-[#273c75] hover:text-white transition-all duration-300 transform hover:scale-105 text-sm">
                  Register New Account
                </button>
              </Link>
            )}

            <p className="text-xs text-center text-[#5a6c7d] mt-6 font-montserrat">
              Secure administrative system. Unauthorized access is prohibited and monitored.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
