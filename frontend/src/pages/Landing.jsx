import collegeImg from "../assets/clgimg.webp";

import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="flex justify-between items-center px-10 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-700 w-8 h-8 rounded flex items-center justify-center text-white font-bold">
            F
          </div>
          <h1 className="font-semibold text-gray-800">
            Fee Due Alert System
          </h1>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 transition"
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-12 py-16">

        {/* Left Text */}
        <div className="max-w-2xl">
          <h2 className="text-6xl font-bold text-gray-800 mb-8 leading-tight">
            Streamlined Fee
            <br />
            Management for
            <br />
            Modern Education
          </h2>

          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            An automated administrative portal for students, parents, and
            faculty. Track fee status, receive timely alerts, and manage
            financial records efficiently.
          </p>
        </div>

        {/* Right Image */}
        <div className="mt-10 md:mt-0">
         <img
         src={collegeImg}
         alt="Bannari Amman Institute of Technology"
         className="rounded-lg shadow-lg w-[520px] h-[400px] object-cover"
          />

        </div>

      </section>

      {/* Features Section */}
      <section className="bg-gray-200 py-16 px-12">

        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-gray-800">
            System Features
          </h3>
          <p className="text-lg text-gray-600 mt-4 leading-relaxed">
            Designed to simplify administrative workflows and ensure timely
            communication regarding academic finances.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">

          {/* Feature 1 */}
          <div className="bg-white p-8 rounded shadow-sm feature-card feature-card-1">
            <div className="bg-blue-100 w-12 h-12 rounded flex items-center justify-center mb-4 text-xl icon-box icon-box-1">
              🔔
            </div>
            <h4 className="text-lg font-semibold mb-3">Automated Alerts</h4>
            <p className="text-gray-600 text-base leading-relaxed">
              Receive instant notifications via SMS and email for upcoming
              fee deadlines and overdue payments automatically.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded shadow-sm feature-card feature-card-2">
            <div className="bg-blue-100 w-12 h-12 rounded flex items-center justify-center mb-4 text-xl icon-box icon-box-2">
              💵
            </div>
            <h4 className="text-lg font-semibold mb-3">Fee Tracking</h4>
            <p className="text-gray-600 text-base leading-relaxed">
              Comprehensive history of all transactions, pending dues, and
              generated receipts in one secure location.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded shadow-sm feature-card feature-card-3">
            <div className="bg-blue-100 w-12 h-12 rounded flex items-center justify-center mb-4 text-xl icon-box icon-box-3">
              🛡️
            </div>
            <h4 className="text-lg font-semibold mb-3">Admin Dashboard</h4>
            <p className="text-gray-600 text-base leading-relaxed">
              Centralized control for administrators to manage student
              records and generate financial reports.
            </p>
          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="bg-white px-12 py-10 text-gray-600">

        <div className="grid md:grid-cols-1 gap-8">

          <div>
            <h4 className="font-semibold mb-3 text-lg">Fee Due Alert System</h4>
            <p className="text-base">
              Official administrative portal for fee management and alerts.
            </p>
            <p className="text-base mt-3">
              Bannari Amman Institute of Technology
              <br />
              Sathyamangalam, Erode, Tamil Nadu
            </p>
          </div>

        </div>

        <p className="text-center text-base mt-10">
          © 2026 College Administration. All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default Landing;
