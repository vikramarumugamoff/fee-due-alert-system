import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function FeeStructure() {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feeStructure");

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
      const res = await axios.get("http://localhost:5000/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.user) {
        const userData = {
          name: res.data.user.full_name,
          email: res.data.user.email,
          student_id: res.data.user.student_id,
          department: res.data.user.department,
          phone: res.data.user.phone,
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
      navigate("/student-dashboard");
    } else if (page === "paymentHistory") {
      navigate("/student/payment-history");
    } else if (page === "profile") {
      navigate("/student/profile");
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
            onClick={() => setActiveTab("feeStructure")}
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
            onClick={() => handleNavigation("profile")}
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
          <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">Fee Structure</h1>
        </header>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#273c75] font-montserrat mb-2">Academic Year 2024-25</h2>
            <p className="text-[#5a6c7d] text-sm">
              Complete fee structure breakdown for the current academic year.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Tuition Fee */}
            <div className="card border-t-4 border-[#273c75] p-6">
              <h3 className="text-lg font-bold text-[#273c75] font-montserrat mb-4">Tuition Fee</h3>
              <div className="space-y-3">
                <div className="flex justify-between pb-2 border-b border-[#dcdde1] text-sm">
                  <span className="text-[#5a6c7d]">Semester 1</span>
                  <span className="font-semibold text-[#273c75]">₹75,000</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-[#dcdde1] text-sm pt-2">
                  <span className="text-[#5a6c7d]">Semester 2</span>
                  <span className="font-semibold text-[#273c75]">₹75,000</span>
                </div>
                <div className="flex justify-between pt-3 bg-[#fff5e6] px-3 py-2 rounded-lg">
                  <span className="font-bold text-[#c67a33] text-sm font-montserrat">Total Tuition</span>
                  <span className="font-bold text-[#ff8c42] text-sm">₹1,50,000</span>
                </div>
              </div>
            </div>

            {/* Other Fees */}
            <div className="card border-t-4 border-[#ff8c42] p-6">
              <h3 className="text-lg font-bold text-[#273c75] font-montserrat mb-4">Other Charges</h3>
              <div className="space-y-3">
                <div className="flex justify-between pb-2 border-b border-[#dcdde1] text-sm">
                  <span className="text-[#5a6c7d]">Laboratory Fee</span>
                  <span className="font-semibold text-[#273c75]">₹30,000</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-[#dcdde1] text-sm pt-2">
                  <span className="text-[#5a6c7d]">Library & Registration</span>
                  <span className="font-semibold text-[#273c75]">₹45,000</span>
                </div>
                <div className="flex justify-between pt-3 bg-[#f0f5ff] px-3 py-2 rounded-lg">
                  <span className="font-bold text-[#273c75] text-sm font-montserrat">Total Other</span>
                  <span className="font-bold text-[#273c75] text-sm">₹75,000</span>
                </div>
              </div>
            </div>

            {/* Additional Fees */}
            <div className="card border-t-4 border-[#ffa366] p-6">
              <h3 className="text-lg font-bold text-[#273c75] font-montserrat mb-4">Additional Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between pb-2 border-b border-[#dcdde1] text-sm">
                  <span className="text-[#5a6c7d]">Sports & Recreation</span>
                  <span className="font-semibold text-[#273c75]">₹15,000</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-[#dcdde1] text-sm pt-2">
                  <span className="text-[#5a6c7d]">Exam & Proctoring</span>
                  <span className="font-semibold text-[#273c75]">₹20,000</span>
                </div>
                <div className="flex justify-between pt-3 bg-[#fff5e6] px-3 py-2 rounded-lg">
                  <span className="font-bold text-[#c67a33] text-sm font-montserrat">Total Additional</span>
                  <span className="font-bold text-[#ff8c42] text-sm">₹35,000</span>
                </div>
              </div>
            </div>

            {/* Grand Total */}
            <div className="card bg-gradient-to-br from-[#273c75] to-[#1a2847] text-white border-none p-6">
              <h3 className="text-lg font-bold font-montserrat mb-4">Grand Total</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between pb-2 border-b border-[#3d5a9f] text-sm">
                  <span>Tuition Fee</span>
                  <span>₹1,50,000</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#3d5a9f] text-sm">
                  <span>Other Charges</span>
                  <span>₹75,000</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-[#3d5a9f] text-sm">
                  <span>Additional Fees</span>
                  <span>₹35,000</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 font-montserrat">
                  <span>TOTAL FEE</span>
                  <span className="text-[#ff8c42]">₹2,75,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="card mt-8 p-6">
            <h3 className="text-lg font-bold text-[#273c75] font-montserrat mb-6">Payment Terms</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="border-l-4 border-[#ff8c42] pl-4 py-2">
                <p className="font-semibold text-[#273c75] mb-1 text-sm font-montserrat">Payment Options</p>
                <p className="text-[#5a6c7d] text-xs">Full payment or 2 installments per semester</p>
              </div>
              <div className="border-l-4 border-[#273c75] pl-4 py-2">
                <p className="font-semibold text-[#273c75] mb-1 text-sm font-montserrat">Due Date</p>
                <p className="text-[#5a6c7d] text-xs">Dynamic from Dashboard</p>
              </div>
              <div className="border-l-4 border-red-500 pl-4 py-2">
                <p className="font-semibold text-[#273c75] mb-1 text-sm font-montserrat">Late Fee</p>
                <p className="text-[#5a6c7d] text-xs">5% additional charge after due date</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
