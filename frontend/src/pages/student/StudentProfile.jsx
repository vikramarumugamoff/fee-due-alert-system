import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function StudentProfile() {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  // Helper function to convert semester number to readable format
  const getSemesterLabel = (semesterNum) => {
    const num = parseInt(semesterNum);
    if (num === 1) return "1st Semester";
    if (num === 2) return "2nd Semester";
    if (num === 3) return "3rd Semester";
    if (num === 4) return "4th Semester";
    if (num === 5) return "5th Semester";
    if (num === 6) return "6th Semester";
    if (num === 7) return "7th Semester";
    if (num === 8) return "8th Semester";
    return num + "th Semester";
  };

  // Helper function to get academic year from year number
  const getAcademicYear = (yearNum) => {
    const year = parseInt(yearNum);
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - (4 - year);
    return `${startYear}-${startYear + 1}`;
  };

  useEffect(() => {
    const studentData = localStorage.getItem("studentData");
    const token = localStorage.getItem("token");

    if (!studentData || !token) {
      navigate("/login");
      return;
    }

    const localStudent = JSON.parse(studentData);
    setStudent(localStudent);

    // Fetch fresh data from backend
    fetchProfile(token);
  }, [navigate]);

  const fetchProfile = async (token) => {
    try {
      const res = await axios.get("http://localhost:5001/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.user) {
        const userData = {
          name: res.data.user.full_name,
          email: res.data.user.email,
          student_id: res.data.user.student_id,
          department: res.data.user.department,
          phone: res.data.user.phone,
          semester: res.data.user.semester,
          year: res.data.user.year,
        };
        setStudent(userData);
        localStorage.setItem("studentData", JSON.stringify(userData));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentData");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleNavigation = (page) => {
    setActiveTab(page);
    if (page === "dashboard") {
      navigate("/student/dashboard");
    } else if (page === "feeStructure") {
      navigate("/student/fee-structure");
    } else if (page === "paymentHistory") {
      navigate("/student/payment-history");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">
      {/* Sidebar */}
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#dcdde1] fixed h-screen z-10 transition-all duration-300">
        <div className="p-6 border-b border-[#f1f2f6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#273c75] rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
              F
            </div>
            <div>
              <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Due</h2>
              <p className="text-xs text-slate-400">Student Portal</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => handleNavigation("dashboard")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-3 ${activeTab === "dashboard"
              ? "bg-[#273c75] text-white shadow-md"
              : "text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75]"
              }`}
          >
            <span>📊</span> Dashboard
          </button>
          <button
            onClick={() => handleNavigation("feeStructure")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-3 ${activeTab === "feeStructure"
              ? "bg-[#273c75] text-white shadow-md"
              : "text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75]"
              }`}
          >
            <span>📋</span> Fee Structure
          </button>
          <button
            onClick={() => handleNavigation("paymentHistory")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-3 ${activeTab === "paymentHistory"
              ? "bg-[#273c75] text-white shadow-md"
              : "text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75]"
              }`}
          >
            <span>⏱️</span> Payment History
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-3 ${activeTab === "profile"
              ? "bg-[#273c75] text-white shadow-md"
              : "text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75]"
              }`}
          >
            <span>👤</span> My Profile
          </button>
        </nav>

        {student && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e2e6] hover:shadow-sm transition-all duration-300">
              <div className="w-10 h-10 bg-[#273c75] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-xs text-[#273c75] truncate">{student.name}</p>
                <p className="text-xs text-[#5a6c7d] truncate">ID: {student.student_id || "Student"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-white border border-[#dcdde1] hover:bg-[#f5f6fa] text-[#273c75] text-xs font-semibold py-2.5 rounded-lg transition-all duration-300"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="ml-64 w-full">
        <header className="bg-white border-b border-[#dcdde1] px-8 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">My Profile</h1>
        </header>

        <div className="p-8">
          {student && (
            <>
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-[#273c75] to-[#1a2847] text-white rounded-xl shadow-md p-8 mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#1ABC9C] to-[#0fa385] rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold font-montserrat mb-2">{student.name}</h2>
                    <p className="text-slate-300 mb-1">
                      Student ID: {student.student_id}
                    </p>
                    <p className="text-slate-300">Email: {student.email}</p>
                  </div>
                </div>
              </div>

              {/* Profile Information */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Personal Information */}
                <div className="card p-6">
                  <h3 className="text-lg font-bold font-montserrat text-[#273c75] mb-6">
                    Personal Information
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-[#273c75] block mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={student.name}
                        disabled
                        className="input-field bg-[#e8f7f5] border-[#1ABC9C] text-[#273c75]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#273c75] block mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={student.email}
                        disabled
                        className="input-field bg-[#e8f7f5] border-[#1ABC9C] text-[#273c75]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#273c75] block mb-2">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={student.student_id || ""}
                        disabled
                        className="input-field bg-[#e8f7f5] border-[#1ABC9C] text-[#273c75]"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="card p-6">
                  <h3 className="text-lg font-bold font-montserrat text-[#273c75] mb-6">
                    Academic Information
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-[#273c75] block mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={student.department || "N/A"}
                        disabled
                        className="input-field bg-[#e8eef7] border-[#3d5a9f] text-[#273c75]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#273c75] block mb-2">
                        Semester
                      </label>
                      <input
                        type="text"
                        value={getSemesterLabel(student.semester || "1")}
                        disabled
                        className="input-field bg-[#e8eef7] border-[#3d5a9f] text-[#273c75]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#273c75] block mb-2">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={getAcademicYear(student.year || "1")}
                        disabled
                        className="input-field bg-[#e8eef7] border-[#3d5a9f] text-[#273c75]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="card p-6 mb-8">
                <h3 className="text-lg font-bold font-montserrat text-[#273c75] mb-6">
                  Contact Information
                </h3>
                <div>
                  <label className="text-xs font-semibold text-[#273c75] block mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={student.phone || "N/A"}
                    disabled
                    className="input-field bg-[#f5f6fa] border-[#dcdde1] text-[#273c75]"
                  />
                </div>
              </div>

              {/* Account Status */}
              <div className="card p-6">
                <h3 className="text-lg font-bold font-montserrat text-[#273c75] mb-6">
                  Account Status
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-[#e8f5e9] border border-[#4caf50] rounded-lg">
                    <span className="font-semibold text-[#273c75] text-sm">
                      Account Status
                    </span>
                    <span className="badge-success">
                      Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-[#e8f7f5] border border-[#1ABC9C] rounded-lg">
                    <span className="font-semibold text-[#273c75] text-sm">
                      Email Verification
                    </span>
                    <span className="badge-success">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

