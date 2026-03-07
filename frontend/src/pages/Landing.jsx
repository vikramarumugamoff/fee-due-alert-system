import collegeImg from "../assets/clgimg.webp";
import BrandLogo from "../components/BrandLogo";
import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <header className="flex justify-between items-center px-12 py-6 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <BrandLogo size={40} />
          <h1 className="font-bold text-[#273c75] text-lg font-montserrat">
            Fee Due Alert System
          </h1>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="btn-primary"
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-12 py-20">
        {/* Left Text */}
        <div className="max-w-2xl">
          <h2 className="text-6xl font-bold text-[#273c75] mb-8 leading-tight font-montserrat">
            Streamlined Fee
            <br />
            Management for
            <br />
            Modern Education
          </h2>

          <p className="text-base text-[#5a6c7d] mb-8 leading-relaxed">
            An automated administrative portal for students, parents, and
            faculty. Track fee status, receive timely alerts, and manage
            financial records efficiently.
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="btn-primary"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate("/login")}
              className="bg-[#ff8c42] hover:bg-[#e67e34] text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 text-sm font-montserrat"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="mt-10 md:mt-0 md:ml-12">
          <img
            src={collegeImg}
            alt="Bannari Amman Institute of Technology"
            className="rounded-xl shadow-xl w-[520px] h-[400px] object-cover border-4 border-[#ffe4cc]"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-[#ece8e0] to-[#ffe4cc] py-20 px-12">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-[#273c75] mb-4 font-montserrat">
            System Features
          </h3>
          <p className="text-base text-[#5a6c7d] leading-relaxed max-w-3xl mx-auto">
            Designed to simplify administrative workflows and ensure timely
            communication regarding academic finances.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-[#273c75]">
            <div className="bg-[#ffe4cc] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-2xl">
              🔔
            </div>
            <h4 className="text-lg font-bold text-[#273c75] mb-3 font-montserrat">Automated Alerts</h4>
            <p className="text-[#5a6c7d] text-sm leading-relaxed">
              Receive instant notifications via email for upcoming
              fee deadlines and overdue payments automatically.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-[#ff8c42]">
            <div className="bg-[#ffe4cc] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-2xl">
              💵
            </div>
            <h4 className="text-lg font-bold text-[#273c75] mb-3 font-montserrat">Fee Tracking</h4>
            <p className="text-[#5a6c7d] text-sm leading-relaxed">
              Comprehensive history of all transactions, pending dues, and
              generated receipts in one secure location.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-t-4 border-[#1a2847]">
            <div className="bg-[#e8eef7] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-2xl">
              🛡️
            </div>
            <h4 className="text-lg font-bold text-[#273c75] mb-3 font-montserrat">Admin Dashboard</h4>
            <p className="text-[#5a6c7d] text-sm leading-relaxed">
              Centralized control for administrators to manage student
              records and generate financial reports.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#273c75] to-[#1a2847] text-white py-16 px-12">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4 font-montserrat">Ready to Get Started?</h3>
          <p className="text-slate-300 text-base mb-8">
            Join thousands of students managing their fees efficiently.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="bg-[#ff8c42] hover:bg-[#e67e34] text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 font-montserrat"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white px-12 py-12 border-t border-[#dcdde1]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BrandLogo size={28} />
                <h4 className="font-bold text-[#273c75] text-base font-montserrat">Fee Due Alert System</h4>
              </div>
              <p className="text-[#5a6c7d] text-sm">
                Official administrative portal for fee management and alerts.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-[#273c75] mb-3 text-base font-montserrat">Quick Links</h4>
              <ul className="space-y-2 text-[#5a6c7d] text-sm">
                <li><button onClick={() => navigate("/login")} className="hover:text-[#ff8c42] transition">Login</button></li>
                <li><button onClick={() => navigate("/signup")} className="hover:text-[#ff8c42] transition">Sign Up</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#273c75] mb-3 text-base font-montserrat">Contact</h4>
              <p className="text-[#5a6c7d] text-sm">
                Bannari Amman Institute of Technology
                <br />
                Sathyamangalam, Erode, Tamil Nadu
              </p>
            </div>
          </div>

          <div className="border-t border-[#dcdde1] pt-8 text-center">
            <p className="text-[#5a6c7d] text-sm">
              © 2024 College Administration. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
