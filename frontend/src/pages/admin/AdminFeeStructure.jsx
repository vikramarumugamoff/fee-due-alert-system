import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export default function AdminFeeStructure() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    academic_year: "2024-25",
    semester: "1",
    tuition_fee: "",
    hostel_fee: "",
    exam_fee: "",
    other_fee: ""
  });
  const [editing, setEditing] = useState(null);

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
    fetchFeeStructure(token);
  }, [navigate]);

  const fetchFeeStructure = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/fee-structure`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data || []);
    } catch (err) {
      console.error("Error fetching fee structure:", err);
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

  const resetForm = () => {
    setForm({
      academic_year: "2024-25",
      semester: "1",
      tuition_fee: "",
      hostel_fee: "",
      exam_fee: "",
      other_fee: ""
    });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const token = localStorage.getItem("token");
    try {
      if (editing) {
        await axios.put(`${API_BASE_URL}/admin/fee-structure/${editing.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage("Fee structure updated.");
      } else {
        await axios.post(`${API_BASE_URL}/admin/fee-structure`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage("Fee structure added.");
      }
      resetForm();
      fetchFeeStructure(token);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save fee structure.");
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      academic_year: item.academic_year,
      semester: String(item.semester),
      tuition_fee: item.tuition_fee,
      hostel_fee: item.hostel_fee,
      exam_fee: item.exam_fee,
      other_fee: item.other_fee
    });
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("Delete this fee structure?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/fee-structure/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFeeStructure(token);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
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
            onClick={() => navigate("/admin/users")}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">UM</span>
            User Management
          </button>
          <button
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">FS</span>
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

      <main className="ml-64 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#273c75] font-montserrat">
              Fee Structure
            </h1>
            <p className="text-[#5a6c7d] text-sm mt-1">
              Define semester-wise fee components for your institution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6]">
            <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat mb-4">
              {editing ? "Edit Fee Structure" : "Add Fee Structure"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Academic Year</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Semester</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Tuition Fee</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.tuition_fee}
                  onChange={(e) => setForm({ ...form, tuition_fee: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Hostel Fee</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.hostel_fee}
                  onChange={(e) => setForm({ ...form, hostel_fee: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Exam Fee</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.exam_fee}
                  onChange={(e) => setForm({ ...form, exam_fee: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#273c75] uppercase mb-2 block tracking-wider">Other Fee</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                  value={form.other_fee}
                  onChange={(e) => setForm({ ...form, other_fee: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#273c75] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#1e2f5a] transition-all duration-300"
                >
                  {editing ? "Update" : "Add"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-white border border-[#dcdde1] text-[#273c75] text-sm font-semibold py-2.5 rounded-lg hover:bg-[#f5f6fa] transition-all duration-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {message && <p className="text-xs text-[#5a6c7d]">{message}</p>}
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#f1f2f6]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2c3e50] font-montserrat">Fee Structure List</h3>
              <span className="text-xs text-[#5a6c7d]">{items.length} entries</span>
            </div>
            {loading ? (
              <p className="text-sm text-[#5a6c7d]">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#5a6c7d] text-xs uppercase border-b">
                      <th className="py-2">Year</th>
                      <th className="py-2">Sem</th>
                      <th className="py-2">Tuition</th>
                      <th className="py-2">Hostel</th>
                      <th className="py-2">Exam</th>
                      <th className="py-2">Other</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-3">{item.academic_year}</td>
                        <td className="py-3">{item.semester}</td>
                        <td className="py-3">Rs {Number(item.tuition_fee).toLocaleString()}</td>
                        <td className="py-3">Rs {Number(item.hostel_fee).toLocaleString()}</td>
                        <td className="py-3">Rs {Number(item.exam_fee).toLocaleString()}</td>
                        <td className="py-3">Rs {Number(item.other_fee).toLocaleString()}</td>
                        <td className="py-3 space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-3 py-1 text-xs rounded-lg border border-[#dcdde1] hover:bg-[#f5f6fa]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1 text-xs rounded-lg border border-[#dcdde1] hover:bg-[#f5f6fa]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-[#5a6c7d]">
                          No fee structures yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


