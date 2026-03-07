import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import axios from "axios";

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFeeCollected: 0,
    totalPendingFee: 0,
    pendingStudents: 0,
    overdueCount: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get admin data from localStorage
    const adminData = localStorage.getItem("adminData");
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");

    if (!adminData || !token || !["fee_manager", "admin"].includes(userRole)) {
      navigate("/login");
      return;
    }

    setAdmin(JSON.parse(adminData));
    fetchDashboardStats(token);
  }, [navigate]);

  const fetchDashboardStats = async (token) => {
    try {
      const res = await axios.get("http://localhost:5001/admin/dashboard-stats", {
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
    if (amount >= 10000000) { // Crores
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) { // Lakhs
      return `₹${(amount / 100000).toFixed(1)} L`;
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
      <aside className="w-64 bg-white border-r border-[#dcdde1] fixed h-screen z-10">
        <div className="p-6 border-b border-[#f1f2f6]">
          <div className="flex items-center gap-3">
            <BrandLogo size={40} />
            <div>
              <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Alert</h2>
              <p className="text-xs text-slate-400">Fee Manager Panel</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => navigate("/fee-manager-dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3"
          >
            <span>📊</span> Dashboard
          </button>
          <button
            onClick={() => navigate("/admin/students")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span>👥</span> Students
          </button>
          <button
            onClick={() => navigate("/admin/fee-management")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span>💳</span> Fee Management
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
                <p className="font-semibold text-xs text-[#273c75]">Fee Manager</p>
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

      {/* Main Content */}
      <main className="ml-64 w-full p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">
              Welcome back, Fee Manager
            </h1>
            <p className="text-[#5a6c7d] text-sm mt-1">
              Here's what's happening today.
            </p>
          </div>
          <div className="flex gap-4">
            {/* Icons removed as per user request */}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Students */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#e8f0fe] rounded-xl text-[#273c75]">
                👥
              </div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Total Students</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {stats.totalStudents.toLocaleString()}
            </h3>
            <p className="text-xs text-green-500 mt-2 font-medium">
              +12 this month
            </p>
          </div>

          {/* Fees Collected */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#e6fffa] rounded-xl text-[#1ABC9C]">
                💸
              </div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Fees Collected</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {formatCurrency(stats.totalFeeCollected)}
            </h3>
            <p className="text-xs text-green-500 mt-2 font-medium">
              ~ +8% vs last sem
            </p>
          </div>

          {/* Pending Fees */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#fff8e6] rounded-xl text-[#f39c12]">
                🕒
              </div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Pending Fees</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {formatCurrency(stats.totalPendingFee)}
            </h3>
            <p className="text-xs text-[#f39c12] mt-2 font-medium">
              From {stats.pendingStudents} students
            </p>
          </div>

          {/* Overdue Alerts */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#ffecec] rounded-xl text-[#e74c3c]">
                ⚠️
              </div>
              <p className="text-xs text-[#5a6c7d] font-semibold">Overdue Alerts</p>
            </div>
            <h3 className="text-2xl font-bold text-[#2c3e50] font-montserrat">
              {stats.overdueCount}
            </h3>
            <p className="text-xs text-[#e74c3c] mt-2 font-medium">
              ~ Requires Action
            </p>
          </div>
        </div>

        {/* Fee Collection Overview (Using CSS Bar Chart mock) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6] mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat">Fee Collection Overview</h3>
          </div>

          <div className="h-64 flex items-end justify-between px-4 pb-2">
            {/* Jan */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '80%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Jan</span>
            </div>
            {/* Feb */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '20%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Feb</span>
            </div>
            {/* Mar */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '0%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Mar</span>
            </div>
            {/* Apr */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '0%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Apr</span>
            </div>
            {/* May */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '0%' }}></div>
              <span className="text-xs text-[#5a6c7d]">May</span>
            </div>
            {/* Jun */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '0%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Jun</span>
            </div>
            {/* Jul */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '0%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Jul</span>
            </div>
            {/* Aug */}
            <div className="flex flex-col items-center justify-end gap-2 w-full h-full">
              <div className="w-12 bg-[#3d5a9f] rounded-t-lg hover:bg-[#273c75] transition-all duration-300" style={{ height: '0%' }}></div>
              <span className="text-xs text-[#5a6c7d]">Aug</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

