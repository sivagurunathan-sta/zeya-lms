import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReviewSubmissions.css';

const ReviewSubmissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/admin/submissions?status=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (submission) => {
    setReviewModal(submission);
    setFeedback('');
  };

  const closeReviewModal = () => {
    setReviewModal(null);
    setFeedback('');
  };

  const handleApprove = async () => {
    if (!reviewModal) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/admin/submissions/${reviewModal._id}/review`,
        {
          status: 'approved',
          feedback: feedback || 'Great work! Task approved.',
          unlockNextTask: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Task approved successfully!');
      closeReviewModal();
      fetchSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Failed to approve submission');
    }
  };

  const handleReject = async () => {
    if (!reviewModal) return;
    
    if (!feedback.trim()) {
      alert('Please provide feedback for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/admin/submissions/${reviewModal._id}/review`,
        {
          status: 'rejected',
          feedback: feedback,
          unlockNextTask: false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Task rejected. Intern will receive feedback.');
      closeReviewModal();
      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert('Failed to reject submission');
    }
  };

  if (loading) {
    return <div className="loading">Loading submissions...</div>;
  }

  return (
    <div className="review-submissions">
      <div className="submissions-header">
        <h1>Review Submissions</h1>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
      </div>

      <div className="filter-tabs">
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({submissions.filter(s => s.status === 'pending').length})
        </button>
        <button
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Approved
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

      {submissions.length === 0 ? (
        <div className="no-submissions">
          <p>No submissions found</p>
        </div>
      ) : (
        <div className="submissions-list">
          {submissions.map(submission => (
            <div key={submission._id} className="submission-card">
              <div className="submission-header">
                <div className="intern-info">
                  <h3>{submission.intern?.name}</h3>
                  <p>{submission.intern?.email}</p>
                </div>
                <span className={`status-badge ${submission.status}`}>
                  {submission.status}
                </span>
              </div>

              <div className="submission-details">
                <div className="detail-row">
                  <strong>Course:</strong>
                  <span>{submission.course?.name}</span>
                </div>
                <div className="detail-row">
                  <strong>Task:</strong>
                  <span>Task {submission.task?.taskNumber} - {submission.task?.title}</span>
                </div>
                <div className="detail-row">
                  <strong>Submitted:</strong>
                  <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <strong>GitHub Link:</strong>
                  <a href={submission.githubLink} target="_blank" rel="noopener noreferrer">
                    {submission.githubLink}
                  </a>
                </div>
                {submission.files && submission.files.length > 0 && (
                  <div className="detail-row">
                    <strong>Files:</strong>
                    <div className="files-list">
                      {submission.files.map((file, idx) => (
                        <a 
                          key={idx}
                          href={`http://localhost:5000${file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          📎 File {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {submission.feedback && (
                  <div className="detail-row feedback-row">
                    <strong>Feedback:</strong>
                    <p>{submission.feedback}</p>
                  </div>
                )}
              </div>

              {submission.status === 'pending' && (
                <div className="submission-actions">
                  <button
                    onClick={() => openReviewModal(submission)}
                    className="btn-review"
                  >
                    Review Now
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewModal && (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Submission</h2>
              <button onClick={closeReviewModal} className="btn-close">×</button>
            </div>

            <div className="modal-body">
              <div className="review-info">
                <p><strong>Intern:</strong> {reviewModal.intern?.name}</p>
                <p><strong>Task:</strong> {reviewModal.task?.title}</p>
                <p><strong>GitHub:</strong> 
                  <a href={reviewModal.githubLink} target="_blank" rel="noopener noreferrer">
                    {reviewModal.githubLink}
                  </a>
                </p>
              </div>

              <div className="feedback-section">
                <label>Feedback (Required for rejection):</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the intern..."
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button onClick={handleApprove} className="btn-approve">
                  ✓ Approve & Unlock Next Task
                </button>
                <button onClick={handleReject} className="btn-reject">
                  ✗ Reject & Send Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSubmissions;