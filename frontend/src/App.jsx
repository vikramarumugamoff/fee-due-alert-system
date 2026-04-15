import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/student/StudentDashboard";
import FeeStructure from "./pages/student/FeeStructure";
import PaymentHistory from "./pages/student/PaymentHistory";
import StudentProfile from "./pages/student/StudentProfile";
import PaymentPortal from "./pages/student/PaymentPortal";
import PaymentReceipt from "./pages/student/PaymentReceipt";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemAdminDashboard from "./pages/admin/SystemAdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminFeeManagement from "./pages/admin/AdminFeeManagement";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFeeStructure from "./pages/admin/AdminFeeStructure";
import AdminAcademicStructure from "./pages/admin/AdminAcademicStructure";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/fee-structure" element={<FeeStructure />} />
        <Route path="/student/payment-history" element={<PaymentHistory />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/payment" element={<PaymentPortal />} />
        <Route path="/student/receipt" element={<PaymentReceipt />} />
        <Route path="/fee-manager/dashboard" element={<AdminDashboard />} />
        <Route path="/admin-dashboard" element={<SystemAdminDashboard />} />
        <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/fee-management" element={<AdminFeeManagement />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/fee-structure" element={<AdminFeeStructure />} />
        <Route path="/admin/academic-structure" element={<AdminAcademicStructure />} />
      </Routes>
    </BrowserRouter>
  );
}
