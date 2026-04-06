import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaPrint, FaArrowRight } from "react-icons/fa";
import jsPDF from "jspdf";

export default function PaymentReceipt() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentData = location.state;

  useEffect(() => {
    // If user accesses this page directly without payment data, redirect them
    if (!paymentData) {
      navigate("/student/dashboard");
    }
  }, [paymentData, navigate]);

  if (!paymentData) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return new Date(dateString).toLocaleDateString("en-IN", options);
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  const handleDownloadPdf = () => {
    const doc = new jsPDF("p", "pt", "a4");
    const margin = 40;
    let y = margin;
    const amountNumber = Number(paymentData.amountPaid || 0).toLocaleString("en-IN");
    // Use INR prefix for PDF to avoid missing glyphs in core fonts
    const amountForPdf = `INR ${amountNumber}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("BANNARI AMMAN INSTITUTE OF TECHNOLOGY", margin, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    y += 14;
    doc.text("Sathy-Bhavani State Highway, Sathyamangalam, Tamil Nadu 638401", margin, y);
    y += 12;
    doc.text("Phone: +91 4295 226000  |  www.bitsathy.ac.in", margin, y);

    y += 24;
    doc.setLineWidth(0.5);
    doc.line(margin, y, 555, y);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Official Fee Receipt", margin, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Transaction ID: ${paymentData.transactionId}`, 400, y);

    y += 22;
    doc.setFont("helvetica", "bold");
    doc.text("Student Details", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${paymentData.studentName}`, margin, y);
    y += 12;
    doc.text(`Student ID: ${paymentData.studentId}`, margin, y);
    y += 12;
    doc.text(`Semester: ${paymentData.semester}`, margin, y);

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Payment Details", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Date & Time: ${formatDate(paymentData.date)}`, margin, y);
    y += 12;
    doc.text(`Payment Method: ${paymentData.paymentMethod}`, margin, y);
    y += 12;
    doc.text("Status: SUCCESS", margin, y);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(63, 81, 181);
    doc.text(amountForPdf, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("For: Semester Fee Payment", 400, y - 10);
    doc.text(`Reference: ${paymentData.transactionId}`, 400, y + 4);

    y += 30;
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Remark", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const remark =
      "This receipt acknowledges the successful remittance of the above amount towards tuition and related fees at Bannari Amman Institute of Technology.";
    const remarkLines = doc.splitTextToSize(remark, 515);
    doc.text(remarkLines, margin, y);
    y += remarkLines.length * 12 + 6;
    doc.text("This is a computer-generated receipt. No signature is required.", margin, y);

    doc.save(`FeeReceipt-${paymentData.transactionId}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-6">
      <div className="max-w-3xl mx-auto">
        {/* Success Banner */}
        <div className="text-center mb-8 print:hidden">
          <FaCheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-3xl font-extrabold text-gray-900">Payment Successful!</h2>
          <p className="mt-2 text-lg text-gray-600">Your transaction was completed successfully.</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden print:shadow-none print:border-black">
          <div className="bg-indigo-700 px-6 py-5 text-white flex items-center justify-between print:bg-white print:text-black print:border-b print:border-black">
            <div>
              <p className="text-xs tracking-widest font-semibold">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</p>
              <p className="text-[11px] opacity-90">Sathy-Bhavani State Highway, Sathyamangalam, Tamil Nadu 638401</p>
              <p className="text-[11px] opacity-80">Phone: +91 4295 226000 | www.bitsathy.ac.in</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Official Fee Receipt</p>
              <p className="text-[12px]">Transaction ID</p>
              <p className="font-mono text-sm">{paymentData.transactionId}</p>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 border-b border-gray-200 pb-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Student Name</p>
                <p className="font-semibold text-gray-900 text-lg">{paymentData.studentName}</p>
                <p className="text-sm text-gray-600 mt-1">ID: {paymentData.studentId}</p>
                <p className="text-sm text-gray-600">Semester: {paymentData.semester}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500 font-medium">Date & Time</p>
                <p className="font-semibold text-gray-900">{formatDate(paymentData.date)}</p>
                <p className="text-sm text-gray-600 mt-1">Payment Method: {paymentData.paymentMethod}</p>
                <p className="text-sm text-green-600 font-semibold">Status: SUCCESS</p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-6 py-4 flex items-center justify-between print:border-black print:bg-white">
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-2xl font-extrabold text-indigo-700">{formatCurrency(paymentData.amountPaid)}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>For: Semester Fee Payment</p>
                <p>Reference: {paymentData.transactionId}</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg px-6 py-4 text-sm text-gray-700 print:border-black print:bg-white">
              <p className="font-semibold text-gray-800 mb-2">Authorized Remark</p>
              <p>This receipt acknowledges the successful remittance of the above amount towards tuition and related fees at Bannari Amman Institute of Technology.</p>
              <p className="mt-3 text-gray-600">This is a computer-generated receipt. No signature is required.</p>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaPrint className="mr-2" /> Download PDF / Print
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center px-6 py-3 border border-indigo-600 text-indigo-700 shadow-sm text-base font-medium rounded-lg bg-white hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaPrint className="mr-2" /> Save PDF
          </button>
          
          <button
            onClick={() => navigate("/student/dashboard")}
            className="flex items-center justify-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Dashboard <FaArrowRight className="ml-2" />
          </button>
        </div>

      </div>
    </div>
  );
}
