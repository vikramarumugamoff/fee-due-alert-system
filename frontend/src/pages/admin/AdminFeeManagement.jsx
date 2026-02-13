import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminFeeManagement() {
    const [feeData, setFeeData] = useState([]);
    const [stats, setStats] = useState({
        totalPending: 0,
        totalFine: 0,
        alertsSent: 156
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [status, setStatus] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const adminData = localStorage.getItem("adminData");
        const token = localStorage.getItem("token");

        if (!adminData || !token) {
            navigate("/login");
            return;
        }

        fetchFeeData(token);
        fetchStats(token);
    }, [navigate, search, department, status]);

    const fetchFeeData = async (token) => {
        try {
            const res = await axios.get("http://localhost:5000/admin/fee-management", {
                params: { search, department, status },
                headers: { Authorization: `Bearer ${token}` },
            });
            setFeeData(res.data);
        } catch (err) {
            console.error("Error fetching fee data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (token) => {
        try {
            const res = await axios.get("http://localhost:5000/admin/fee-stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const handleAlert = async (student) => {
        const token = localStorage.getItem("token");
        try {
            const res = await axios.post("http://localhost:5000/admin/send-alert", {
                email: student.email,
                name: student.full_name,
                originalFee: student.originalFee,
                fineAmount: student.fineAmount,
                dueDate: student.due_date
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert(res.data.message);
        } catch (err) {
            console.error("Alert error:", err);
            const errMsg = err.response?.data?.message || "Failed to send alert";
            const errDetail = err.response?.data?.error ? ` (${err.response.data.error})` : "";
            alert(`${errMsg}${errDetail}`);
        }
    };

    const handleExport = () => {
        const doc = new jsPDF();

        // Add header
        doc.setFontSize(18);
        doc.text("Fee Status Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Student Name", "Student ID", "Department", "Original Fee", "Fine Amount", "Total Due", "Due Date", "Status"];
        const tableRows = [];

        feeData.forEach(student => {
            const studentData = [
                student.full_name,
                student.student_id,
                student.department,
                `Rs. ${student.originalFee.toLocaleString()}`,
                student.fineAmount > 0 ? `Rs. ${student.fineAmount.toLocaleString()}` : "--",
                `Rs. ${student.totalDue.toLocaleString()}`,
                new Date(student.due_date).toLocaleDateString('en-GB'),
                student.status
            ];
            tableRows.push(studentData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: {
                fontSize: 8,
                cellPadding: 2,
                textColor: [33, 37, 41] // Darker font tone (almost black)
            },
            headStyles: { fillColor: [39, 60, 117] }
        });
        doc.save(`fee_status_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const formatCurrency = (amount) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return `₹${amount.toLocaleString()}`;
    };

    const handleLogout = () => {
        localStorage.removeItem("adminData");
        localStorage.removeItem("token");
        navigate("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273c75] mx-auto mb-4"></div>
                    <p className="text-[#5a6c7d]">Loading fee management...</p>
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
                            A
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Alert</h2>
                            <p className="text-xs text-slate-400">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="p-4 space-y-2">
                    <button onClick={() => navigate("/admin-dashboard")} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3">
                        <span>📊</span> Dashboard
                    </button>
                    <button
                        onClick={() => navigate("/admin/students")}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
                    >
                        <span>👥</span> Students
                    </button>
                    <button className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3">
                        <span>💳</span> Fee Management
                    </button>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-3 mb-4 p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e2e6]">
                        <img
                            src="https://ui-avatars.com/api/?name=Admin&background=273c75&color=fff"
                            alt="Admin"
                            className="w-10 h-10 rounded-full"
                        />
                        <div className="overflow-hidden">
                            <p className="font-semibold text-xs text-[#273c75] truncate">Super Admin</p>
                            <p className="text-xs text-[#5a6c7d] truncate">Admin@bitsathy.ac.in</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-white border border-[#dcdde1] hover:bg-[#f5f6fa] text-[#273c75] text-xs font-semibold py-2.5 rounded-lg transition-all duration-300"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 w-full p-8 transition-all duration-300">
                <div className="flex justify-between items-center mb-1">
                    <div>
                        <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">
                            Pending Fees Monitoring
                        </h1>
                        <p className="text-[#5a6c7d] text-sm mt-1">
                            Track overdue payments and manage fine alerts.
                        </p>
                    </div>
                </div>

                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
                        <p className="text-xs text-[#5a6c7d] font-semibold mb-2">Total Pending Amount</p>
                        <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                            {formatCurrency(stats.totalPending)}
                        </h3>
                        <p className="text-xs text-[#f39c12] mt-2 font-medium">🕒 18% vs last month</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
                        <p className="text-xs text-[#5a6c7d] font-semibold mb-2">Total Fine Accumulated</p>
                        <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                            ₹{stats.totalFine.toLocaleString()}
                        </h3>
                        <p className="text-xs text-[#e74c3c] mt-2 font-medium">Late fee penalties</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
                        <p className="text-xs text-[#5a6c7d] font-semibold mb-2">Alerts Sent</p>
                        <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
                            {stats.alertsSent}
                        </h3>
                        <p className="text-xs text-green-500 mt-2 font-medium">✅ 98% delivery rate</p>
                    </div>
                </div>

                {/* Filters and Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#f1f2f6] overflow-hidden">
                    <div className="p-6 border-b border-[#f1f2f6] flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-1 gap-4 items-center">
                            <div className="relative flex-1 max-w-md">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search student or ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#f8f9fa] border border-[#e1e2e6] rounded-xl text-sm focus:outline-none focus:border-[#273c75] transition-all"
                                />
                            </div>
                            <select
                                className="px-4 py-2 bg-[#f8f9fa] border border-[#e1e2e6] rounded-xl text-sm focus:outline-none focus:border-[#273c75]"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                <option value="CSE">Computer Science</option>
                                <option value="ECE">Electronics</option>
                                <option value="EEE">Electrical</option>
                                <option value="MECH">Mechanical</option>
                                <option value="Civil">Civil Engineering</option>
                            </select>
                            <select
                                className="px-4 py-2 bg-[#f8f9fa] border border-[#e1e2e6] rounded-xl text-sm focus:outline-none focus:border-[#273c75]"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Critical">Critical</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                        <button
                            onClick={handleExport}
                            className="px-6 py-2.5 bg-[#273c75] text-white rounded-xl text-sm font-bold hover:bg-[#1e2e5a] transition-all shadow-md hover:shadow-lg flex items-center gap-2 border-none cursor-pointer"
                        >
                            📥 Export List
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#f8f9fa] border-b border-[#f1f2f6]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Student Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Original Fee</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Fine Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Total Due</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Due Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f1f2f6]">
                                {feeData.map((s) => (
                                    <tr key={s.id} className="hover:bg-[#fafbfc] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-[#273c75]">
                                                    {s.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#2c3e50]">{s.full_name}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">#{s.student_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5a6c7d]">{s.department}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#2c3e50]">₹{s.originalFee.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-500">
                                            {s.fineAmount > 0 ? `+₹${s.fineAmount.toLocaleString()}` : "--"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#273c75]">₹{s.totalDue.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm text-[#2c3e50] font-medium">{new Date(s.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            {s.daysLate > 0 && <p className="text-[10px] text-red-500">{s.daysLate} days late</p>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${s.status === 'Overdue' ? 'bg-red-50 text-red-600' :
                                                s.status === 'Critical' ? 'bg-red-600 text-white' :
                                                    s.status === 'Urgent' ? 'bg-orange-50 text-orange-600' :
                                                        s.status === 'Paid' ? 'bg-green-50 text-green-600' :
                                                            'bg-blue-50 text-blue-600'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {s.status !== 'Paid' ? (
                                                <button
                                                    onClick={() => handleAlert(s)}
                                                    className="bg-[#273c75] hover:bg-[#1e2e5a] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 mx-auto"
                                                >
                                                    🔔 Alert
                                                </button>
                                            ) : (
                                                <button className="text-gray-400 text-xs font-bold cursor-not-allowed">
                                                    Details
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
