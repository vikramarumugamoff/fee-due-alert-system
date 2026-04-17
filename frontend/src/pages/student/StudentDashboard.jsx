import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PortalLayout from "../../components/PortalLayout";
import { StudentSidebar } from "../../components/Sidebars";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();


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
    fetchNotifications(token);
  }, [navigate]);

  const fetchProfile = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/me`, {
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

  const fetchNotifications = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/student/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data?.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    }
  };

  const fetchStudentFeeData = async (email, token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/student/fees/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFeeData({
        totalFee: res.data.totalFee,
        paidAmount: res.data.paidAmount,
        unpaidAmount: res.data.unpaidAmount,
        dueDate: res.data.dueDate,
        lastPaymentDate: res.data.lastPaymentDate,
      });


      const historyRes = await axios.get(
        `${API_BASE_URL}/student/payment-history/${email}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPaymentHistory(historyRes.data || []);
    } catch (err) {
      console.error("Error fetching fee data:", err);
      // Fallback for demo if backend fails or new student
      setFeeData({
        totalFee: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        dueDate: "N/A",
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

  const sidebarContent = <StudentSidebar student={student} onLogout={handleLogout} />;

  return (
    <PortalLayout sidebar={sidebarContent} onLogout={handleLogout}>
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
                  Your pending fee of <strong>₹{feeData.unpaidAmount.toLocaleString()}</strong> is due soon.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/student/payment')}
              className="bg-[#273c75] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1a2847] hover:shadow-lg transition-all duration-300 transform hover:translate-y-[-2px]"
            >
              Pay Now
            </button>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat">Notifications</h3>
            <span className="text-xs font-semibold text-[#273c75] bg-[#e8ecff] px-3 py-1 rounded-full">
              {notifications.length} new
            </span>
          </div>

          {notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.slice(0, 6).map((note) => (
                <div key={note.id} className="flex justify-between gap-4 items-start border border-[#f1f2f6] rounded-xl p-3 bg-[#f9fbff]">
                  <div>
                    <p className="text-sm font-semibold text-[#273c75]">{note.title || "Fee Alert"}</p>
                    <p className="text-sm text-[#2c3e50] leading-snug">{note.message}</p>
                  </div>
                  <p className="text-[11px] text-[#5a6c7d] whitespace-nowrap">
                    {note.created_at ? new Date(note.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#f8f9fa] rounded-xl border border-dashed border-[#e1e2e6]">
              <p className="text-sm text-[#5a6c7d] font-medium">You're all caught up. No new alerts.</p>
            </div>
          )}
        </div>

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
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Method</th>
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
                      <td className="px-6 py-4 text-[#2c3e50] text-sm">{payment.paymentMethod || 'Online'}</td>
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

        {/* Receipt Selection Modal */}
    </PortalLayout>
  );
}

