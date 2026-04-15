import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PortalLayout from "../../components/PortalLayout";
import { StudentSidebar } from "../../components/Sidebars";

export default function PaymentHistory() {
  const [student, setStudent] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("paymentHistory");

  useEffect(() => {
    const studentData = localStorage.getItem("studentData");
    const token = localStorage.getItem("token");

    if (!studentData || !token) {
      navigate("/login");
      return;
    }

    const parsedStudent = JSON.parse(studentData);
    setStudent(parsedStudent);

    // Fetch payment history
    fetchPaymentHistory(parsedStudent.email, token);
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
        };
        setStudent(userData);
        localStorage.setItem("studentData", JSON.stringify(userData));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchPaymentHistory = async (email, token) => {
    try {
      const res = await axios.get(
        `http://localhost:5001/student/payment-history/${email}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPaymentHistory(res.data || []);
    } catch (err) {
      console.error("Error fetching payment history:", err);
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
    if (page === "dashboard") {
      navigate("/student/dashboard");
    } else if (page === "feeStructure") {
      navigate("/student/fee-structure");
    } else if (page === "profile") {
      navigate("/student/profile");
    }
  };

  if (loading) {
    return (
      <PortalLayout 
        sidebar={<StudentSidebar student={student} onLogout={handleLogout} />}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273c75] mx-auto mb-4"></div>
            <p className="text-[#5a6c7d]">Loading payment history...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout 
      sidebar={<StudentSidebar student={student} onLogout={handleLogout} />}
      onLogout={handleLogout}
    >
      <header className="bg-white border-b border-[#dcdde1] px-8 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">Payment History</h1>
      </header>

      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#273c75] font-montserrat mb-2">
            Complete Transaction History
          </h2>
          <p className="text-[#5a6c7d] text-sm">
            View all your fee payments and transaction details.
          </p>
        </div>

        {paymentHistory && paymentHistory.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#273c75] font-montserrat">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, index) => (
                    <tr
                      key={index}
                      className="table-row"
                    >
                      <td className="px-6 py-3 font-semibold text-[#273c75] text-sm">
                        {payment.referenceId}
                      </td>
                      <td className="px-6 py-3 text-[#5a6c7d] text-sm">
                        {new Date(payment.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3 text-[#5a6c7d] text-sm">
                        {payment.description}
                      </td>
                      <td className="px-6 py-3 text-[#5a6c7d] text-sm">
                        {payment.paymentMethod || 'Online'}
                      </td>
                      <td className="px-6 py-3 font-bold text-[#1ABC9C] text-sm">
                        ₹{payment.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3">
                        <span className="badge-success">
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <button className="text-[#273c75] hover:text-[#1ABC9C] font-semibold transition text-sm">
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-[#e8f7f5] to-[#d4f1ed] px-6 py-6 border-t border-[#1ABC9C]">
              <div className="flex justify-end items-center gap-8">
                <div>
                  <p className="text-[#1ABC9C] text-sm font-medium">Total Paid</p>
                  <p className="text-2xl font-bold text-[#1ABC9C]">
                    ₹{paymentHistory
                      .reduce((sum, payment) => sum + payment.amount, 0)
                      .toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-[#273c75] text-sm font-medium">Transactions</p>
                  <p className="text-2xl font-bold text-[#273c75]">
                    {paymentHistory.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-[#2c3e50] text-lg font-semibold mb-2">
              No payment history yet
            </p>
            <p className="text-[#5a6c7d] text-sm">
              Your payments will appear here once you start making fee
              payments.
            </p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

