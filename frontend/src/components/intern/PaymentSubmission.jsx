// frontend/src/components/intern/PaymentSubmission.jsx
import React, { useState, useEffect } from 'react';
import { Upload, Check, X, Clock, DollarSign, AlertCircle, FileText, CreditCard } from 'lucide-react';
import axios from 'axios';

const PaymentSubmission = ({ enrollmentId }) => {
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
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPaymentStatus();
  }, [enrollmentId]);

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/payments/status/${enrollmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setExistingPayment(response.data.data.payment);
        setPaymentData(prev => ({
          ...prev,
          amount: response.data.data.enrollment.internship.certificatePrice
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch payment status');
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

  const validateForm = () => {
    if (!paymentData.upiTransactionId) {
      alert('UPI Transaction ID is required');
      return false;
    }
    if (!/^\d{12}$/.test(paymentData.upiTransactionId)) {
      alert('UPI Transaction ID must be exactly 12 digits');
      return false;
    }
    if (!paymentData.upiId) {
      alert('UPI ID is required');
      return false;
    }
    if (!paymentData.paymentDate) {
      alert('Payment date is required');
      return false;
    }
    if (!paymentData.paymentTime) {
      alert('Payment time is required');
      return false;
    }
    if (!paymentData.proofFile) {
      alert('Payment proof screenshot is required');
      return false;
    }
    return true;
  };

  const handleInitiatePayment = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/initiate`,
        { enrollmentId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setExistingPayment(response.data.data);
        alert('Payment initiated! Now submit your payment proof.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

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

      const response = await axios.post(
        `${API_URL}/payments/submit-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setPaymentStatus('submitted');
        setExistingPayment(response.data.data);
        alert('Payment proof submitted successfully! Our team will verify it within 24 hours.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!validateForm()) return;

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

      const response = await axios.post(
        `${API_URL}/payments/resubmit-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setExistingPayment(response.data.data);
        alert('Payment proof resubmitted successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resubmit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Clock className="animate-spin text-blue-600" size={48} />
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
          <p className="text-gray-600 mb-6">
            Your payment has been verified. Your certificate will be ready within 24 hours.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-green-900">
              <strong>Transaction ID:</strong> {existingPayment.transactionId}
            </p>
            <p className="text-sm text-green-900 mt-1">
              <strong>Verified At:</strong> {new Date(existingPayment.verifiedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Certificate Payment</h1>
              <p className="text-gray-600 mt-1">Complete your payment to receive the certificate</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Amount to Pay</p>
              <p className="text-3xl font-bold text-blue-600">₹{paymentData.amount}</p>
            </div>
          </div>
        </div>

        {/* Show rejection message if rejected */}
        {existingPayment?.paymentStatus === 'REJECTED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-0.5" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Payment Rejected</h3>
                <p className="text-red-800 mb-3">{existingPayment.verificationMessage}</p>
                <p className="text-sm text-red-700">Please correct the issue and resubmit your payment proof below.</p>
              </div>
            </div>
          </div>
        )}

        {/* Show pending status */}
        {existingPayment?.paymentStatus === 'PENDING' && paymentStatus !== 'submitted' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="text-yellow-600 mt-0.5" size={24} />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Payment Under Review</h3>
                <p className="text-yellow-800">Your payment proof is being verified. You'll be notified within 24 hours.</p>
              </div>
            </div>
          </div>
        )}

        {!existingPayment && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center">
            <p className="text-gray-600 mb-4">Click below to initiate payment process</p>
            <button
              onClick={handleInitiatePayment}
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Initiating...' : 'Initiate Payment'}
            </button>
          </div>
        )}

        {existingPayment && existingPayment.paymentStatus !== 'PENDING' && (
          <>
            {/* QR Code Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Step 1: Make Payment</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="bg-gray-100 rounded-lg p-8 mb-4">
                    <div className="w-64 h-64 bg-white mx-auto flex items-center justify-center border-4 border-gray-300 rounded-lg">
                      <div className="text-center">
                        <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">QR Code for Payment</p>
                        <p className="text-xs text-gray-500 mt-2">Scan with any UPI app</p>
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
                    <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Important Instructions
                    </h3>
                    <ul className="text-sm text-yellow-800 space-y-2">
                      <li>✓ Pay exactly ₹{paymentData.amount}</li>
                      <li>✓ Use any UPI app (PhonePe, GPay, Paytm, etc.)</li>
                      <li>✓ Save the transaction ID after payment</li>
                      <li>✓ Take a screenshot of payment confirmation</li>
                      <li>✓ Do NOT close the payment app before noting details</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">After Payment</h3>
                    <p className="text-sm text-green-800">
                      You will receive a <strong>12-digit UPI Transaction ID</strong> and confirmation message. 
                      Save these details to submit proof below.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Proof Submission */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Step 2: Submit Payment Proof</h2>
              
              <div className="space-y-6">
                {/* UPI Transaction ID */}
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
                    placeholder="e.g., 123456789012"
                    maxLength={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your payment confirmation message or app transaction history
                  </p>
                </div>

                {/* UPI ID Used */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your UPI ID *
                  </label>
                  <input
                    type="text"
                    value={paymentData.upiId}
                    onChange={(e) => setPaymentData({...paymentData, upiId: e.target.value})}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The UPI ID you used to make the payment
                  </p>
                </div>

                {/* Payment Date & Time */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={paymentData.paymentDate}
                      onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Time *
                    </label>
                    <input
                      type="time"
                      value={paymentData.paymentTime}
                      onChange={(e) => setPaymentData({...paymentData, paymentTime: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Payment Screenshot Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Screenshot / Proof *
                  </label>
                  {!paymentData.proofPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                        className="hidden"
                        id="proof-upload"
                      />
                      <label htmlFor="proof-upload" className="cursor-pointer">
                        <span className="text-blue-600 font-medium hover:text-blue-700">
                          Click to upload
                        </span>
                        <span className="text-gray-600"> or drag and drop</span>
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        PNG, JPG or PDF (Max 5MB)
                      </p>
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
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      {paymentData.proofPreview && !paymentData.proofFile.type.includes('pdf') && (
                        <img 
                          src={paymentData.proofPreview} 
                          alt="Payment proof preview" 
                          className="w-full rounded-lg border border-gray-200"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Remarks (Optional)
                  </label>
                  <textarea
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({...paymentData, remarks: e.target.value})}
                    rows={3}
                    placeholder="Any additional information about the payment..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Important Note */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Please Note
                  </h3>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Provide accurate UPI Transaction ID (12 digits)</li>
                    <li>• Upload clear screenshot showing full payment details</li>
                    <li>• Wrong information may lead to payment rejection</li>
                    <li>• Verification takes 12-24 hours</li>
                  </ul>
                </div>

                {/* Submit Button */}
                <button
                  onClick={existingPayment.paymentStatus === 'REJECTED' ? handleResubmit : handleSubmit}
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Clock className="animate-spin" size={24} />
                      {existingPayment.paymentStatus === 'REJECTED' ? 'Resubmitting...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Check size={24} />
                      {existingPayment.paymentStatus === 'REJECTED' ? 'Resubmit Payment Proof' : 'Submit Payment Proof'}
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

export default PaymentSubmission;