import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminFeeManagement() {
    const [feeData, setFeeData] = useState([]);
    const [admin, setAdmin] = useState(null);
    const [role, setRole] = useState("");
    const [stats, setStats] = useState({
        totalPending: 0,
        totalFine: 0,
        alertsSent: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [status, setStatus] = useState("");
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFilters, setBulkFilters] = useState({
        department: "",
        semester: "",
        year: "",
        status: "all"
    });
    const [bulkPreview, setBulkPreview] = useState({ total: 0, loading: false });
    const [bulkMessage, setBulkMessage] = useState("Reminder: Your college fee payment is pending. Please complete the payment before the due date.");
    const [sendingBulk, setSendingBulk] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [history, setHistory] = useState([]);
    const [historyStudent, setHistoryStudent] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const navigate = useNavigate();
    const limit = 10;
    const cooldownMinutes = import.meta.env.VITE_BULK_ALERT_COOLDOWN_MINUTES || 30;

    useEffect(() => {
        const adminData = localStorage.getItem("adminData");
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("userRole");

        if (!adminData || !token || !["fee_manager", "admin"].includes(userRole)) {
          navigate("/login");
          return;
        }

        if (userRole === "admin") {
            navigate("/admin-dashboard");
            return;
        }

        setRole(userRole);
        if (adminData) {
            setAdmin(JSON.parse(adminData));
        }
        fetchFeeData(token);
        fetchStats(token);
    }, [navigate, search, department, status, page]);

    useEffect(() => {
        if (showBulkModal) {
            fetchBulkPreview();
        }
    }, [showBulkModal, bulkFilters]);

    const fetchFeeData = async (token) => {
        try {
            const res = await axios.get("/admin/fee-management", {
                params: { search, department, status, page, limit },
                headers: { Authorization: `Bearer ${token}` },
            });
            setFeeData(res.data?.data || []);
            setTotal(res.data?.total || 0);
            setTotalPages(res.data?.totalPages || 1);
        } catch (err) {
            console.error("Error fetching fee data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (token) => {
        try {
            const res = await axios.get("/admin/fee-stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const fetchBulkPreview = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setBulkPreview((prev) => ({ ...prev, loading: true }));
        try {
            const res = await axios.post("/admin/bulk-alert/preview", {
                ...bulkFilters
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBulkPreview({ total: res.data?.total || 0, loading: false });
        } catch (err) {
            console.error("Bulk preview error:", err);
            setBulkPreview((prev) => ({ ...prev, loading: false }));
            alert(err.response?.data?.message || "Could not load bulk alert count");
        }
    };

    const handleBulkSend = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setSendingBulk(true);
        try {
            const res = await axios.post("/admin/bulk-alert/send", {
                ...bulkFilters,
                message: bulkMessage
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert(res.data?.message || "Alert sent");
            fetchStats(token);
            fetchFeeData(token);
            fetchBulkPreview();
            setShowBulkModal(false);
        } catch (err) {
            console.error("Bulk send error:", err);
            const errMsg = err.response?.data?.message || "Failed to send bulk alerts";
            alert(errMsg);
        } finally {
            setSendingBulk(false);
        }
    };

    const handleAlert = async (student) => {
        const token = localStorage.getItem("token");
        const last = student.last_alert_sent
            ? new Date(student.last_alert_sent).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "No alerts yet";
        const totalAlerts = student.alert_count || 0;
        const proceed = window.confirm(`Last Alert Sent: ${last}\nTotal Alerts Sent: ${totalAlerts}\n\nSend a new alert now?`);
        if (!proceed) return;

        try {
            const res = await axios.post("/admin/send-alert", {
                email: student.email,
                dueDate: student.due_date,
                message: `Manual reminder for ${student.full_name}`
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const emailPart = res.data.emailSent ? "Email sent" : "Email failed";
            alert(`${res.data.message}\n${emailPart}\n\nTotal Alerts Sent: ${res.data.alert_count || 0}\nLast Alert Sent: ${res.data.last_alert_sent ? new Date(res.data.last_alert_sent).toLocaleString("en-GB") : "-"}`);

            // update local state with new counts
            setFeeData((prev) => prev.map((s) => s.id === student.id ? {
                ...s,
                alert_count: res.data.alert_count || 0,
                last_alert_sent: res.data.last_alert_sent
            } : s));
            fetchStats(token);
        } catch (err) {
            console.error("Alert error:", err);
            const errMsg = err.response?.data?.message || "Failed to send alert";
            const errDetail = err.response?.data?.error ? ` (${err.response.data.error})` : "";
            alert(`${errMsg}${errDetail}`);
        }
    };

    const handleHistory = async (student) => {
        const token = localStorage.getItem("token");
        try {
            const res = await axios.get(`/admin/students/${student.id}/alerts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.alerts || []);
            setHistoryStudent(student);
            setShowHistory(true);
        } catch (err) {
            console.error("History fetch error:", err);
            alert("Could not load alert history.");
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
        localStorage.removeItem("userRole");
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
        <>
        <div className="min-h-screen bg-[#f5f6fa] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#dcdde1] fixed h-screen z-10 transition-all duration-300">
                <div className="p-6 border-b border-[#f1f2f6]">
                    <div className="flex items-center gap-3">
                        <BrandLogo size={40} />
                        <div>
                            <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Alert</h2>
                            <p className="text-xs text-slate-400">{role === "admin" ? "Admin Panel" : "Fee Manager Panel"}</p>
                        </div>
                    </div>
                </div>

                <nav className="p-4 space-y-2">
                    <button onClick={() => navigate(role === "admin" ? "/admin/dashboard" : "/fee-manager/dashboard")} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3">
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
                            <p className="font-semibold text-xs text-[#273c75] truncate">{role === "admin" ? "Admin" : "Fee Manager"}</p>
                            <p className="text-xs text-[#5a6c7d] truncate">{admin?.email || "-"}</p>
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
                <div className="sticky top-0 z-20 -mx-8 px-8 pb-4 bg-[#f5f6fa]">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
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
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-[#f8f9fa] border border-[#e1e2e6] rounded-xl text-sm focus:outline-none focus:border-[#273c75] transition-all"
                                />
                            </div>
                            <select
                                className="px-4 py-2 bg-[#f8f9fa] border border-[#e1e2e6] rounded-xl text-sm focus:outline-none focus:border-[#273c75]"
                                value={department}
                                onChange={(e) => {
                                    setDepartment(e.target.value);
                                    setPage(1);
                                }}
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
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Critical">Critical</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button
                                onClick={() => { setShowBulkModal(true); fetchBulkPreview(); }}
                                className="px-6 py-2.5 bg-white text-[#273c75] border border-[#273c75] rounded-xl text-sm font-bold hover:bg-[#e8ecff] transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                            >
                                Bulk Alert
                            </button>
                            <button
                                onClick={handleExport}
                                className="px-6 py-2.5 bg-[#273c75] text-white rounded-xl text-sm font-bold hover:bg-[#1e2e5a] transition-all shadow-md hover:shadow-lg flex items-center gap-2 border-none cursor-pointer"
                            >
                                📥 Export List
                            </button>
                        </div>
                    </div>

                    <div className="table-scroll-wrapper">
                        <table className="w-full table-sticky-header">
                            <thead className="bg-[#f8f9fa] border-b border-[#f1f2f6]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Student Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Original Fee</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Fine Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Total Due</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Alerts Sent</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#5a6c7d] uppercase tracking-wider">Last Alert Sent</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2c3e50] font-semibold">{s.alert_count || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5a6c7d]">
                                            {s.last_alert_sent ? new Date(s.last_alert_sent).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                                        </td>
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
                                            <div className="flex flex-col gap-2 items-center">
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
                                                <button
                                                    onClick={() => handleHistory(s)}
                                                    className="text-[#273c75] hover:text-[#1e2e5a] text-[11px] font-semibold underline"
                                                >
                                                    View History
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-[#e1e2e6] flex justify-between items-center text-xs text-[#5a6c7d]">
                        <p>Showing {feeData.length} of {total} entries</p>
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1 bg-[#f8f9fa] border border-[#dcdde1] rounded hover:bg-[#e1e2e6] disabled:opacity-50"
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page <= 1}
                            >
                                Previous
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                const pageNum = start + i;
                                if (pageNum > totalPages) return null;
                                return (
                                    <button
                                        key={pageNum}
                                        className={`px-3 py-1 rounded ${pageNum === page ? "bg-[#273c75] text-white" : "bg-[#f8f9fa] border border-[#dcdde1] hover:bg-[#e1e2e6]"}`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                className="px-3 py-1 bg-[#f8f9fa] border border-[#dcdde1] rounded hover:bg-[#e1e2e6] disabled:opacity-50"
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                disabled={page >= totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        {showBulkModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-[#273c75]">Bulk Alert</h3>
                            <p className="text-sm text-[#5a6c7d]">Select filters to target students and send reminders in one go.</p>
                        </div>
                        <button
                            onClick={() => setShowBulkModal(false)}
                            className="text-[#273c75] hover:text-[#1e2e5a] font-bold text-lg"
                        >
                            âœ•
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs uppercase tracking-wide text-[#5a6c7d] font-semibold">Department</label>
                            <select
                                className="mt-1 w-full px-3 py-2 border border-[#e1e2e6] rounded-lg bg-[#f8f9fa] text-sm focus:outline-none focus:border-[#273c75]"
                                value={bulkFilters.department}
                                onChange={(e) => setBulkFilters((prev) => ({ ...prev, department: e.target.value }))}
                            >
                                <option value="">All</option>
                                <option value="CSE">CSE</option>
                                <option value="IT">IT</option>
                                <option value="ECE">ECE</option>
                                <option value="EEE">EEE</option>
                                <option value="MECH">MECH</option>
                                <option value="CIVIL">CIVIL</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wide text-[#5a6c7d] font-semibold">Semester</label>
                            <select
                                className="mt-1 w-full px-3 py-2 border border-[#e1e2e6] rounded-lg bg-[#f8f9fa] text-sm focus:outline-none focus:border-[#273c75]"
                                value={bulkFilters.semester || ""}
                                onChange={(e) => setBulkFilters((prev) => ({ ...prev, semester: e.target.value }))}
                            >
                                <option value="">All</option>
                                {[...Array(8)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wide text-[#5a6c7d] font-semibold">Year</label>
                            <select
                                className="mt-1 w-full px-3 py-2 border border-[#e1e2e6] rounded-lg bg-[#f8f9fa] text-sm focus:outline-none focus:border-[#273c75]"
                                value={bulkFilters.year || ""}
                                onChange={(e) => setBulkFilters((prev) => ({ ...prev, year: e.target.value }))}
                            >
                                <option value="">All</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wide text-[#5a6c7d] font-semibold">Fee Status</label>
                            <select
                                className="mt-1 w-full px-3 py-2 border border-[#e1e2e6] rounded-lg bg-[#f8f9fa] text-sm focus:outline-none focus:border-[#273c75]"
                                value={bulkFilters.status}
                                onChange={(e) => setBulkFilters((prev) => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="partially_paid">Partially Paid</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase tracking-wide text-[#5a6c7d] font-semibold">Reminder message</label>
                        <textarea
                            className="mt-1 w-full px-3 py-2 border border-[#e1e2e6] rounded-lg bg-[#f8f9fa] text-sm focus:outline-none focus:border-[#273c75] resize-none"
                            rows={3}
                            value={bulkMessage}
                            onChange={(e) => setBulkMessage(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between bg-[#f8f9fa] border border-[#e1e2e6] rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-[#273c75]">
                                {bulkPreview.loading ? "Calculating recipients..." : `${bulkPreview.total} students match these filters.`}
                            </p>
                            <p className="text-xs text-[#5a6c7d]">Duplicate alerts are blocked for {cooldownMinutes} minutes.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={fetchBulkPreview}
                                className="px-4 py-2 text-sm font-semibold text-[#273c75] bg-white border border-[#273c75] rounded-lg hover:bg-[#e8ecff]"
                            >
                                Refresh Count
                            </button>
                            <button
                                onClick={handleBulkSend}
                                disabled={sendingBulk || bulkPreview.loading}
                                className={`px-5 py-2 text-sm font-bold rounded-lg text-white ${sendingBulk ? "bg-[#9aa3c2] cursor-not-allowed" : "bg-[#273c75] hover:bg-[#1e2e5a]"}`}
                            >
                                {sendingBulk ? "Sending..." : "Send Alert"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showHistory && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#273c75]">Alert History</h3>
                            <p className="text-sm text-[#5a6c7d]">
                                {historyStudent?.full_name} • #{historyStudent?.student_id}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="text-[#273c75] hover:text-[#1e2e5a] font-bold text-lg"
                        >
                            ✕
                        </button>
                    </div>
                    {history.length === 0 ? (
                        <p className="text-sm text-[#5a6c7d]">No alerts sent yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#f8f9fa]">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-[#5a6c7d] font-bold">Alert No.</th>
                                        <th className="text-left px-4 py-2 text-[#5a6c7d] font-bold">Date</th>
                                        <th className="text-left px-4 py-2 text-[#5a6c7d] font-bold">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f2f6]">
                                    {history.map((a, idx) => (
                                        <tr key={a.id}>
                                            <td className="px-4 py-2 font-semibold text-[#273c75]">{history.length - idx}</td>
                                            <td className="px-4 py-2 text-[#2c3e50]">{new Date(a.sent_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="px-4 py-2 text-[#5a6c7d]">{a.message || "Fee Due Reminder"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}
        </>
    );
}




