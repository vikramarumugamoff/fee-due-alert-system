import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // auto-detect role so admins/fee managers don't get treated as students
      let role = "student";
      const idLower = (identifier || "").toLowerCase();
      if (idLower === "admin@bitsathy.ac.in") {
        role = "admin";
      } else if (idLower === "feemanager@bitsathy.ac.in" || idLower.includes("fee")) {
        role = "fee_manager";
      }

      const res = await axios.post("/login", {
        identifier,
        email: identifier, // keep backward compatibility with previous API shape
        password,
        role,
      });

      role = res.data.role || role || "student";
      alert(res.data.message || "Login success");

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      localStorage.setItem("userRole", role);

      if (role === "student") {
        localStorage.setItem(
          "studentData",
          JSON.stringify({
            name: res.data.name || (identifier?.split?.("@")[0] || "Student"),
            email: res.data.email,
            student_id: res.data.student_id,
            department: res.data.department,
            phone: res.data.phone,
            year: res.data.year,
            semester: res.data.semester,
          })
        );
        navigate("/student/dashboard");
      } else if (role === "fee_manager" || role === "admin") {
        localStorage.setItem(
          "adminData",
          JSON.stringify({
            name: res.data.name || "Administrator",
            email: res.data.email || identifier,
            role,
          })
        );
        navigate(role === "fee_manager" ? "/fee-manager/dashboard" : "/admin/dashboard");
      } else {
        navigate("/login");
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
            <BrandLogo size={64} className="drop-shadow-md" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-[#273c75] mb-1 font-montserrat">Fee Due Alert System</h1>
          <p className="text-center text-[#5a6c7d] mb-8 text-xs">Official College Portal</p>

          {/* Form */}
          <div className="w-full spacey-4">
            <div className="mb-5">
              <label className="text-xs font-semibold text-[#273c75] font-montserrat">
                Email or ID
              </label>
              <input
                type="text"
                placeholder="e.g. student email, student ID, or admin email"
                className="input-field mt-2 text-sm"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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

            <p className="text-xs text-center text-[#5a6c7d] mt-6 font-montserrat">
              Secure administrative system. Unauthorized access is prohibited and monitored.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
