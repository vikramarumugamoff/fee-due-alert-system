import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/student/StudentDashboard";
import FeeStructure from "./pages/student/FeeStructure";
import PaymentHistory from "./pages/student/PaymentHistory";
import StudentProfile from "./pages/student/StudentProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminFeeManagement from "./pages/admin/AdminFeeManagement";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/student/fee-structure" element={<FeeStructure />} />
        <Route path="/student/payment-history" element={<PaymentHistory />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/fee-management" element={<AdminFeeManagement />} />
      </Routes>
    </BrowserRouter>
  );
}
