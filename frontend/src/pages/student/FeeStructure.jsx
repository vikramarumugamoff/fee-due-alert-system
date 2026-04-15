import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PortalLayout from "../../components/PortalLayout";
import { StudentSidebar } from "../../components/Sidebars";

export default function FeeStructure() {
  const [student, setStudent] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feeStructure");

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSemesters, setCompletedSemesters] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState({ year: "", semester: "" });

  useEffect(() => {
    const studentData = localStorage.getItem("studentData");
    const token = localStorage.getItem("token");

    if (!studentData || !token) {
      navigate("/login");
      return;
    }

    const localStudent = JSON.parse(studentData);
    setStudent(localStudent);
    fetchFeeStructure(localStudent.email, token);
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
          student_type: res.data.user.student_type,
          year: res.data.user.year,
        };
        setStudent(userData);
        localStorage.setItem("studentData", JSON.stringify(userData));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchFeeStructure = async (email, token) => {
    try {
      const res = await axios.get(`http://localhost:5001/student/fee-structure/${email}?_=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      setFeeData(res.data);
    } catch (err) {
      console.error("Error fetching fee structure:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedSemesters = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`http://localhost:5001/student/completed-semesters/${student.email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompletedSemesters(res.data);
      setShowReceiptModal(true);
    } catch (err) {
      console.error("Error fetching completed semesters:", err);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedReceipt.year || !selectedReceipt.semester) return;

    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(
        `http://localhost:5001/student/download-receipt/${student.email}/${selectedReceipt.year}/${selectedReceipt.semester}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_Year${selectedReceipt.year}_Sem${selectedReceipt.semester}.pdf`);
      document.body.appendChild(link);
      link.click();
      setShowReceiptModal(false);
    } catch (err) {
      console.error("Error downloading receipt:", err);
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
    } else if (page === "paymentHistory") {
      navigate("/student/payment-history");
    } else if (page === "profile") {
      navigate("/student/profile");
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273c75]"></div>
      </div>
    );
  }

  return (
    <PortalLayout 
      sidebar={<StudentSidebar student={student} onLogout={handleLogout} />}
      onLogout={handleLogout}
    >
      <header className="bg-white border-b border-[#dcdde1] px-8 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">Fee Structure</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchCompletedSemesters}
              className="bg-white border border-[#273c75] text-[#273c75] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#f5f6fa] transition-all duration-300 flex items-center gap-2"
            >
              <span>📄</span> Download Receipt
            </button>
            <div className="text-xs font-semibold text-[#273c75] bg-[#e8f0fe] px-4 py-2 rounded-xl border border-[#273c75]/10">
              {student?.student_type} • {student?.year} Year
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#273c75] font-montserrat mb-2">Academic Year {feeData?.academicYear || "2024-25"}</h2>
          <p className="text-[#5a6c7d] text-sm">
            Complete fee structure breakdown for the current academic year based on your student profile.
          </p>
        </div>

        <div className="space-y-12">
          {feeData?.semesters.map((sem, sIdx) => (
            <div key={sIdx} className="max-w-4xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#273c75] text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                  {sem.semester}
                </div>
                <h3 className="text-lg font-bold text-[#273c75] font-montserrat">{sem.type} Structure</h3>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-[#f1f2f6] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-[#f1f2f6]">
                      <th className="px-8 py-5 text-left text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Description</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-[#5a6c7d] font-montserrat uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f2f6]">
                    {sem.breakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors duration-200">
                        <td className="px-8 py-5">
                          <div className="font-semibold text-[#2c3e50]">{item.name}</div>
                          <div className="text-[10px] text-[#5a6c7d] uppercase tracking-wider mt-1">
                            {item.description || "Institutional Fee"}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-[#273c75] text-base">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#f8f9fa]">
                      <td className="px-8 py-6 font-bold text-[#273c75] font-montserrat">Semester {sem.semester} Total</td>
                      <td className="px-8 py-6 text-right font-extrabold text-xl text-[#273c75]">
                        {formatCurrency(sem.totalFee)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Yearly Total Summary Card */}
          <div className="max-w-4xl bg-gradient-to-r from-[#273c75] to-[#1a2847] rounded-3xl p-8 text-white shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold font-montserrat mb-1">Total Academic Year Fees</h3>
                <p className="text-slate-300 text-sm">Combined total for Odd and Even semesters</p>
              </div>
              <div className="text-right">
                <p className="text-[#ff8c42] text-3xl font-extrabold font-montserrat">
                  {formatCurrency(feeData?.semesters.reduce((sum, sem) => sum + sem.totalFee, 0))}
                </p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Payable for 2024-25</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border border-[#f1f2f6] shadow-sm">
            <h3 className="text-sm font-bold text-[#273c75] mb-4 flex items-center gap-2">
              <span className="text-lg">ℹ️</span> Payment Information
            </h3>
            <p className="text-xs text-[#5a6c7d] leading-relaxed">
              Fees are calculated automatically based on your student type (Hosteller/Day Scholar) and academic year.
              Placement fees are applicable only for 3rd-year students, and Hostel fees are applicable only for Hostellers.
            </p>
          </div>
          <div className="bg-[#fff8e6] p-6 rounded-2xl border border-[#ffeeba]">
            <h3 className="text-sm font-bold text-[#856404] mb-4 flex items-center gap-2">
              <span className="text-lg">📅</span> Due Dates
            </h3>
            <p className="text-xs text-[#856404] leading-relaxed">
              Please refer to the main dashboard for your specific payment due date. Late payments may incur a penalty charge of ₹50 per day as per institution policy.
            </p>
          </div>
        </div>
      </div>

      {/* Receipt Selection Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-[#f1f2f6] flex justify-between items-center bg-[#273c75] text-white">
              <h3 className="text-xl font-bold font-montserrat">Download Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-white/70 hover:text-white text-2xl transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-8">
              <p className="text-[#5a6c7d] text-sm mb-6">
                Select the Academic Year and Semester to download your itemized fee receipt.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Academic Year</label>
                  <select
                    value={selectedReceipt.year}
                    onChange={(e) => setSelectedReceipt({ ...selectedReceipt, year: e.target.value, semester: "" })}
                    className="w-full bg-[#f8f9fa] border-2 border-[#f1f2f6] rounded-xl px-4 py-3 text-sm focus:border-[#273c75] focus:ring-0 transition-all outline-none"
                  >
                    <option value="">Select Year</option>
                    {[...new Set(completedSemesters.map(s => s.year))].sort((a, b) => a - b).map(year => (
                      <option key={year} value={year}>{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Semester</label>
                  <select
                    value={selectedReceipt.semester}
                    onChange={(e) => setSelectedReceipt({ ...selectedReceipt, semester: e.target.value })}
                    disabled={!selectedReceipt.year}
                    className="w-full bg-[#f8f9fa] border-2 border-[#f1f2f6] rounded-xl px-4 py-3 text-sm focus:border-[#273c75] focus:ring-0 transition-all outline-none disabled:opacity-50"
                  >
                    <option value="">Select Semester</option>
                    {completedSemesters
                      .filter(s => s.year === parseInt(selectedReceipt.year))
                      .sort((a, b) => a.semester - b.semester)
                      .map(s => (
                        <option key={s.semester} value={s.semester}>Semester {s.semester}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {completedSemesters.length === 0 ? (
                <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100 text-orange-700 text-xs font-medium text-center">
                  No completed semester receipts found for download.
                </div>
              ) : (
                <button
                  disabled={!selectedReceipt.year || !selectedReceipt.semester}
                  onClick={handleDownloadReceipt}
                  className="w-full bg-[#273c75] text-white py-4 rounded-2xl text-base font-bold mt-8 hover:bg-[#1a2847] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 disabled:hover:shadow-none shadow-lg tracking-wide uppercase"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

