import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import axios from "axios";

export default function SystemAdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFeeCollected: 0,
    totalPendingFee: 0,
    pendingStudents: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    if (!token || userRole !== "admin") {
      navigate("/login");
      return;
    }
    const adminData = localStorage.getItem("adminData");
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }
    fetchDashboardStats(token);
  }, [navigate]);

  const fetchDashboardStats = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `Rs ${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `Rs ${(amount / 100000).toFixed(1)} L`;
    }
    return `Rs ${amount.toLocaleString()}`;
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
      <aside className="w-64 bg-white border-r border-[#dcdde1] fixed h-screen z-50">
        <div className="p-6 border-b border-[#f1f2f6]">
          <div className="flex items-center gap-3">
            <BrandLogo size={40} />
            <div>
              <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Alert</h2>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold">DB</span>
            Dashboard
          </button>
          <button
            onClick={() => navigate("/admin/students")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">SM</span>
            Student Management
          </button>
          <button
            onClick={() => navigate("/admin/users")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">UM</span>
            User Management
          </button>
          <button
            onClick={() => navigate("/admin/fee-structure")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">FS</span>
            Fee Structure
          </button>
          <button
            onClick={() => navigate("/admin/academic-structure")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">AS</span>
            Academic Structure
          </button>
        </nav>

        {admin && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e2e6]">
              <img
                src="https://ui-avatars.com/api/?name=Admin&background=273c75&color=fff"
                alt="Admin"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold text-xs text-[#273c75]">Admin</p>
                <p className="text-xs text-[#5a6c7d]">{admin.email}</p>
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

      <main className="ml-64 w-full p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">
              Welcome, Admin
            </h1>
            <p className="text-[#5a6c7d] text-sm mt-1">
              System overview and management controls.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#e8f0fe] rounded-xl text-[#273c75] text-sm font-bold">SM</div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Total Students</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {stats.totalStudents.toLocaleString()}
            </h3>
            <p className="text-xs text-[#5a6c7d] mt-2 font-medium">Active profiles</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#e6fffa] rounded-xl text-[#1ABC9C] text-sm font-bold">FM</div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Fees Collected</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {formatCurrency(stats.totalFeeCollected)}
            </h3>
            <p className="text-xs text-[#5a6c7d] mt-2 font-medium">Across semesters</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#fff8e6] rounded-xl text-[#f39c12] text-sm font-bold">PD</div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Pending Fees</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {formatCurrency(stats.totalPendingFee)}
            </h3>
            <p className="text-xs text-[#5a6c7d] mt-2 font-medium">
              From {stats.pendingStudents} students
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#ffecec] rounded-xl text-[#e74c3c] text-sm font-bold">OD</div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Overdue Alerts</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {stats.overdueCount}
            </h3>
            <p className="text-xs text-[#5a6c7d] mt-2 font-medium">Requires action</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6]">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat mb-4">Admin Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/admin/students")}
                className="w-full text-left p-4 rounded-xl border border-[#edf0f2] hover:bg-[#f9fafb] transition-all duration-300"
              >
                <p className="text-sm font-semibold text-[#273c75]">Manage Students</p>
                <p className="text-xs text-[#5a6c7d] mt-1">Add, edit, or remove student records</p>
              </button>
              <button
                onClick={() => navigate("/admin/users")}
                className="w-full text-left p-4 rounded-xl border border-[#edf0f2] hover:bg-[#f9fafb] transition-all duration-300"
              >
                <p className="text-sm font-semibold text-[#273c75]">Manage User Accounts</p>
                <p className="text-xs text-[#5a6c7d] mt-1">Create roles, reset passwords, enable or disable accounts</p>
              </button>
              <button
                onClick={() => navigate("/admin/fee-structure")}
                className="w-full text-left p-4 rounded-xl border border-[#edf0f2] hover:bg-[#f9fafb] transition-all duration-300"
              >
                <p className="text-sm font-semibold text-[#273c75]">Update Fee Structure</p>
                <p className="text-xs text-[#5a6c7d] mt-1">Define semester-wise fee structure and charges</p>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6]">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat mb-4">Academic Controls</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/admin/academic-structure")}
                className="w-full text-left p-4 rounded-xl border border-[#edf0f2] hover:bg-[#f9fafb] transition-all duration-300"
              >
                <p className="text-sm font-semibold text-[#273c75]">Manage Academic Structure</p>
                <p className="text-xs text-[#5a6c7d] mt-1">Semesters, academic years, batches, and assignments</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

