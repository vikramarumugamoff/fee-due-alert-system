import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaCreditCard, FaUniversity, FaMobileAlt } from "react-icons/fa";

export default function PaymentPortal() {
  const [student, setStudent] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(true);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  useEffect(() => {
    const studentData = localStorage.getItem("studentData");
    const token = localStorage.getItem("token");

    if (!studentData || !token) {
      navigate("/login");
      return;
    }

    const parsedStudent = JSON.parse(studentData);
    setStudent(parsedStudent);
    fetchStudentFeeData(parsedStudent.email, token);
  }, [navigate]);

  // Always derive semester from profile or fee data; no manual selection
  const derivedSemester = student?.semester || feeData?.semester || 1;

  const fetchStudentFeeData = async (email, token) => {
    try {
      const res = await axios.get(`/student/fees/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeeData(res.data);
      setAmount(res.data.unpaidAmount > 0 ? res.data.unpaidAmount : "");
    } catch (err) {
      console.error("Error fetching fee data:", err);
      setError("Failed to fetch fee details.");
    } finally {
      setFetchingInfo(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (amount > feeData.unpaidAmount) {
      setError(`Amount cannot exceed pending fee of ₹${feeData.unpaidAmount.toLocaleString()}`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      const res = await axios.post("/student/pay-fee", {
        email: student.email,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        semester: derivedSemester
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.transactionId) {
        navigate("/student/receipt", {
          state: {
            transactionId: res.data.transactionId,
            amountPaid: parseFloat(amount),
            paymentMethod: paymentMethod,
            semester: derivedSemester,
            studentName: student.name || student.full_name,
            studentId: student.student_id,
            date: new Date().toISOString()
          }
        });
      }

    } catch (err) {
      console.error("Payment error:", err, err.response?.data);
      setError(err.response?.data?.message || "Payment processing failed. Please try again.");
      setLoading(false);
    }
  };

  if (fetchingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/student/dashboard")}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-6 text-white">
            <h2 className="text-2xl font-bold">Secure Payment Gateway</h2>
            <p className="text-indigo-100 mt-1">Complete your fee payment securely</p>
          </div>

          <div className="p-8">
            <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Student Information</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Name</p>
                  <p className="font-semibold text-gray-900">{student?.name || student?.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Student ID</p>
                  <p className="font-semibold text-gray-900">{student?.student_id}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Total Fee</p>
                  <p className="font-semibold text-gray-900">₹{feeData?.totalFee?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium text-red-600">Pending Fee</p>
                  <p className="font-bold text-red-600">₹{feeData?.unpaidAmount?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Pay (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter amount"
                  min="1"
                  max={feeData?.unpaidAmount}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Partial payments are supported.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  
                  <div 
                    onClick={() => setPaymentMethod("UPI")}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                      paymentMethod === "UPI" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-indigo-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <FaMobileAlt className="text-2xl mb-2" />
                    <span className="font-medium text-sm">UPI Payment</span>
                  </div>

                  <div 
                    onClick={() => setPaymentMethod("Debit/Credit Card")}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                      paymentMethod === "Debit/Credit Card" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-indigo-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <FaCreditCard className="text-2xl mb-2" />
                    <span className="font-medium text-sm">Debit/Credit Card</span>
                  </div>

                  <div 
                    onClick={() => setPaymentMethod("Net Banking")}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                      paymentMethod === "Net Banking" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-indigo-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <FaUniversity className="text-2xl mb-2" />
                    <span className="font-medium text-sm">Net Banking</span>
                  </div>

                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading || feeData?.unpaidAmount <= 0}
                  className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg flex items-center justify-center transition-all ${
                    loading || feeData?.unpaidAmount <= 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </>
                  ) : (
                    `Pay ₹${amount ? parseFloat(amount).toLocaleString() : '0'}`
                  )}
                </button>
                {feeData?.unpaidAmount <= 0 && (
                  <p className="text-center text-green-600 mt-3 font-medium">No pending fee found. You are all set!</p>
                )}
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
