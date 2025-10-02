// frontend/src/components/intern/CertificateDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, CheckCircle, XCircle, Clock, AlertCircle, 
  Download, Award, DollarSign, Lock, Unlock
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const InternCertificateDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [certificateStatus, setCertificateStatus] = useState(null);
  const [paidTasksAccess, setPaidTasksAccess] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCertificateStatus();
    fetchPaidTasksAccess();
  }, []);

  const fetchCertificateStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/intern/certificates/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificateStatus(response.data.data);
    } catch (error) {
      console.error('Fetch certificate status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidTasksAccess = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/intern/certificates/paid-tasks-access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaidTasksAccess(response.data.data);
    } catch (error) {
      console.error('Fetch paid tasks access error:', error);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${API_BASE_URL}/intern/certificates/download/${certificateStatus.enrollment.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Open certificate in new tab
      window.open(response.data.data.certificateUrl, '_blank');
    } catch (error) {
      console.error('Download certificate error:', error);
      alert('Failed to download certificate: ' + error.response?.data?.message);
    }
  };

  const handleSubmitForValidation = async () => {
    if (!uploadFile || !certificateNumber) {
      alert('Please upload certificate and enter certificate number');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('certificate', uploadFile);
      formData.append('certificateNumber', certificateNumber);
      formData.append('internshipTitle', certificateStatus?.enrollment?.internshipTitle || 'Full Stack Web Development Internship');

      await axios.post(
        `${API_BASE_URL}/intern/certificates/submit-for-validation`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      alert('Certificate submitted for validation! Admin will review within 24 hours.');
      setUploadFile(null);
      setCertificateNumber('');
      fetchPaidTasksAccess();
    } catch (error) {
      console.error('Submit certificate error:', error);
      alert('Failed to submit certificate: ' + error.response?.data?.message);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN');
  };

  const calculateHoursRemaining = (expectedDate) => {
    if (!expectedDate) return 0;
    const now = new Date();
    const expected = new Date(expectedDate);
    const diff = expected - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Certificate Dashboard</h1>
          <p className="text-blue-100">Track your certificate status and paid tasks access</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Certificate Eligibility Check */}
        {!certificateStatus?.eligible ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Not Eligible Yet</h3>
              <p className="text-gray-600">
                Complete your internship with 75% or higher score to be eligible for certificate
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Payment Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  {certificateStatus.payment?.status === 'VERIFIED' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Payment Status</h3>
                  <p className="text-sm text-gray-600">Certificate fee: ₹{certificateStatus.enrollment.certificatePrice}</p>
                </div>
              </div>

              {certificateStatus.payment ? (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-gray-600">Amount Paid</p>
                    <p className="font-bold text-green-600">₹{certificateStatus.payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      certificateStatus.payment.status === 'VERIFIED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {certificateStatus.payment.status === 'VERIFIED' ? (
                        <><CheckCircle className="w-3 h-3" /> Verified</>
                      ) : (
                        <><Clock className="w-3 h-3" /> Pending</>
                      )}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Paid At</p>
                    <p className="text-sm text-gray-900">{formatDate(certificateStatus.payment.paidAt)}</p>
                  </div>
                  {certificateStatus.payment.verifiedAt && (
                    <div>
                      <p className="text-xs text-gray-600">Verified At</p>
                      <p className="text-sm text-gray-900">{formatDate(certificateStatus.payment.verifiedAt)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-900 mb-3">Complete payment to receive your certificate</p>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Pay ₹{certificateStatus.enrollment.certificatePrice}
                  </button>
                </div>
              )}
            </div>

            {/* Certificate Status */}
            {certificateStatus.payment?.status === 'VERIFIED' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    certificateStatus.session?.status === 'COMPLETED'
                      ? 'bg-green-100'
                      : 'bg-orange-100'
                  }`}>
                    {certificateStatus.session?.status === 'COMPLETED' ? (
                      <Award className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Certificate Status</h3>
                    <p className="text-sm text-gray-600">Your completion certificate</p>
                  </div>
                </div>

                {certificateStatus.session?.status === 'PENDING_UPLOAD' ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                    <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Certificate Being Prepared</h4>
                    <p className="text-gray-600 mb-4">
                      Your certificate will be ready within 24 hours of payment verification
                    </p>
                    <div className="bg-white rounded-lg p-4 inline-block">
                      <p className="text-sm text-gray-600 mb-1">Expected availability</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatDate(certificateStatus.session.expectedDeliveryAt)}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {calculateHoursRemaining(certificateStatus.session.expectedDeliveryAt)} hours remaining
                      </p>
                    </div>
                  </div>
                ) : certificateStatus.session?.status === 'COMPLETED' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <Award className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-gray-900 mb-2">🎉 Certificate Ready!</h4>
                      <p className="text-gray-600 mb-2">
                        Congratulations! Your completion certificate is now available
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Certificate Number</p>
                          <p className="font-bold text-blue-600">{certificateStatus.session.certificateNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Issued At</p>
                          <p className="text-sm text-gray-900">{formatDate(certificateStatus.session.issuedAt)}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDownloadCertificate}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Certificate
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Paid Tasks Access */}
            {certificateStatus.session?.status === 'COMPLETED' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paidTasksAccess?.hasAccess ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    {paidTasksAccess?.hasAccess ? (
                      <Unlock className="w-5 h-5 text-green-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Paid Tasks Access</h3>
                    <p className="text-sm text-gray-600">₹1000 per premium task</p>
                  </div>
                </div>

                {paidTasksAccess?.hasAccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">✅ Access Granted!</h4>
                    <p className="text-gray-600 mb-4">
                      Your certificate has been verified. You can now access premium paid tasks.
                    </p>
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium flex items-center justify-center gap-2 mx-auto">
                      <Award className="w-5 h-5" />
                      Browse Paid Tasks
                    </button>
                  </div>
                ) : paidTasksAccess?.validation?.status === 'PENDING' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="font-medium text-yellow-900 mb-1">Certificate Under Review</p>
                    <p className="text-sm text-yellow-700 mb-2">
                      Your certificate is being validated by admin. You'll be notified within 24 hours.
                    </p>
                    <p className="text-xs text-yellow-600">
                      Submitted: {formatDate(paidTasksAccess.validation.submittedAt)}
                    </p>
                  </div>
                ) : paidTasksAccess?.validation?.status === 'REJECTED' ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900 mb-1">Certificate Rejected</p>
                          <p className="text-sm text-red-700 mb-2">
                            <strong>Admin Message:</strong> {paidTasksAccess.validation.reviewMessage}
                          </p>
                          <p className="text-xs text-red-600">
                            Please upload the correct certificate and try again
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resubmit Form */}
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-white">
                      <h4 className="font-medium text-gray-900 mb-4">Resubmit Certificate</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Certificate Number
                          </label>
                          <input
                            type="text"
                            value={certificateNumber}
                            onChange={(e) => setCertificateNumber(e.target.value)}
                            placeholder="Enter certificate number (e.g., CERT-2025-0001)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Certificate
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setUploadFile(e.target.files[0])}
                              className="hidden"
                              id="cert-upload"
                            />
                            <label htmlFor="cert-upload" className="cursor-pointer">
                              <span className="text-blue-600 font-medium hover:text-blue-700">
                                Click to upload corrected certificate
                              </span>
                              <p className="text-sm text-gray-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                            </label>
                            {uploadFile && (
                              <div className="mt-3 p-2 bg-green-50 rounded">
                                <p className="text-sm text-green-800 font-medium">{uploadFile.name}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={handleSubmitForValidation}
                          disabled={!uploadFile || !certificateNumber || uploading}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? 'Submitting...' : 'Resubmit for Validation'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
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

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Certificate Number
                        </label>
                        <input
                          type="text"
                          value={certificateNumber}
                          onChange={(e) => setCertificateNumber(e.target.value)}
                          placeholder="Enter certificate number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Found on your certificate (e.g., {certificateStatus.session?.certificateNumber})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Certificate File
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            className="hidden"
                            id="certificate-upload"
                          />
                          <label htmlFor="certificate-upload" className="cursor-pointer">
                            <span className="text-blue-600 font-medium hover:text-blue-700">
                              Click to upload your certificate
                            </span>
                            <p className="text-sm text-gray-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                          </label>
                          {uploadFile && (
                            <div className="mt-3 p-2 bg-green-50 rounded">
                              <p className="text-sm text-green-800 font-medium">{uploadFile.name}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleSubmitForValidation}
                        disabled={!uploadFile || !certificateNumber || uploading}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Submit for Validation
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-4 bg-white rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">📝 Important Guidelines:</p>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Upload the certificate you downloaded from this dashboard</li>
                        <li>Ensure the certificate number matches exactly</li>
                        <li>Certificate must be issued by our LMS system</li>
                        <li>Admin will verify within 24 hours</li>
                        <li>Once approved, you can purchase paid tasks</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InternCertificateDashboard;