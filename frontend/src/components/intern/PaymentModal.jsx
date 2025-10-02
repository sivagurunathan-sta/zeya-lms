import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentModal.css';

const PaymentModal = ({ courseId, onClose, onSuccess }) => {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, [courseId]);

  const checkEligibility = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/payments/eligibility/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEligibility(response.data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      alert('Failed to check eligibility');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setScreenshot(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!transactionId.trim()) {
      alert('Please enter transaction ID');
      return;
    }

    if (!screenshot) {
      alert('Please upload payment screenshot');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('transactionId', transactionId);
      formData.append('amount', eligibility.amount);
      formData.append('screenshot', screenshot);

      await axios.post(
        'http://localhost:5000/api/payments/submit',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('Payment submitted successfully! Admin will verify soon.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content payment-modal">
          <div className="loading">Checking eligibility...</div>
        </div>
      </div>
    );
  }

  if (!eligibility || !eligibility.eligible) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Certificate Not Available</h2>
            <button onClick={onClose} className="btn-close">×</button>
          </div>
          <div className="modal-body">
            <div className="ineligible-message">
              <div className="icon">⚠️</div>
              <p>{eligibility?.message || 'You are not eligible for certificate yet'}</p>
              {eligibility?.completedTasks !== undefined && (
                <div className="progress-info">
                  <strong>Tasks Completed:</strong> {eligibility.completedTasks}/{eligibility.totalTasks}
                </div>
              )}
              {eligibility?.finalScore !== undefined && (
                <div className="score-info">
                  <strong>Your Score:</strong> {eligibility.finalScore}% (Need 75%+)
                </div>
              )}
            </div>
            <button onClick={onClose} className="btn-understand">
              I Understand
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎉 Purchase Certificate</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="modal-body">
          <div className="congratulations-section">
            <div className="congrats-icon">🏆</div>
            <h3>Congratulations!</h3>
            <p>You have successfully completed all tasks</p>
            <div className="final-stats">
              <div className="stat">
                <strong>Final Score:</strong>
                <span className="score-value">{eligibility.finalScore}%</span>
              </div>
              <div className="stat">
                <strong>Tasks Completed:</strong>
                <span>{eligibility.completedTasks}/{eligibility.totalTasks}</span>
              </div>
            </div>
          </div>

          <div className="payment-info">
            <h4>Payment Details</h4>
            <div className="amount-display">
              <span>Certificate Fee:</span>
              <strong>₹{eligibility.amount}</strong>
            </div>
          </div>

          <div className="qr-section">
            <h4>Scan QR Code to Pay</h4>
            <div className="qr-placeholder">
              <div className="qr-code">
                📱
                <p>QR CODE</p>
                <small>Scan with any UPI app</small>
              </div>
            </div>
            <div className="upi-details">
              <p><strong>UPI ID:</strong> admin@paytm</p>
              <p><strong>Name:</strong> Student LMS Admin</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="payment-form">
            <div className="form-group">
              <label>Transaction ID / UTR Number *</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID from payment app"
                required
              />
            </div>

            <div className="form-group">
              <label>Upload Payment Screenshot *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
              {screenshot && (
                <small className="file-selected">✓ {screenshot.name}</small>
              )}
            </div>

            <div className="payment-note">
              <p>⚠️ <strong>Important:</strong> After payment verification by admin, your certificate will be generated within 24 hours.</p>
            </div>

            <div className="modal-actions">
              <button type="submit" disabled={submitting} className="btn-submit-payment">
                {submitting ? 'Submitting...' : '💳 Submit Payment'}
              </button>
              <button type="button" onClick={onClose} className="btn-cancel">
                Pay Later
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;