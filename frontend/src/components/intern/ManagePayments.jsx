import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ManagePayments.css';

const ManagePayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/payments?status=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVerifyModal = (payment) => {
    setVerifyModal(payment);
  };

  const closeVerifyModal = () => {
    setVerifyModal(null);
  };

  const handleVerify = async (status) => {
    if (!verifyModal) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/payments/${verifyModal._id}/verify`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(status === 'verified' 
        ? 'Payment verified and certificate issued!' 
        : 'Payment rejected'
      );
      closeVerifyModal();
      fetchPayments();
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to process payment');
    }
  };

  if (loading) {
    return <div className="loading">Loading payments...</div>;
  }

  return (
    <div className="manage-payments">
      <div className="payments-header">
        <h1>Payment Verification</h1>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
      </div>

      <div className="filter-tabs">
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({payments.filter(p => p.status === 'pending').length})
        </button>
        <button
          className={filter === 'verified' ? 'active' : ''}
          onClick={() => setFilter('verified')}
        >
          Verified
        </button>
        <button
          className={filter === 'rejected' ? 'active' : ''}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </button>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="no-payments">
          <p>No payments found</p>
        </div>
      ) : (
        <div className="payments-grid">
          {payments.map(payment => (
            <div key={payment._id} className="payment-card">
              <div className="payment-header">
                <div className="intern-info">
                  <h3>{payment.intern?.name}</h3>
                  <p>{payment.intern?.email}</p>
                  <p className="user-id">{payment.intern?.userId}</p>
                </div>
                <span className={`status-badge ${payment.status}`}>
                  {payment.status}
                </span>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <strong>Course:</strong>
                  <span>{payment.course?.name}</span>
                </div>
                <div className="detail-row">
                  <strong>Amount:</strong>
                  <span className="amount">₹{payment.amount}</span>
                </div>
                <div className="detail-row">
                  <strong>Transaction ID:</strong>
                  <span className="transaction-id">{payment.transactionId}</span>
                </div>
                <div className="detail-row">
                  <strong>Submitted:</strong>
                  <span>{new Date(payment.submittedAt).toLocaleString()}</span>
                </div>
                {payment.screenshot && (
                  <div className="detail-row">
                    <strong>Screenshot:</strong>
                    <a 
                      href={`http://localhost:5000${payment.screenshot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="screenshot-link"
                    >
                      📷 View Screenshot
                    </a>
                  </div>
                )}
              </div>

              {payment.status === 'pending' && (
                <div className="payment-actions">
                  <button
                    onClick={() => openVerifyModal(payment)}
                    className="btn-verify"
                  >
                    Verify Payment
                  </button>
                </div>
              )}

              {payment.status === 'verified' && payment.verifiedAt && (
                <div className="verified-info">
                  <p>✓ Verified on {new Date(payment.verifiedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {verifyModal && (
        <div className="modal-overlay" onClick={closeVerifyModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verify Payment</h2>
              <button onClick={closeVerifyModal} className="btn-close">×</button>
            </div>

            <div className="modal-body">
              <div className="verify-details">
                <h4>Payment Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Intern:</strong>
                    <span>{verifyModal.intern?.name}</span>
                  </div>
                  <div className="info-item">
                    <strong>Course:</strong>
                    <span>{verifyModal.course?.name}</span>
                  </div>
                  <div className="info-item">
                    <strong>Amount:</strong>
                    <span className="amount-big">₹{verifyModal.amount}</span>
                  </div>
                  <div className="info-item">
                    <strong>Transaction ID:</strong>
                    <span className="transaction-id">{verifyModal.transactionId}</span>
                  </div>
                </div>

                {verifyModal.screenshot && (
                  <div className="screenshot-preview">
                    <h4>Payment Screenshot</h4>
                    <img 
                      src={`http://localhost:5000${verifyModal.screenshot}`}
                      alt="Payment Screenshot"
                      className="payment-screenshot"
                    />
                  </div>
                )}
              </div>

              <div className="verify-warning">
                <h4>⚠️ Important</h4>
                <ul>
                  <li>Verify the transaction ID in your payment gateway</li>
                  <li>Check the amount matches ₹{verifyModal.amount}</li>
                  <li>Ensure screenshot is genuine</li>
                  <li>Once verified, certificate will be automatically issued</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => handleVerify('verified')}
                  className="btn-approve-payment"
                >
                  ✓ Verify & Issue Certificate
                </button>
                <button
                  onClick={() => handleVerify('rejected')}
                  className="btn-reject-payment"
                >
                  ✗ Reject Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePayments;