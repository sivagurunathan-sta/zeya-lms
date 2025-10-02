// frontend/src/components/admin/PaymentVerificationDashboard.jsx - COMPLETE VERSION
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Search, Filter, DollarSign, FileText, User, AlertCircle, Download, RefreshCw } from 'lucide-react';
import axios from 'axios';

const PaymentVerificationDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
    total: 0,
    totalRevenue: 0
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewData, setReviewData] = useState({
    verifiedTransactionId: '',
    rejectionReason: '',
    adminNotes: ''
  });
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filterStatus, searchQuery, currentPage]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/admin/payments`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            status: filterStatus === 'ALL' ? undefined : filterStatus,
            search: searchQuery,
            page: currentPage,
            limit: 20
          }
        }
      );

      if (response.data.success) {
        setPayments(response.data.data.payments);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
      alert(err.response?.data?.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/admin/payments/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const handleVerify = async () => {
    if (!reviewData.verifiedTransactionId || !/^\d{12}$/.test(reviewData.verifiedTransactionId)) {
      alert('Please enter a valid 12-digit verified transaction ID');
      return;
    }

    if (window.confirm('Are you sure you want to VERIFY this payment? This will issue the certificate automatically.')) {
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/admin/payments/verify/${selectedPayment.id}`,
          {
            verifiedTransactionId: reviewData.verifiedTransactionId,
            adminNotes: reviewData.adminNotes
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          alert('✅ Payment verified successfully! Certificate session created.');
          resetReview();
          fetchPayments();
          fetchStats();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to verify payment');
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

    if (window.confirm('Are you sure you want to REJECT this payment? The intern will be notified.')) {
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/admin/payments/reject/${selectedPayment.id}`,
          {
            rejectionReason: reviewData.rejectionReason,
            adminNotes: reviewData.adminNotes
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          alert('❌ Payment rejected. Intern has been notified with the reason.');
          resetReview();
          fetchPayments();
          fetchStats();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to reject payment');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const resetReview = () => {
    setSelectedPayment(null);
    setReviewAction('');
    setReviewData({
      verifiedTransactionId: '',
      rejectionReason: '',
      adminNotes: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      VERIFIED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300'
    };
    const icons = {
      PENDING: Clock,
      VERIFIED: CheckCircle,
      REJECTED: XCircle
    };
    const Icon = icons[status];
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border inline-flex items-center gap-1 ${styles[status]}`}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  const handleRefresh = () => {
    fetchPayments();
    fetchStats();
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Verification</h1>
            <p className="text-gray-600">Review and verify intern certificate payments</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 flex-1 w-full">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, ID, or transaction ID..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={handleFilterChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 text-lg mt-4">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No payments found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intern</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="text-blue-600" size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{payment.intern?.name || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{payment.intern?.userId || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{payment.intern?.email || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-mono font-medium text-gray-900">
                              {payment.transactionId || 'Not submitted'}
                            </p>
                            <p className="text-gray-600">UPI: {payment.upiId || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-lg font-bold text-gray-900">₹{payment.amount}</p>
                          <p className="text-xs text-gray-500">{payment.paymentType}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">
                            {payment.paymentProofSubmittedAt 
                              ? new Date(payment.paymentProofSubmittedAt).toLocaleDateString()
                              : 'Not submitted'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.paymentProofSubmittedAt 
                              ? new Date(payment.paymentProofSubmittedAt).toLocaleTimeString()
                              : ''}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payment.paymentStatus)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              payment.paymentStatus === 'PENDING'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Eye className="inline mr-2" size={16} />
                            {payment.paymentStatus === 'PENDING' ? 'Review Now' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing page {currentPage} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Review Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full my-8">
              {/* Modal Header */}
              <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <h2 className="text-2xl font-bold">Payment Verification</h2>
                <p className="text-blue-100 mt-1">
                  {selectedPayment.intern?.name} - {selectedPayment.intern?.userId}
                </p>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                {/* Intern Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User size={20} />
                    Intern Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.intern?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">User ID:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.intern?.userId}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.intern?.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Internship:</span>
                      <p className="font-medium text-gray-900">{selectedPayment.internship?.title || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign size={20} />
                    Payment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <span className="text-gray-700 font-medium">Amount</span>
                      <span className="text-2xl font-bold text-blue-600">₹{selectedPayment.amount}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 mb-1">UPI Transaction ID</p>
                        <p className="font-mono font-bold text-gray-900">
                          {selectedPayment.transactionId || 'Not provided'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 mb-1">UPI ID Used</p>
                        <p className="font-medium text-gray-900">{selectedPayment.upiId || 'Not provided'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 mb-1">Submitted At</p>
                        <p className="font-medium text-gray-900">
                          {selectedPayment.paymentProofSubmittedAt 
                            ? new Date(selectedPayment.paymentProofSubmittedAt).toLocaleString() 
                            : 'Not submitted'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 mb-1">Payment Type</p>
                        <p className="font-medium text-gray-900">{selectedPayment.paymentType}</p>
                      </div>
                    </div>
                    {selectedPayment.remarks && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">Intern's Remarks:</p>
                        <p className="text-gray-900">{selectedPayment.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Proof */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText size={20} />
                    Payment Proof Screenshot
                  </h3>
                  {selectedPayment.paymentProofUrl ? (
                    <div className="bg-gray-100 rounded-lg p-4">
                      <img 
                        src={`http://localhost:5000${selectedPayment.paymentProofUrl}`}
                        alt="Payment proof"
                        className="w-full rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => window.open(`http://localhost:5000${selectedPayment.paymentProofUrl}`, '_blank')}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden aspect-video bg-white rounded border-2 border-gray-300 items-center justify-center">
                        <div className="text-center">
                          <FileText size={64} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Payment Screenshot</p>
                          <p className="text-sm text-gray-500 mt-1">Click to view in new tab</p>
                          <button
                            onClick={() => window.open(`http://localhost:5000${selectedPayment.paymentProofUrl}`, '_blank')}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Download className="inline mr-2" size={16} />
                            Open File
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                      <AlertCircle className="mx-auto text-gray-400 mb-2" size={48} />
                      <p className="text-gray-600">No payment proof uploaded</p>
                    </div>
                  )}
                </div>

                {/* Current Status - Show if not pending */}
                {selectedPayment.paymentStatus !== 'PENDING' && (
                  <div className={`border rounded-lg p-4 ${
                    selectedPayment.paymentStatus === 'VERIFIED' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      {selectedPayment.paymentStatus === 'VERIFIED' ? (
                        <>
                          <CheckCircle className="text-green-600" size={20} />
                          <span className="text-green-900">Payment Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="text-red-600" size={20} />
                          <span className="text-red-900">Payment Rejected</span>
                        </>
                      )}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className={selectedPayment.paymentStatus === 'VERIFIED' ? 'text-green-800' : 'text-red-800'}>
                        <strong>Verified By:</strong> {selectedPayment.verifier?.name || 'Admin'}
                      </p>
                      <p className={selectedPayment.paymentStatus === 'VERIFIED' ? 'text-green-800' : 'text-red-800'}>
                        <strong>Verified At:</strong> {new Date(selectedPayment.verifiedAt).toLocaleString()}
                      </p>
                      {selectedPayment.verifiedTransactionId && (
                        <p className="text-green-800">
                          <strong>Verified Transaction ID:</strong> {selectedPayment.verifiedTransactionId}
                        </p>
                      )}
                      {selectedPayment.verificationMessage && (
                        <div className={`mt-3 p-3 border rounded ${
                          selectedPayment.paymentStatus === 'VERIFIED' 
                            ? 'bg-green-100 border-green-300' 
                            : 'bg-red-100 border-red-300'
                        }`}>
                          <p className={`font-medium ${
                            selectedPayment.paymentStatus === 'VERIFIED' ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {selectedPayment.paymentStatus === 'VERIFIED' ? 'Admin Notes:' : 'Rejection Reason:'}
                          </p>
                          <p className={selectedPayment.paymentStatus === 'VERIFIED' ? 'text-green-800' : 'text-red-800'}>
                            {selectedPayment.verificationMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Review Actions - Only show for PENDING */}
                {selectedPayment.paymentStatus === 'PENDING' && (
                  <>
                    {!reviewAction ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Choose Action</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => setReviewAction('VERIFY')}
                            className="p-6 border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors group"
                          >
                            <CheckCircle className="text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" size={48} />
                            <p className="font-bold text-green-700 text-lg">VERIFY PAYMENT</p>
                            <p className="text-sm text-gray-600 mt-2">Payment is correct and verified</p>
                          </button>
                          
                          <button
                            onClick={() => setReviewAction('REJECT')}
                            className="p-6 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors group"
                          >
                            <XCircle className="text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" size={48} />
                            <p className="font-bold text-red-700 text-lg">REJECT PAYMENT</p>
                            <p className="text-sm text-gray-600 mt-2">Issue with payment details</p>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">
                            {reviewAction === 'VERIFY' ? 'Verify Payment' : 'Reject Payment'}
                          </h3>
                          <button
                            onClick={() => {
                              setReviewAction('');
                              setReviewData({
                                verifiedTransactionId: '',
                                rejectionReason: '',
                                adminNotes: ''
                              });
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            ← Change Action
                          </button>
                        </div>

                        {reviewAction === 'VERIFY' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Verified UPI Transaction ID * (Must be 12 digits)
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
                                placeholder="Enter the 12-digit transaction ID you verified"
                                maxLength={12}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                ⚠️ Cross-check this with your bank/UPI records before verification
                              </p>
                              {reviewData.verifiedTransactionId && reviewData.verifiedTransactionId.length === 12 && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Valid 12-digit transaction ID
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Notes (Optional - Internal only)
                              </label>
                              <textarea
                                value={reviewData.adminNotes}
                                onChange={(e) => setReviewData({...reviewData, adminNotes: e.target.value})}
                                rows={3}
                                placeholder="Any internal notes about this verification..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                                <CheckCircle size={20} />
                                What happens after verification?
                              </h4>
                              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                                <li>Payment will be marked as <strong>VERIFIED</strong></li>
                                <li>Intern will receive notification immediately</li>
                                <li>Certificate generation process will start <strong>automatically</strong></li>
                                <li>Certificate will be available within 24 hours</li>
                                <li>Certificate session will be created in the system</li>
                                <li>⚠️ This action <strong>cannot be undone</strong></li>
                              </ul>
                            </div>
                          </>
                        )}

                        {reviewAction === 'REJECT' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rejection Reason * (This will be sent to the intern)
                              </label>
                              <textarea
                                value={reviewData.rejectionReason}
                                onChange={(e) => setReviewData({...reviewData, rejectionReason: e.target.value})}
                                rows={5}
                                placeholder="Clearly explain what is wrong with the payment proof so the intern can fix it...&#10;&#10;Example:&#10;• Screenshot is blurry, transaction ID not clearly visible&#10;• UPI transaction ID does not match our records&#10;• Payment date does not match screenshot&#10;• Amount paid is incorrect (₹X instead of ₹Y)&#10;• Payment proof appears to be edited/tampered"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Minimum 10 characters. Be clear and specific so intern can correct the issue.
                              </p>
                              {reviewData.rejectionReason && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Character count: {reviewData.rejectionReason.length}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Notes (Optional - Internal only, NOT sent to intern)
                              </label>
                              <textarea
                                value={reviewData.adminNotes}
                                onChange={(e) => setReviewData({...reviewData, adminNotes: e.target.value})}
                                rows={2}
                                placeholder="Internal notes for admin records..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                                <XCircle size={20} />
                                What happens after rejection?
                              </h4>
                              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                                <li>Payment will be marked as <strong>REJECTED</strong></li>
                                <li>Intern will receive your rejection reason <strong>immediately</strong></li>
                                <li>Intern can see the exact reason in their dashboard</li>
                                <li>Intern can <strong>resubmit</strong> payment proof after fixing the issue</li>
                                <li>Be clear and specific in your rejection reason</li>
                                <li>Intern can submit corrected information again</li>
                              </ul>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                <button
                  onClick={resetReview}
                  disabled={submitting}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Close
                </button>
                {selectedPayment.paymentStatus === 'PENDING' && reviewAction && (
                  <button
                    onClick={reviewAction === 'VERIFY' ? handleVerify : handleReject}
                    disabled={
                      submitting ||
                      (reviewAction === 'VERIFY' && (!reviewData.verifiedTransactionId || reviewData.verifiedTransactionId.length !== 12)) ||
                      (reviewAction === 'REJECT' && (!reviewData.rejectionReason || reviewData.rejectionReason.trim().length < 10))
                    }
                    className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${
                      reviewAction === 'VERIFY'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        {reviewAction === 'VERIFY' ? (
                          <>
                            <CheckCircle size={20} />
                            Verify & Issue Certificate
                          </>
                        ) : (
                          <>
                            <XCircle size={20} />
                            Reject Payment
                          </>
                        )}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentVerificationDashboard;