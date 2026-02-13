import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  const TOTAL_FEE = 275000;

  useEffect(() => {
    const studentData = localStorage.getItem("studentData");
    const token = localStorage.getItem("token");

    if (!studentData || !token) {
      navigate("/login");
      return;
    }

    const parsedStudent = JSON.parse(studentData);
    setStudent(parsedStudent);
    fetchStudentFeeData(parsedStudent.email, token);
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

  const fetchStudentFeeData = async (email, token) => {
    try {
      const res = await axios.get(`http://localhost:5000/student/fees/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFeeData({
        totalFee: TOTAL_FEE,
        paidAmount: res.data.paidAmount,
        unpaidAmount: res.data.unpaidAmount,
        dueDate: res.data.dueDate || "15 Feb 2026",
        lastPaymentDate: res.data.lastPaymentDate || "Feb 10, 2026",
      });

      const historyRes = await axios.get(
        `http://localhost:5000/student/payment-history/${email}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPaymentHistory(historyRes.data || []);
    } catch (err) {
      console.error("Error fetching fee data:", err);
      // Fallback for demo if backend fails or new student
      setFeeData({
        totalFee: TOTAL_FEE,
        paidAmount: 0,
        unpaidAmount: TOTAL_FEE,
        dueDate: "15 Feb 2026",
        lastPaymentDate: "N/A",
      });
      setPaymentHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentData");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleNavigation = (page) => {
    setActiveTab(page);
    if (page === "feeStructure") navigate("/student/fee-structure");
    else if (page === "paymentHistory") navigate("/student/payment-history");
    else if (page === "profile") navigate("/student/profile");
  };

  const formatCurrency = (amount) => {
    // Logic to display in L if needed, or just raw for frontend to format
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273c75] mx-auto mb-4"></div>
          <p className="text-[#5a6c7d]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">
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
            onClick={() => setActiveTab("dashboard")}
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
                <p className="text-xs text-[#5a6c7d] truncate">{student.rollNumber || "Student"}</p>
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
      <main className="ml-64 w-full p-8 transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">
              Welcome back, {student ? student.name.split(' ')[0] : 'Student'}
            </h1>
            <p className="text-[#5a6c7d] text-sm mt-1">
              Here is your fee status overview.
            </p>
          </div>
          <div className="flex gap-4">
            {/* Icons removed as per user request */}
          </div>
        </div>

        {/* Stats Cards */}
        {feeData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Fee */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#e8f0fe] rounded-xl text-[#273c75] group-hover:scale-110 transition-transform duration-300">
                  💰
                </div>
                <p className="text-xs text-[#5a6c7d] font-semibold">Total Fee</p>
              </div>
              <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                {formatCurrency(feeData.totalFee)}
              </h3>
              <p className="text-xs text-[#5a6c7d] mt-2 font-medium">
                Academic Year 2024-25
              </p>
            </div>

            {/* Paid Amount */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#e6fffa] rounded-xl text-[#1ABC9C] group-hover:scale-110 transition-transform duration-300">
                  ✅
                </div>
                <p className="text-xs text-[#5a6c7d] font-semibold">Paid Amount</p>
              </div>
              <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                {formatCurrency(feeData.paidAmount)}
              </h3>
              <p className="text-xs text-green-500 mt-2 font-medium">
                {Math.ceil((feeData.paidAmount / feeData.totalFee) * 100)}% Paid
              </p>
            </div>

            {/* Pending Fee */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#fff8e6] rounded-xl text-[#f39c12] group-hover:scale-110 transition-transform duration-300">
                  🕒
                </div>
                <p className="text-xs text-[#5a6c7d] font-semibold">Pending</p>
              </div>
              <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                {formatCurrency(feeData.unpaidAmount)}
              </h3>
              <p className="text-xs text-[#f39c12] mt-2 font-medium">
                Due soon
              </p>
            </div>

            {/* Due Date */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#ffecec] rounded-xl text-[#e74c3c] group-hover:scale-110 transition-transform duration-300">
                  📅
                </div>
                <p className="text-xs text-[#5a6c7d] font-semibold">Due Date</p>
              </div>
              <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                {feeData.dueDate && !isNaN(new Date(feeData.dueDate))
                  ? new Date(feeData.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : 'N/A'
                }
              </h3>
              <p className="text-xs text-[#e74c3c] mt-2 font-medium">
                {feeData.dueDate}
              </p>
            </div>
          </div>
        )}

        {/* Warning Alert if pending */}
        {feeData && feeData.unpaidAmount > 0 && (
          <div className="bg-[#fff4e5] border-l-4 border-[#f39c12] p-6 rounded-r-xl mb-8 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-4">
              <div className="text-[#f39c12] text-2xl animate-pulse">⚠️</div>
              <div>
                <p className="text-[#2c3e50] font-bold text-base font-montserrat">Fee Payment Reminder</p>
                <p className="text-[#d35400] text-sm mt-1">
                  Your semester fee of <strong>₹{feeData.unpaidAmount.toLocaleString()}</strong> is due. Please pay to avoid penalties.
                </p>
              </div>
            </div>
            <button className="bg-[#273c75] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1a2847] hover:shadow-lg transition-all duration-300 transform hover:translate-y-[-2px]">
              Pay Now
            </button>
          </div>
        )}

        {/* Recent Payment Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat">Recent Payment Activity</h3>
            <button className="text-xs text-[#273c75] font-semibold hover:underline">View All History</button>
          </div>

          {paymentHistory && paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f1f2f6]">
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Reference ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, index) => (
                    <tr key={index} className="border-b border-[#f1f2f6] hover:bg-[#f8f9fa] transition-colors duration-200">
                      <td className="px-6 py-4 font-semibold text-[#2c3e50] text-xs font-mono">{payment.referenceId}</td>
                      <td className="px-6 py-4 text-[#5a6c7d] text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-[#2c3e50] text-sm">{payment.description}</td>
                      <td className="px-6 py-4 font-bold text-[#273c75] text-sm">₹{payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${payment.status === 'Success' ? 'bg-[#e6fffa] text-[#1ABC9C] border-[#b2f5ea]' : 'bg-[#fff5f5] text-red-500 border-red-100'}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-[#273c75] hover:text-[#1ABC9C] font-semibold text-xs transition-colors duration-200">
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-[#f8f9fa] rounded-xl border-dashed border-2 border-[#e1e2e6]">
              <p className="text-[#5a6c7d] text-sm font-medium">No recent transactions found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
