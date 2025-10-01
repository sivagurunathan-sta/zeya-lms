import React, { useState, useEffect } from 'react';
import { Upload, Check, X, Clock, DollarSign, AlertCircle, FileText, Download, CreditCard, CheckCircle, XCircle, Eye, Filter, Search, User, RefreshCw } from 'lucide-react';

// ==================== INTERN PAYMENT SUBMISSION COMPONENT ====================
const InternPaymentSubmission = ({ enrollmentId }) => {
  const [paymentData, setPaymentData] = useState({
    amount: 499,
    upiTransactionId: '',
    upiId: '',
    paymentDate: '',
    paymentTime: '',
    remarks: '',
    proofFile: null,
    proofPreview: null
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [existingPayment, setExistingPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPaymentStatus();
  }, [enrollmentId]);

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/payments/status/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setExistingPayment(data.data.payment);
        setPaymentData(prev => ({
          ...prev,
          amount: data.data.enrollment.internship.certificatePrice
        }));
      }
    } catch (err) {
      console.error('Fetch payment status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setPaymentData({
        ...paymentData,
        proofFile: file,
        proofPreview: URL.createObjectURL(file)
      });
    }
  };

  const handleInitiatePayment = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enrollmentId })
      });
      
      const data = await response.json();
      if (data.success) {
        setExistingPayment(data.data);
        alert('Payment initiated! Now submit your payment proof.');
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to initiate payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!paymentData.upiTransactionId || !/^\d{12}$/.test(paymentData.upiTransactionId)) {
      alert('Please enter a valid 12-digit UPI Transaction ID');
      return;
    }
    if (!paymentData.upiId || !paymentData.paymentDate || !paymentData.paymentTime || !paymentData.proofFile) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('paymentId', existingPayment.id);
      formData.append('upiTransactionId', paymentData.upiTransactionId);
      formData.append('upiId', paymentData.upiId);
      formData.append('paymentDate', paymentData.paymentDate);
      formData.append('paymentTime', paymentData.paymentTime);
      formData.append('remarks', paymentData.remarks);
      formData.append('paymentProof', paymentData.proofFile);

      const response = await fetch(`${API_URL}/payments/submit-proof`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Payment proof submitted successfully!');
        fetchPaymentStatus();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to submit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (existingPayment?.paymentStatus === 'VERIFIED') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verified!</h2>
          <p className="text-gray-600 mb-6">Your certificate will be ready within 24 hours.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-green-900">
              <strong>Transaction ID:</strong> {existingPayment.transactionId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Certificate Payment</h1>
              <p className="text-gray-600 mt-1">Complete your payment to unlock certificate</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Amount</p>
              <p className="text-3xl font-bold text-blue-600">₹{paymentData.amount}</p>
            </div>
          </div>
        </div>

        {existingPayment?.paymentStatus === 'REJECTED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-0.5" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Payment Rejected</h3>
                <p className="text-red-800 mb-3">{existingPayment.verificationMessage}</p>
                <p className="text-sm text-red-700">Please correct the details and resubmit.</p>
              </div>
            </div>
          </div>
        )}

        {existingPayment?.paymentStatus === 'PENDING' && existingPayment.transactionId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="text-yellow-600 mt-0.5" size={24} />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Payment Under Review</h3>
                <p className="text-yellow-800">Your payment is being verified. You'll be notified within 24 hours.</p>
              </div>
            </div>
          </div>
        )}

        {!existingPayment && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center">
            <p className="text-gray-600 mb-4">Click below to start the payment process</p>
            <button
              onClick={handleInitiatePayment}
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Initiating...' : 'Initiate Payment'}
            </button>
          </div>
        )}

        {existingPayment && (existingPayment.paymentStatus === 'REJECTED' || !existingPayment.transactionId) && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Step 1: Make Payment</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="bg-gray-100 rounded-lg p-8 mb-4">
                    <div className="w-64 h-64 bg-white mx-auto flex items-center justify-center border-4 border-gray-300 rounded-lg">
                      <div className="text-center">
                        <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Scan QR Code</p>
                        <p className="text-xs text-gray-500 mt-2">Using any UPI app</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900">UPI ID</p>
                    <p className="text-lg font-bold text-blue-700">company@upi</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2">Payment Instructions</h3>
                    <ul className="text-sm text-yellow-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Pay exactly ₹{paymentData.amount}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Use any UPI app (PhonePe, GPay, Paytm)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Save your 12-digit transaction ID</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Take a clear screenshot of payment</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Important Note</h3>
                    <p className="text-sm text-blue-800">After making payment, submit proof below within 30 minutes for faster verification.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Step 2: Submit Payment Proof</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI Transaction ID (12 digits) *
                  </label>
                  <input
                    type="text"
                    value={paymentData.upiTransactionId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 12) {
                        setPaymentData({...paymentData, upiTransactionId: value});
                      }
                    }}
                    placeholder="123456789012"
                    maxLength={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Found in your UPI payment confirmation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your UPI ID *
                  </label>
                  <input
                    type="text"
                    value={paymentData.upiId}
                    onChange={(e) => setPaymentData({...paymentData, upiId: e.target.value})}
                    placeholder="yourname@paytm / yourname@ybl"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                    <input
                      type="date"
                      value={paymentData.paymentDate}
                      onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Time *</label>
                    <input
                      type="time"
                      value={paymentData.paymentTime}
                      onChange={(e) => setPaymentData({...paymentData, paymentTime: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Screenshot *
                  </label>
                  {!paymentData.proofPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                        className="hidden"
                        id="proof-upload"
                      />
                      <label htmlFor="proof-upload" className="cursor-pointer">
                        <span className="text-blue-600 font-medium hover:text-blue-700">Click to upload</span>
                        <span className="text-gray-600"> or drag and drop</span>
                      </label>
                      <p className="text-sm text-gray-500 mt-2">PNG, JPG or PDF (Max 5MB)</p>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-green-100 rounded flex items-center justify-center">
                            <FileText className="text-green-600" size={32} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{paymentData.proofFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(paymentData.proofFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPaymentData({...paymentData, proofFile: null, proofPreview: null})}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      {paymentData.proofPreview && !paymentData.proofFile.type.includes('pdf') && (
                        <img src={paymentData.proofPreview} alt="Preview" className="w-full rounded-lg max-h-96 object-contain" />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Remarks (Optional)
                  </label>
                  <textarea
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({...paymentData, remarks: e.target.value})}
                    rows={3}
                    placeholder="Add any additional notes about your payment..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check size={24} />
                      Submit Payment Proof
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ==================== ADMIN PAYMENT VERIFICATION COMPONENT ====================
const AdminPaymentVerification = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0, total: 0, totalRevenue: 0 });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewData, setReviewData] = useState({ verifiedTransactionId: '', rejectionReason: '', adminNotes: '' });
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filterStatus, searchQuery]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ status: filterStatus === 'ALL' ? '' : filterStatus, search: searchQuery });
      const response = await fetch(`${API_URL}/admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setPayments(data.data.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/payments/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async () => {
    if (!reviewData.verifiedTransactionId || !/^\d{12}$/.test(reviewData.verifiedTransactionId)) {
      alert('Enter valid 12-digit transaction ID');
      return;
    }
    if (window.confirm('Are you sure you want to verify this payment? This action will issue a certificate to the intern.')) {
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/payments/verify/${selectedPayment.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ verifiedTransactionId: reviewData.verifiedTransactionId, adminNotes: reviewData.adminNotes })
        });
        const data = await response.json();
        if (data.success) {
          alert('✅ Payment verified successfully!');
          resetReview();
          fetchPayments();
          fetchStats();
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Failed to verify payment');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleReject = async () => {
    if (!reviewData.rejectionReason || reviewData.rejectionReason.trim().length < 10) {
      alert('Please provide a detailed rejection reason (minimum 10 characters)');
      return;
    }
    if (window.confirm('Are you sure you want to reject this payment? The intern will be notified.')) {
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/payments/reject/${selectedPayment.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejectionReason: reviewData.rejectionReason, adminNotes: reviewData.adminNotes })
        });
        const data = await response.json();
        if (data.success) {
          alert('❌ Payment rejected!');
          resetReview();
          fetchPayments();
          fetchStats();
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Failed to reject payment');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const resetReview = () => {
    setSelectedPayment(null);
    setReviewAction('');
    setReviewData({ verifiedTransactionId: '', rejectionReason: '', adminNotes: '' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      VERIFIED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300'
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Verification Portal</h1>
            <p className="text-gray-600 mt-1">Review and manage certificate payments</p>
          </div>
          <button 
            onClick={() => { fetchPayments(); fetchStats(); }} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="text-gray-400" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="text-yellow-600" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified</p>
                <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="text-red-600" size={40} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign size={40} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 flex-1 w-full">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by intern name, email, or transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No payments found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intern Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="text-blue-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{p.intern?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{p.intern?.email || p.intern?.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-mono font-medium text-gray-900">{p.transactionId || 'Not submitted'}</p>
                        {p.upiId && <p className="text-sm text-gray-500">{p.upiId}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-gray-900">₹{p.amount}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.submittedAt ? new Date(p.submittedAt).toLocaleTimeString() : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(p.paymentStatus)}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedPayment(p)} 
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            p.paymentStatus === 'PENDING' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Eye size={16} />
                            {p.paymentStatus === 'PENDING' ? 'Review' : 'View'}
                          </div>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full my-8">
              <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Payment Review</h2>
                    <p className="text-blue-100 mt-1">{selectedPayment.intern?.name}</p>
                  </div>
                  <button 
                    onClick={resetReview}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Intern Name</p>
                    <p className="font-semibold text-gray-900">{selectedPayment.intern?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{selectedPayment.intern?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="font-bold text-2xl text-blue-600">₹{selectedPayment.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    {getStatusBadge(selectedPayment.paymentStatus)}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-mono font-semibold">{selectedPayment.transactionId || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">UPI ID:</span>
                      <span className="font-medium">{selectedPayment.upiId || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Date:</span>
                      <span className="font-medium">
                        {selectedPayment.paymentDate 
                          ? new Date(selectedPayment.paymentDate).toLocaleDateString() 
                          : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Time:</span>
                      <span className="font-medium">{selectedPayment.paymentTime || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted At:</span>
                      <span className="font-medium">
                        {selectedPayment.submittedAt 
                          ? new Date(selectedPayment.submittedAt).toLocaleString() 
                          : 'Not submitted'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedPayment.remarks && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Intern Remarks</h3>
                    <p className="text-gray-700">{selectedPayment.remarks}</p>
                  </div>
                )}

                {selectedPayment.paymentProofUrl && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Payment Proof</h3>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <img 
                        src={selectedPayment.paymentProofUrl} 
                        alt="Payment Proof" 
                        className="w-full rounded-lg max-h-96 object-contain"
                      />
                    </div>
                    <a 
                      href={selectedPayment.paymentProofUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Download size={16} />
                      Download Full Image
                    </a>
                  </div>
                )}

                {selectedPayment.verificationMessage && (
                  <div className={`rounded-lg p-4 ${
                    selectedPayment.paymentStatus === 'REJECTED' 
                      ? 'bg-red-50 border border-red-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      selectedPayment.paymentStatus === 'REJECTED' ? 'text-red-900' : 'text-green-900'
                    }`}>
                      Verification Message
                    </h3>
                    <p className={selectedPayment.paymentStatus === 'REJECTED' ? 'text-red-800' : 'text-green-800'}>
                      {selectedPayment.verificationMessage}
                    </p>
                  </div>
                )}

                {selectedPayment.adminNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Admin Notes</h3>
                    <p className="text-blue-800">{selectedPayment.adminNotes}</p>
                  </div>
                )}

                {selectedPayment.paymentStatus === 'PENDING' && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Verification Action</h3>
                      
                      <div className="flex gap-4 mb-4">
                        <button
                          onClick={() => setReviewAction('verify')}
                          className={`flex-1 py-3 rounded-lg font-semibold transition ${
                            reviewAction === 'verify'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle size={20} />
                            Verify Payment
                          </div>
                        </button>
                        <button
                          onClick={() => setReviewAction('reject')}
                          className={`flex-1 py-3 rounded-lg font-semibold transition ${
                            reviewAction === 'reject'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <XCircle size={20} />
                            Reject Payment
                          </div>
                        </button>
                      </div>

                      {reviewAction === 'verify' && (
                        <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Verified Transaction ID (12 digits) *
                            </label>
                            <input
                              type="text"
                              value={reviewData.verifiedTransactionId}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 12) {
                                  setReviewData({...reviewData, verifiedTransactionId: value});
                                }
                              }}
                              placeholder="123456789012"
                              maxLength={12}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-lg"
                            />
                            <p className="text-xs text-gray-600 mt-1">Enter the verified transaction ID from your UPI records</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Admin Notes (Optional)
                            </label>
                            <textarea
                              value={reviewData.adminNotes}
                              onChange={(e) => setReviewData({...reviewData, adminNotes: e.target.value})}
                              rows={3}
                              placeholder="Add any internal notes..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <button
                            onClick={handleVerify}
                            disabled={submitting}
                            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={20} />
                                Confirm Verification
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {reviewAction === 'reject' && (
                        <div className="space-y-4 bg-red-50 border border-red-200 rounded-lg p-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rejection Reason * (min 10 characters)
                            </label>
                            <textarea
                              value={reviewData.rejectionReason}
                              onChange={(e) => setReviewData({...reviewData, rejectionReason: e.target.value})}
                              rows={4}
                              placeholder="Explain why this payment is being rejected (e.g., Invalid transaction ID, screenshot not clear, amount mismatch, etc.)"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              This message will be shown to the intern
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Admin Notes (Optional)
                            </label>
                            <textarea
                              value={reviewData.adminNotes}
                              onChange={(e) => setReviewData({...reviewData, adminNotes: e.target.value})}
                              rows={2}
                              placeholder="Add any internal notes..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <button
                            onClick={handleReject}
                            disabled={submitting}
                            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle size={20} />
                                Confirm Rejection
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN APP DEMO ====================
const LMSPaymentDemo = () => {
  const [view, setView] = useState('intern');
  const [demoEnrollmentId] = useState('demo-enrollment-123');

  return (
    <div>
      <div className="bg-gray-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">LMS Payment System Demo</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('intern')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                view === 'intern' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Intern View
            </button>
            <button
              onClick={() => setView('admin')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                view === 'admin' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Admin View
            </button>
          </div>
        </div>
      </div>

      {view === 'intern' ? (
        <InternPaymentSubmission enrollmentId={demoEnrollmentId} />
      ) : (
        <AdminPaymentVerification />
      )}
    </div>
  );
};

export default LMSPaymentDemo