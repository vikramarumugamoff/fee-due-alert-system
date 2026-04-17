import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "admin",
    password: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    const adminData = localStorage.getItem("adminData");

    if (!token || userRole !== "admin") {
      navigate("/login");
      return;
    }

    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }

    fetchUsers(token);
  }, [navigate]);

  const fetchUsers = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${API_BASE_URL}/admin/users`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm({ name: "", email: "", role: "admin", password: "" });
      setMessage("User created successfully.");
      fetchUsers(token);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create user.");
    }
  };

  const handleToggleStatus = async (user) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE_URL}/admin/users/${user.id}/status`,
        { is_active: !user.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers(token);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (!newPassword) return;
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE_URL}/admin/users/${user.id}/password`,
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Password reset successfully.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#273c75] mx-auto mb-4"></div>
          <p className="text-[#5a6c7d]">Loading users...</p>
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
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">DB</span>
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
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">UM</span>
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
              User Management
            </h1>
            <p className="text-[#5a6c7d] text-sm mt-1">
              Create and manage admin and fee manager accounts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6]">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat mb-4">Create Account</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@bitsathy.ac.in"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Role</label>
                <select
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="fee_manager">Fee Manager</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Strong password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#273c75] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#1e2f5a] transition-all duration-300"
              >
                Create User
              </button>
              {message && <p className="text-xs text-[#5a6c7d]">{message}</p>}
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat">Accounts</h3>
              <span className="text-xs text-[#5a6c7d]">{users.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#5a6c7d] text-xs uppercase border-b">
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-b-0">
                      <td className="py-3 text-[#2c3e50]">{user.name || "-"}</td>
                      <td className="py-3 text-[#2c3e50]">{user.email}</td>
                      <td className="py-3 text-[#2c3e50]">{user.role}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 space-x-2">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="px-3 py-1 text-xs rounded-lg border border-[#dcdde1] hover:bg-[#f5f6fa]"
                        >
                          {user.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="px-3 py-1 text-xs rounded-lg border border-[#dcdde1] hover:bg-[#f5f6fa]"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-[#5a6c7d]">
                        No admin accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


