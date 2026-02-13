import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AdminStudents() {
    const [admin, setAdmin] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const navigate = useNavigate();

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Form States
    const [newStudent, setNewStudent] = useState({
        fullName: "",
        studentId: "",
        email: "",
        phone: "",
        department: "",
        dueDate: "",
        password: "Student@123"
    });

    const [showAddPassword, setShowAddPassword] = useState(false);

    const [editDueDate, setEditDueDate] = useState("");

    useEffect(() => {
        const adminData = localStorage.getItem("adminData");
        const token = localStorage.getItem("token");

        if (!adminData || !token) {
            navigate("/login");
            return;
        }

        setAdmin(JSON.parse(adminData));
        fetchStudents(token);
    }, [navigate, search, filterDepartment, filterStatus]);

    const fetchStudents = async (token) => {
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (filterDepartment) params.append("department", filterDepartment);
            if (filterStatus) params.append("status", filterStatus);

            const res = await axios.get(`http://localhost:5000/admin/students?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStudents(res.data);
        } catch (err) {
            console.error("Error fetching students:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminData");
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        try {
            await axios.post("http://localhost:5000/admin/students", newStudent, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowAddModal(false);
            setNewStudent({ fullName: "", studentId: "", email: "", phone: "", department: "", dueDate: "", password: "" });
            fetchStudents(token);
            alert("Student added successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Error adding student");
        }
    };

    const handleUpdateDueDate = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        try {
            await axios.put(`http://localhost:5000/admin/students/${selectedStudent.id}/due-date`, {
                dueDate: editDueDate
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowEditModal(false);
            fetchStudents(token);
            alert("Due date updated successfully!");
        } catch (err) {
            alert("Error updating due date");
        }
    };

    const openEditModal = (student) => {
        setSelectedStudent(student);
        setEditDueDate(student.due_date ? student.due_date.split('T')[0] : "");
        setShowEditModal(true);
    };

    return (
        <div className="min-h-screen bg-[#f5f6fa] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#dcdde1] fixed h-screen z-10">
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
                    <button className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3">
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
                                <p className="font-semibold text-xs text-[#273c75]">Super Admin</p>
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
                            Student Management
                        </h1>
                        <p className="text-[#5a6c7d] text-sm mt-1">
                            Manage enrollments and fee status.
                        </p>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#f1f2f6] mb-6 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Search by name, ID, or email..."
                                className="w-full pl-10 pr-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75]"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75] text-[#5a6c7d]"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                        <select
                            className="px-4 py-2 bg-[#f8f9fa] border border-[#dcdde1] rounded-lg text-sm focus:outline-none focus:border-[#273c75] text-[#5a6c7d]"
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#273c75] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a2847] transition-all shadow-md flex items-center gap-2"
                    >
                        + Add New Student
                    </button>
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#f1f2f6] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f8f9fa] border-b border-[#e1e2e6]">
                            <tr>
                                <th className="p-4 text-xs font-bold text-[#5a6c7d] uppercase">Student ID</th>
                                <th className="p-4 text-xs font-bold text-[#5a6c7d] uppercase">Student Name</th>
                                <th className="p-4 text-xs font-bold text-[#5a6c7d] uppercase">Department</th>
                                <th className="p-4 text-xs font-bold text-[#5a6c7d] uppercase">Fee Status</th>
                                <th className="p-4 text-xs font-bold text-[#5a6c7d] uppercase">Due Date</th>
                                <th className="p-4 text-xs font-bold text-[#5a6c7d] uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-[#5a6c7d]">Loading students...</td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-[#5a6c7d]">No students found.</td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student.id} className="border-b border-[#f1f2f6] hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-semibold text-[#2c3e50]">{student.student_id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=${student.full_name}&background=random&color=fff`}
                                                    alt={student.full_name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-[#2c3e50]">{student.full_name}</p>
                                                    <p className="text-xs text-[#5a6c7d]">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[#5a6c7d]">{student.department}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.status === 'Paid' ? 'bg-green-100 text-green-600' :
                                                student.status === 'Overdue' ? 'bg-red-100 text-red-600' :
                                                    'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[#5a6c7d]">
                                            {student.status === 'Paid' ? '--' : new Date(student.due_date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => openEditModal(student)}
                                                className="p-2 text-[#5a6c7d] hover:text-[#273c75] hover:bg-[#e8f0fe] rounded-full transition-all"
                                                title="Edit Due Date"
                                            >
                                                ✏️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-[#e1e2e6] flex justify-between items-center text-xs text-[#5a6c7d]">
                        <p>Showing {students.length} entries</p>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 bg-[#f8f9fa] border border-[#dcdde1] rounded hover:bg-[#e1e2e6] disabled:opacity-50">Previous</button>
                            <button className="px-3 py-1 bg-[#273c75] text-white rounded">1</button>
                            <button className="px-3 py-1 bg-[#f8f9fa] border border-[#dcdde1] rounded hover:bg-[#e1e2e6] disabled:opacity-50">Next</button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in"> // Added animation class if exists or just standard
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[#273c75]">Add New Student</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleAddStudent} className="space-y-4" autoComplete="off">
                            {/* Dummy inputs to capture browser autofill heuristics */}
                            <input type="text" name="prevent_autofill" style={{ display: 'none' }} value="" readOnly />
                            <input type="password" name="password_fake" style={{ display: 'none' }} value="" readOnly />

                            <div>
                                <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="student_fullname"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none"
                                    value={newStudent.fullName}
                                    onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Student ID</label>
                                    <input
                                        type="text"
                                        name="student_id_field"
                                        autoComplete="new-password"
                                        className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none"
                                        value={newStudent.studentId}
                                        onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Department</label>
                                    <select
                                        className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none"
                                        value={newStudent.department}
                                        onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Dept</option>
                                        <option value="Computer Science">Computer Science</option>
                                        <option value="Information Technology">Information Technology</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Mechanical">Mechanical</option>
                                        <option value="Civil">Civil</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Email (bitsathy.ac.in)</label>
                                <input
                                    type="email"
                                    name="student_email_field"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Phone</label>
                                <input
                                    type="tel"
                                    name="student_phone_field"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none"
                                    value={newStudent.phone}
                                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Initial Due Date (Optional)</label>
                                <input
                                    type="date"
                                    name="student_due_date"
                                    className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none"
                                    value={newStudent.dueDate}
                                    onChange={(e) => setNewStudent({ ...newStudent, dueDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#5a6c7d] mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showAddPassword ? "text" : "password"}
                                        name="student_pass_actual"
                                        autoComplete="new-password"
                                        className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none pr-10"
                                        value={newStudent.password}
                                        onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPassword(!showAddPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#273c75] transition-colors"
                                    >
                                        {showAddPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-[#273c75] text-white py-2.5 rounded-lg font-bold hover:bg-[#1a2847] transition-all">
                                Add Student
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Due Date Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-[#273c75] mb-4">Edit Due Date</h3>
                        <p className="text-sm text-gray-600 mb-4">Update fee due date for <strong>{selectedStudent?.full_name}</strong></p>
                        <form onSubmit={handleUpdateDueDate}>
                            <input
                                type="date"
                                className="w-full px-4 py-2 border border-[#dcdde1] rounded-lg text-sm focus:border-[#273c75] outline-none mb-4"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                required
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-[#dcdde1] rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[#273c75] text-white rounded-lg text-sm font-semibold hover:bg-[#1a2847]"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
