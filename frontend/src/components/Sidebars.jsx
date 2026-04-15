import { useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";

/**
 * Student Portal Sidebar Component
 */
export function StudentSidebar({ student, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[#f1f2f6]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#273c75] rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
            F
          </div>
          <div>
            <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Due</h2>
            <p className="text-xs text-slate-400">Student Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <button
          onClick={() => navigate("/student/dashboard")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => navigate("/student/fee-structure")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
        >
          📋 Fee Structure
        </button>
        <button
          onClick={() => navigate("/student/payment-history")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
        >
          📜 Payment History
        </button>
        <button
          onClick={() => navigate("/student/payment")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3"
        >
          💳 Pay Fee
        </button>
        <button
          onClick={() => navigate("/student/profile")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
        >
          👤 Profile
        </button>
      </nav>

      {/* User Info & Logout */}
      {student && (
        <div className="p-4 border-t border-[#f1f2f6] space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e2e6]">
            <img
              src={`https://ui-avatars.com/api/?name=${student.name}&background=273c75&color=fff`}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="min-w-0">
              <p className="font-semibold text-xs text-[#273c75] truncate">{student.name}</p>
              <p className="text-xs text-[#5a6c7d] truncate">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-white border border-[#dcdde1] hover:bg-[#f5f6fa] text-[#273c75] text-xs font-semibold py-2.5 rounded-lg transition-all duration-300"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Admin Portal Sidebar Component
 */
export function AdminSidebar({ admin, role, onLogout }) {
  const navigate = useNavigate();
  const isFeeManager = role === "fee_manager";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[#f1f2f6]">
        <div className="flex items-center gap-3">
          <BrandLogo size={40} />
          <div>
            <h2 className="text-base font-bold text-[#273c75] font-montserrat">Fee Alert</h2>
            <p className="text-xs text-slate-400">{isFeeManager ? "Fee Manager" : "Admin"} Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <button
          onClick={() => navigate(isFeeManager ? "/fee-manager/dashboard" : "/admin/dashboard")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[#5a6c7d] hover:bg-[#f5f6fa] hover:text-[#273c75] transition-all duration-300 flex items-center gap-3"
        >
          <span className="w-6 h-6 rounded-md bg-[#f1f2f6] flex items-center justify-center text-[10px] font-bold text-[#273c75]">DB</span>
          Dashboard
        </button>
        
        {!isFeeManager && (
          <>
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
          </>
        )}

        <button
          onClick={() => navigate("/admin/fee-management")}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-[#273c75] text-white shadow-md transition-all duration-300 flex items-center gap-3"
        >
          <span>💳</span> Fee Management
        </button>
      </nav>

      {/* User Info & Logout */}
      {admin && (
        <div className="p-4 border-t border-[#f1f2f6] space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e2e6]">
            <img
              src="https://ui-avatars.com/api/?name=Admin&background=273c75&color=fff"
              alt="Admin"
              className="w-10 h-10 rounded-full"
            />
            <div className="min-w-0">
              <p className="font-semibold text-xs text-[#273c75] truncate">{isFeeManager ? "Fee Manager" : "Admin"}</p>
              <p className="text-xs text-[#5a6c7d] truncate">{admin.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-white border border-[#dcdde1] hover:bg-[#f5f6fa] text-[#273c75] text-xs font-semibold py-2.5 rounded-lg transition-all duration-300"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
