import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, CheckCircle, XCircle, Clock, AlertCircle, 
  FileText, Download, Eye, Award, DollarSign, Users
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminCertificateDashboard = () => {
  const [activeTab, setActiveTab] = useState('payments');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  
  // Data states
  const [payments, setPayments] = useState([]);
  const [certificateSessions, setCertificateSessions] = useState([]);
  const [validations, setValidations] = useState([]);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    fetchStatistics();
    fetchData();
  }, [activeTab]);

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/admin/certificates/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Fetch statistics error:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      if (activeTab === 'payments') {
        const response = await axios.get(`${API_BASE_URL}/admin/certificates/payments/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPayments(response.data.data);
      } else if (activeTab === 'certificates') {
        const response = await axios.get(`${API_BASE_URL}/admin/certificates/certificate-sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCertificateSessions(response.data.data);
      } else if (activeTab === 'validations') {
        const response = await axios.get(`${API_BASE_URL}/admin/certificates/certificate-validations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setValidations(response.data.data);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      alert('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to verify this payment?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `${API_BASE_URL}/admin/certificates/payments/${paymentId}/verify`,
        { remarks: 'Payment verified successfully' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Payment verified! Certificate session created.');
      fetchData();
      fetchStatistics();
    } catch (error) {
      console.error('Verify payment error:', error);
      alert('Failed to verify payment: ' + error.response?.data?.message);
    }
  };

  const handleUploadCertificate = async (sessionId) => {
    if (!uploadFile) {
      alert('Please select a certificate file');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('certificate', uploadFile);

      await axios.post(
        `${API_BASE_URL}/admin/certificates/certificate-sessions/${sessionId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      alert('Certificate uploaded successfully!');
      setShowUploadModal(false);
      setUploadFile(null);
      setSelectedItem(null);
      fetchData();
      fetchStatistics();
    } catch (error) {
      console.error('Upload certificate error:', error);
      alert('Failed to upload certificate: ' + error.response?.data?.message);
    }
  };

  const handleReviewValidation = async (validationId, isValid) => {
    if (!reviewMessage && !isValid) {
      alert('Please enter a reason for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `${API_BASE_URL}/admin/certificates/certificate-validations/${validationId}/review`,
        { isValid, reviewMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(isValid ? 'Certificate approved!' : 'Certificate rejected. Intern will be notified.');
      setReviewMessage('');
      setSelectedItem(null);
      fetchData();
      fetchStatistics();
    } catch (error) {
      console.error('Review validation error:', error);
      alert('Failed to review certificate: ' + error.response?.data?.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN');
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      VERIFIED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Verified' },
      PENDING_UPLOAD: { color: 'bg-orange-100 text-orange-800', icon: Clock, text: 'Pending Upload' },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Completed' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejected' }
    };
    
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Certificate Management</h1>
              <p className="text-gray-600 mt-1">Manage payments, certificates, and validations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Issued</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.certificates.totalIssued}</p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pending Upload</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.certificates.pendingUpload}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Issued Today</p>
                  <p className="text-2xl font-bold text-green-600">{stats.certificates.issuedToday}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pending Validation</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.validations.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.validations.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.validations.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex">
              {['payments', 'certificates', 'validations'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'payments' && '1. Payment Verification'}
                  {tab === 'certificates' && '2. Certificate Upload'}
                  {tab === 'validations' && '3. Paid Task Validation'}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading...</p>
              </div>
            ) : (
              <>
                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Payment Verification</h2>
                        <p className="text-sm text-gray-600">Verify certificate payments (₹499)</p>
                      </div>
                    </div>

                    {payments.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>No pending payments</p>
                      </div>
                    ) : (
                      payments.map(payment => (
                        <div key={payment.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {payment.intern.name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{payment.intern.name}</h3>
                                  <p className="text-sm text-gray-600">{payment.intern.userId} • {payment.intern.email}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                                <div>
                                  <p className="text-xs text-gray-600">Amount</p>
                                  <p className="font-bold text-green-600">₹{payment.amount}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Transaction ID</p>
                                  <p className="font-medium text-gray-900 text-sm">{payment.transactionId || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Payment Date</p>
                                  <p className="font-medium text-gray-900 text-sm">{formatDate(payment.createdAt)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Status</p>
                                  {getStatusBadge(payment.paymentStatus)}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              {payment.paymentProofUrl && (
                                <button 
                                  onClick={() => window.open(payment.paymentProofUrl, '_blank')}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Proof
                                </button>
                              )}
                              {payment.paymentStatus === 'PENDING' && (
                                <button
                                  onClick={() => handleVerifyPayment(payment.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Verify Payment
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Certificates Tab */}
                {activeTab === 'certificates' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Certificate Upload</h2>
                        <p className="text-sm text-gray-600">Upload certificates within 24 hours</p>
                      </div>
                    </div>

                    {certificateSessions.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>No certificate sessions</p>
                      </div>
                    ) : (
                      certificateSessions.map(session => (
                        <div key={session.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {session.intern.name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{session.intern.name}</h3>
                                  <p className="text-sm text-gray-600">{session.intern.userId} • {session.intern.email}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                                <div>
                                  <p className="text-xs text-gray-600">Started</p>
                                  <p className="font-medium text-gray-900 text-sm">{formatDate(session.sessionStartedAt)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Expected By</p>
                                  <p className="font-medium text-gray-900 text-sm">{formatDate(session.expectedDeliveryAt)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Status</p>
                                  {getStatusBadge(session.status)}
                                </div>
                                {session.certificateNumber && (
                                  <div>
                                    <p className="text-xs text-gray-600">Cert #</p>
                                    <p className="font-bold text-blue-600 text-sm">{session.certificateNumber}</p>
                                  </div>
                                )}
                              </div>

                              {session.status === 'PENDING_UPLOAD' && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium text-sm">Action Required</span>
                                  </div>
                                  <p className="text-sm text-yellow-700">
                                    Upload certificate within 24 hours. Intern is waiting!
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              {session.status === 'PENDING_UPLOAD' ? (
                                <button
                                  onClick={() => {
                                    setSelectedItem(session);
                                    setShowUploadModal(true);
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload Certificate
                                </button>
                              ) : (
                                <button 
                                  onClick={() => window.open(session.certificateUrl, '_blank')}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Certificate
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Validations Tab */}
                {activeTab === 'validations' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Certificate Validation</h2>
                        <p className="text-sm text-gray-600">Validate certificates for paid task access</p>
                      </div>
                    </div>

                    {validations.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>No validation requests</p>
                      </div>
                    ) : (
                      validations.map(validation => (
                        <div key={validation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                  {validation.user.name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{validation.user.name}</h3>
                                  <p className="text-sm text-gray-600">{validation.user.userId} • {validation.user.email}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                                <div>
                                  <p className="text-xs text-gray-600">Submitted</p>
                                  <p className="font-medium text-gray-900 text-sm">{formatDate(validation.submittedAt)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Certificate #</p>
                                  <p className="font-bold text-blue-600 text-sm">{validation.certificateNumber}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Status</p>
                                  {getStatusBadge(validation.status)}
                                </div>
                              </div>

                              {validation.reviewMessage && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                  <p className="text-sm text-blue-900"><strong>Review:</strong> {validation.reviewMessage}</p>
                                </div>
                              )}

                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900 font-medium mb-2">📋 Validation Checklist:</p>
                                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                  <li>Verify certificate number matches system records</li>
                                  <li>Check intern name and ID are correct</li>
                                  <li>Ensure certificate is not tampered or fake</li>
                                  <li>Confirm certificate was issued by our LMS</li>
                                </ul>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <button 
                                onClick={() => window.open(validation.certificateUrl, '_blank')}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                              >
                                <Eye className="w-4 h-4" />
                                View Certificate
                              </button>
                              
                              {validation.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedItem(validation);
                                      setReviewMessage('Certificate verified successfully! You now have access to paid tasks.');
                                      handleReviewValidation(validation.id, true);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      const message = prompt('Enter rejection reason:');
                                      if (message) {
                                        setReviewMessage(message);
                                        handleReviewValidation(validation.id, false);
                                      }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Certificate</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Intern: <strong>{selectedItem.intern.name}</strong></p>
              <p className="text-sm text-gray-600">ID: <strong>{selectedItem.intern.userId}</strong></p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="hidden"
                id="certificate-upload"
              />
              <label htmlFor="certificate-upload" className="cursor-pointer">
                <span className="text-blue-600 font-medium hover:text-blue-700">Click to upload certificate</span>
                <p className="text-sm text-gray-500 mt-1">PDF, JPG, or PNG (Max 10MB)</p>
              </label>
              {uploadFile && (
                <div className="mt-3 p-2 bg-green-50 rounded">
                  <p className="text-sm text-green-800 font-medium">{uploadFile.name}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setSelectedItem(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUploadCertificate(selectedItem.id)}
                disabled={!uploadFile}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificateDashboard;