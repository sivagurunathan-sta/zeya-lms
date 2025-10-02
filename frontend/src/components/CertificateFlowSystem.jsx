import React, { useState } from 'react';
import { 
  Upload, CheckCircle, XCircle, Clock, AlertCircle, 
  FileText, Download, Eye, MessageSquare, Award,
  Calendar, User, Mail, Phone, Building
} from 'lucide-react';

const CertificateFlowSystem = () => {
  const [activeView, setActiveView] = useState('admin'); // 'admin' or 'intern'
  const [selectedTab, setSelectedTab] = useState('payments'); // for admin
  
  // Mock data
  const [payments, setPayments] = useState([
    {
      id: 1,
      internName: 'Rahul Kumar',
      internId: 'INT2025001',
      email: 'rahul@example.com',
      amount: 499,
      transactionId: 'TXN123456789',
      paymentDate: '2025-09-28 14:30',
      status: 'pending_verification',
      proofUrl: '/payment-proof.jpg'
    },
    {
      id: 2,
      internName: 'Priya Sharma',
      internId: 'INT2025002',
      email: 'priya@example.com',
      amount: 499,
      transactionId: 'TXN987654321',
      paymentDate: '2025-09-29 10:15',
      status: 'verified',
      proofUrl: '/payment-proof.jpg',
      verifiedAt: '2025-09-29 11:00'
    }
  ]);

  const [certificateSessions, setCertificateSessions] = useState([
    {
      id: 1,
      internName: 'Priya Sharma',
      internId: 'INT2025002',
      email: 'priya@example.com',
      paymentId: 2,
      status: 'pending_upload',
      sessionStarted: '2025-09-29 11:00',
      expectedDelivery: '2025-09-30 11:00',
      waitingHours: 24,
      certificateUrl: null
    },
    {
      id: 2,
      internName: 'Amit Patel',
      internId: 'INT2025003',
      email: 'amit@example.com',
      paymentId: 3,
      status: 'uploaded',
      sessionStarted: '2025-09-27 09:00',
      expectedDelivery: '2025-09-28 09:00',
      certificateUrl: '/cert-amit.pdf',
      uploadedAt: '2025-09-27 16:30',
      certificateNumber: 'CERT-2025-001'
    }
  ]);

  const [paidTaskValidations, setPaidTaskValidations] = useState([
    {
      id: 1,
      internName: 'Amit Patel',
      internId: 'INT2025003',
      email: 'amit@example.com',
      submittedCertUrl: '/intern-cert-amit.pdf',
      submittedAt: '2025-09-28 14:00',
      status: 'pending_validation',
      certificateNumber: 'CERT-2025-001'
    }
  ]);

  const [internStatus, setInternStatus] = useState({
    name: 'Rahul Kumar',
    userId: 'INT2025001',
    payment: {
      status: 'verified',
      amount: 499,
      paidAt: '2025-09-28 14:30',
      verifiedAt: '2025-09-28 15:00'
    },
    certificate: {
      status: 'waiting', // waiting, ready, downloaded
      expectedAt: '2025-09-29 15:00',
      hoursRemaining: 18,
      certificateUrl: null
    },
    paidTaskAccess: {
      hasAccess: false,
      requiresCertUpload: true,
      validationStatus: null
    }
  });

  // Admin Actions
  const handleVerifyPayment = (paymentId) => {
    setPayments(payments.map(p => 
      p.id === paymentId 
        ? { ...p, status: 'verified', verifiedAt: new Date().toISOString() }
        : p
    ));
    
    // Auto-create certificate session
    const payment = payments.find(p => p.id === paymentId);
    const newSession = {
      id: certificateSessions.length + 1,
      internName: payment.internName,
      internId: payment.internId,
      email: payment.email,
      paymentId: payment.id,
      status: 'pending_upload',
      sessionStarted: new Date().toISOString(),
      expectedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      waitingHours: 24,
      certificateUrl: null
    };
    setCertificateSessions([...certificateSessions, newSession]);
    
    alert('Payment verified! Certificate session created. The intern will receive their certificate within 24 hours.');
  };

  const handleUploadCertificate = (sessionId, file) => {
    const certNumber = `CERT-2025-${String(certificateSessions.length + 1).padStart(3, '0')}`;
    setCertificateSessions(certificateSessions.map(s => 
      s.id === sessionId 
        ? { 
            ...s, 
            status: 'uploaded', 
            certificateUrl: URL.createObjectURL(file),
            uploadedAt: new Date().toISOString(),
            certificateNumber: certNumber
          }
        : s
    ));
    alert(`Certificate uploaded successfully! Certificate Number: ${certNumber}\nIntern will be notified and can download it now.`);
  };

  const handleValidatePaidTaskCert = (validationId, isValid, message) => {
    setPaidTaskValidations(paidTaskValidations.map(v => 
      v.id === validationId 
        ? { 
            ...v, 
            status: isValid ? 'approved' : 'rejected',
            validatedAt: new Date().toISOString(),
            adminMessage: message
          }
        : v
    ));
    
    if (isValid) {
      alert('Certificate validated! Intern now has access to paid tasks.');
    } else {
      alert('Certificate rejected. Intern will be notified to resubmit with corrections.');
    }
  };

  // Intern Actions
  const handleInternUploadCert = (file) => {
    setInternStatus({
      ...internStatus,
      paidTaskAccess: {
        hasAccess: false,
        requiresCertUpload: true,
        validationStatus: 'pending_validation',
        submittedAt: new Date().toISOString()
      }
    });
    alert('Certificate submitted for validation! Admin will review it within 24 hours.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Role Switcher */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Certificate Management System
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admin View
              </button>
              <button
                onClick={() => setActiveView('intern')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'intern'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Intern View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin View */}
      {activeView === 'admin' && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Admin Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b">
              <nav className="flex">
                {['payments', 'certificates', 'validations'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-6 py-4 font-medium capitalize border-b-2 transition-colors ${
                      selectedTab === tab
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

            {/* Payment Verification Tab */}
            {selectedTab === 'payments' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Payment Verification</h2>
                    <p className="text-sm text-gray-600">Verify intern certificate payments (₹499)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {payments.map(payment => (
                    <div key={payment.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {payment.internName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{payment.internName}</h3>
                              <p className="text-sm text-gray-600">{payment.internId} • {payment.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                            <div>
                              <p className="text-xs text-gray-600">Amount</p>
                              <p className="font-bold text-green-600">₹{payment.amount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Transaction ID</p>
                              <p className="font-medium text-gray-900 text-sm">{payment.transactionId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Payment Date</p>
                              <p className="font-medium text-gray-900 text-sm">{payment.paymentDate}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Status</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                payment.status === 'verified'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payment.status === 'verified' ? (
                                  <><CheckCircle className="w-3 h-3" /> Verified</>
                                ) : (
                                  <><Clock className="w-3 h-3" /> Pending</>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
                            <Eye className="w-4 h-4" />
                            View Proof
                          </button>
                          {payment.status === 'pending_verification' && (
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
                  ))}
                </div>
              </div>
            )}

            {/* Certificate Upload Tab */}
            {selectedTab === 'certificates' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Certificate Upload</h2>
                    <p className="text-sm text-gray-600">Upload certificates for verified payments</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {certificateSessions.map(session => (
                    <div key={session.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                              {session.internName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{session.internName}</h3>
                              <p className="text-sm text-gray-600">{session.internId} • {session.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                            <div>
                              <p className="text-xs text-gray-600">Session Started</p>
                              <p className="font-medium text-gray-900 text-sm">{session.sessionStarted}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Expected Delivery</p>
                              <p className="font-medium text-gray-900 text-sm">{session.expectedDelivery}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Status</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                session.status === 'uploaded'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {session.status === 'uploaded' ? (
                                  <><CheckCircle className="w-3 h-3" /> Uploaded</>
                                ) : (
                                  <><Clock className="w-3 h-3" /> Pending Upload</>
                                )}
                              </span>
                            </div>
                            {session.certificateNumber && (
                              <div>
                                <p className="text-xs text-gray-600">Certificate #</p>
                                <p className="font-bold text-blue-600 text-sm">{session.certificateNumber}</p>
                              </div>
                            )}
                          </div>

                          {session.status === 'pending_upload' && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                <AlertCircle className="w-4 h-4" />
                                <span className="font-medium text-sm">Action Required</span>
                              </div>
                              <p className="text-sm text-yellow-700">
                                Upload certificate within {session.waitingHours} hours. Intern is waiting to receive their certificate.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {session.status === 'pending_upload' ? (
                            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium cursor-pointer">
                              <Upload className="w-4 h-4" />
                              Upload Certificate
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    handleUploadCertificate(session.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          ) : (
                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
                              <Eye className="w-4 h-4" />
                              View Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid Task Validation Tab */}
            {selectedTab === 'validations' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Paid Task Certificate Validation</h2>
                    <p className="text-sm text-gray-600">Validate intern-uploaded certificates for paid task access</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {paidTaskValidations.map(validation => (
                    <div key={validation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                              {validation.internName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{validation.internName}</h3>
                              <p className="text-sm text-gray-600">{validation.internId} • {validation.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                            <div>
                              <p className="text-xs text-gray-600">Submitted At</p>
                              <p className="font-medium text-gray-900 text-sm">{validation.submittedAt}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Certificate Number</p>
                              <p className="font-bold text-blue-600 text-sm">{validation.certificateNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Status</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                validation.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : validation.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {validation.status === 'approved' ? (
                                  <><CheckCircle className="w-3 h-3" /> Approved</>
                                ) : validation.status === 'rejected' ? (
                                  <><XCircle className="w-3 h-3" /> Rejected</>
                                ) : (
                                  <><Clock className="w-3 h-3" /> Pending</>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-900 font-medium mb-2">📋 Validation Checklist:</p>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                              <li>Verify certificate number matches our records</li>
                              <li>Check intern name and ID are correct</li>
                              <li>Ensure certificate is not tampered or fake</li>
                              <li>Confirm certificate was issued by our system</li>
                            </ul>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
                            <Eye className="w-4 h-4" />
                            View Certificate
                          </button>
                          {validation.status === 'pending_validation' && (
                            <>
                              <button
                                onClick={() => handleValidatePaidTaskCert(validation.id, true, 'Certificate verified successfully!')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const message = prompt('Enter rejection reason:');
                                  if (message) {
                                    handleValidatePaidTaskCert(validation.id, false, message);
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
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intern View */}
      {activeView === 'intern' && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-6">
            <h2 className="text-3xl font-bold mb-2">Welcome, {internStatus.name}!</h2>
            <p className="text-blue-100">ID: {internStatus.userId}</p>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Payment Status</h3>
                <p className="text-sm text-gray-600">Certificate fee payment</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-gray-600">Amount Paid</p>
                <p className="font-bold text-green-600">₹{internStatus.payment.amount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Status</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-600">Paid At</p>
                <p className="text-sm text-gray-900">{internStatus.payment.paidAt}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Verified At</p>
                <p className="text-sm text-gray-900">{internStatus.payment.verifiedAt}</p>
              </div>
            </div>
          </div>

          {/* Certificate Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Certificate Status</h3>
                <p className="text-sm text-gray-600">Your completion certificate</p>
              </div>
            </div>

            {internStatus.certificate.status === 'waiting' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-900 mb-2">Certificate Being Prepared</h4>
                <p className="text-gray-600 mb-4">
                  Your certificate will be ready within 24 hours of payment verification
                </p>
                <div className="bg-white rounded-lg p-4 inline-block">
                  <p className="text-sm text-gray-600 mb-1">Expected availability</p>
                  <p className="text-2xl font-bold text-orange-600">{internStatus.certificate.expectedAt}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {internStatus.certificate.hoursRemaining} hours remaining
                  </p>
                </div>
              </div>
            )}

            {internStatus.certificate.status === 'ready' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Award className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-900 mb-2">🎉 Certificate Ready!</h4>
                <p className="text-gray-600 mb-4">
                  Congratulations! Your completion certificate is now available
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-medium flex items-center gap-2 mx-auto">
                  <Download className="w-5 h-5" />
                  Download Certificate
                </button>
              </div>
            )}
          </div>

          {/* Paid Tasks Access */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Paid Tasks Access</h3>
                <p className="text-sm text-gray-600">Upload certificate to unlock premium tasks</p>
              </div>
            </div>

            {!internStatus.paidTaskAccess.hasAccess && internStatus.paidTaskAccess.requiresCertUpload && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Upload Your Certificate</h4>
                  <p className="text-gray-600 mb-4">
                    To access paid tasks (₹1000 each), please upload your internship completion certificate
                  </p>
                </div>

                {internStatus.paidTaskAccess.validationStatus === 'pending_validation' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="font-medium text-yellow-900 mb-1">Certificate Under Review</p>
                    <p className="text-sm text-yellow-700">
                      Your certificate is being validated by admin. You'll be notified within 24 hours.
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      Submitted at: {internStatus.paidTaskAccess.submittedAt}
                    </p>
                  </div>
                ) : internStatus.paidTaskAccess.validationStatus === 'rejected' ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900 mb-1">Certificate Rejected</p>
                          <p className="text-sm text-red-700 mb-3">
                            <strong>Admin Message:</strong> Certificate number doesn't match our records. Please upload the correct certificate that was issued by our LMS system.
                          </p>
                        </div>
                      </div>
                    </div>
                    <label className="block">
                      <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white">
                        <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                        <p className="text-blue-600 font-medium mb-1">Click to upload corrected certificate</p>
                        <p className="text-sm text-gray-500">PDF, JPG, or PNG (Max 5MB)</p>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              handleInternUploadCert(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                      <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                      <p className="text-blue-600 font-medium mb-1">Click to upload your certificate</p>
                      <p className="text-sm text-gray-500">PDF, JPG, or PNG (Max 5MB)</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleInternUploadCert(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </label>
                )}

                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">📝 Important Guidelines:</p>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>Upload the certificate you received after completing all 35 tasks</li>
                    <li>Ensure the certificate number is clearly visible</li>
                    <li>Certificate must be issued by our LMS system</li>
                    <li>Admin will verify within 24 hours</li>
                    <li>Once approved, you can purchase paid tasks for ₹1000 each</li>
                  </ul>
                </div>
              </div>
            )}

            {internStatus.paidTaskAccess.hasAccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-900 mb-2">✅ Access Granted!</h4>
                <p className="text-gray-600 mb-4">
                  Your certificate has been verified. You can now access premium paid tasks.
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium flex items-center gap-2 mx-auto">
                  <Award className="w-5 h-5" />
                  Browse Paid Tasks
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Flow Information */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🔄 System Flow Overview</h3>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Payment Verification</h4>
                <p className="text-gray-600 text-sm">
                  Admin verifies the ₹499 payment made by intern for certificate fee. Once verified, a certificate session is automatically created.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">24-Hour Wait Period</h4>
                <p className="text-gray-600 text-sm">
                  After payment verification, intern waits up to 24 hours for admin to upload their completion certificate. Certificate session tracks this timeline.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Certificate Upload by Admin</h4>
                <p className="text-gray-600 text-sm">
                  Admin uploads the completion certificate to intern's profile. Certificate gets a unique number (e.g., CERT-2025-001). Intern is notified immediately.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Intern Downloads Certificate</h4>
                <p className="text-gray-600 text-sm">
                  Intern can now download their completion certificate from their dashboard. They can save it for their records.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Paid Tasks Access Request</h4>
                <p className="text-gray-600 text-sm">
                  Intern clicks on "Paid Tasks" section (₹1000 per task). System asks them to upload their internship certificate to verify eligibility.
                </p>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                6
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Certificate Upload by Intern</h4>
                <p className="text-gray-600 text-sm">
                  Intern uploads the certificate they just downloaded. This goes to admin for validation to ensure it's authentic and not fake.
                </p>
              </div>
            </div>

            {/* Step 7 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                7
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Admin Validation</h4>
                <p className="text-gray-600 text-sm mb-2">
                  Admin checks if the uploaded certificate is genuine by verifying:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside ml-4">
                  <li>Certificate number matches system records</li>
                  <li>Intern name and ID are correct</li>
                  <li>Certificate is not tampered or fake</li>
                  <li>Was actually issued by the LMS</li>
                </ul>
              </div>
            </div>

            {/* Step 8a */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                8a
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">✅ If Certificate is Valid</h4>
                <p className="text-gray-600 text-sm">
                  Admin approves the certificate. Intern immediately gets access to paid tasks and can purchase them for ₹1000 each.
                </p>
              </div>
            </div>

            {/* Step 8b */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                8b
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">❌ If Certificate is Fake/Invalid</h4>
                <p className="text-gray-600 text-sm mb-2">
                  Admin rejects the certificate with a detailed message explaining the issue. Intern receives notification with:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside ml-4">
                  <li>Reason for rejection (e.g., "Certificate number doesn't match")</li>
                  <li>Instructions on what to correct</li>
                  <li>Option to resubmit the correct certificate</li>
                </ul>
              </div>
            </div>

            {/* Step 9 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold">
                9
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Resubmission (if rejected)</h4>
                <p className="text-gray-600 text-sm">
                  Intern reads the admin's feedback, corrects the mistake, and uploads the correct certificate again. Process returns to Step 7 for re-validation.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">🎯 Key Benefits:</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Automated:</strong> Certificate sessions auto-created after payment verification</li>
              <li><strong>Time-tracked:</strong> 24-hour SLA for certificate delivery</li>
              <li><strong>Secure:</strong> Double verification prevents fake certificates</li>
              <li><strong>Transparent:</strong> Clear communication at every step</li>
              <li><strong>Fair:</strong> Interns get chance to correct and resubmit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateFlowSystem;