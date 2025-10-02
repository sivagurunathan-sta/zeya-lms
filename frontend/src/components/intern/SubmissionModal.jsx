import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Github, FileText, Upload, Filter, Search } from 'lucide-react';

const AdminReviewDashboard = () => {
  const [submissions, setSubmissions] = useState([
    {
      id: '1',
      taskNumber: 1,
      taskTitle: 'Setup Development Environment',
      internName: 'John Doe',
      internUserId: 'INT20250001',
      submissionType: 'GITHUB',
      githubRepoUrl: 'https://github.com/johndoe/dev-setup',
      submissionDate: '2025-01-15T10:30:00',
      status: 'PENDING',
      attemptNumber: 1,
      maxAttempts: 3,
      points: 100
    },
    {
      id: '2',
      taskNumber: 2,
      taskTitle: 'HTML & CSS Portfolio',
      internName: 'Jane Smith',
      internUserId: 'INT20250002',
      submissionType: 'FORM',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQL...',
      submissionDate: '2025-01-15T14:20:00',
      status: 'PENDING',
      attemptNumber: 1,
      maxAttempts: 3,
      points: 100
    },
    {
      id: '3',
      taskNumber: 1,
      taskTitle: 'Setup Development Environment',
      internName: 'Mike Johnson',
      internUserId: 'INT20250003',
      submissionType: 'FILE',
      fileName: 'setup-screenshots.pdf',
      fileUrl: '/uploads/setup-screenshots.pdf',
      submissionDate: '2025-01-14T16:45:00',
      status: 'APPROVED',
      score: 95,
      adminFeedback: 'Excellent work! All setup steps completed correctly.',
      reviewedAt: '2025-01-14T18:00:00',
      attemptNumber: 1,
      maxAttempts: 3,
      points: 100
    }
  ]);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewData, setReviewData] = useState({
    score: '',
    feedback: '',
    allowResubmission: true
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleReview = (submissionId, action) => {
    // Simulate API call
    const updatedSubmissions = submissions.map(sub => {
      if (sub.id === submissionId) {
        return {
          ...sub,
          status: action === 'OPEN' ? 'APPROVED' : 'REJECTED',
          score: action === 'OPEN' ? parseInt(reviewData.score) || sub.points : 0,
          adminFeedback: reviewData.feedback,
          reviewedAt: new Date().toISOString()
        };
      }
      return sub;
    });
    
    setSubmissions(updatedSubmissions);
    setSelectedSubmission(null);
    setReviewData({ score: '', feedback: '', allowResubmission: true });
    alert(`Task ${action === 'OPEN' ? 'APPROVED' : 'CLOSED (REJECTED)'} successfully!`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, text: 'Pending Review' },
      APPROVED: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, text: 'Approved (OPEN)' },
      REJECTED: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, text: 'Rejected (CLOSE)' },
      RESUBMITTED: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock, text: 'Resubmitted' }
    };
    
    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
        <Icon size={16} />
        {badge.text}
      </div>
    );
  };

  const getSubmissionTypeIcon = (type) => {
    const icons = {
      GITHUB: { icon: Github, color: 'text-gray-700', bg: 'bg-gray-100' },
      FORM: { icon: FileText, color: 'text-blue-700', bg: 'bg-blue-100' },
      FILE: { icon: Upload, color: 'text-green-700', bg: 'bg-green-100' }
    };
    
    const config = icons[type];
    const Icon = config.icon;
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md ${config.bg} ${config.color} text-sm font-medium`}>
        <Icon size={16} />
        {type}
      </div>
    );
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesSearch = sub.internName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.internUserId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.taskTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING' || s.status === 'RESUBMITTED').length,
    approved: submissions.filter(s => s.status === 'APPROVED').length,
    rejected: submissions.filter(s => s.status === 'REJECTED').length
  };

  const ReviewModal = () => {
    if (!selectedSubmission) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <h2 className="text-2xl font-bold">
              Review Submission
            </h2>
            <p className="text-blue-100 mt-1">
              Task {selectedSubmission.taskNumber}: {selectedSubmission.taskTitle}
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Intern Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Intern Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium text-gray-900">{selectedSubmission.internName}</p>
                </div>
                <div>
                  <span className="text-gray-600">User ID:</span>
                  <p className="font-medium text-gray-900">{selectedSubmission.internUserId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Submission Date:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedSubmission.submissionDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Attempt:</span>
                  <p className="font-medium text-gray-900">
                    {selectedSubmission.attemptNumber} / {selectedSubmission.maxAttempts}
                  </p>
                </div>
              </div>
            </div>

            {/* Submission Details */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Submission Details</h3>
                {getSubmissionTypeIcon(selectedSubmission.submissionType)}
              </div>

              {selectedSubmission.submissionType === 'GITHUB' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">GitHub Repository:</p>
                  <a 
                    href={selectedSubmission.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Github size={20} />
                    {selectedSubmission.githubRepoUrl}
                  </a>
                </div>
              )}

              {selectedSubmission.submissionType === 'FORM' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Google Form Response:</p>
                  <a 
                    href={selectedSubmission.googleFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <FileText size={20} />
                    View Form Response
                  </a>
                </div>
              )}

              {selectedSubmission.submissionType === 'FILE' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Uploaded File:</p>
                  <a 
                    href={selectedSubmission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Upload size={20} />
                    {selectedSubmission.fileName}
                  </a>
                </div>
              )}

              {selectedSubmission.additionalNotes && (
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">Additional Notes:</p>
                  <p className="text-sm text-blue-800">{selectedSubmission.additionalNotes}</p>
                </div>
              )}
            </div>

            {/* Review Action Selection */}
            {!reviewAction && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Choose Review Action</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setReviewAction('OPEN')}
                    className="p-6 border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors group"
                  >
                    <CheckCircle className="text-green-600 mx-auto mb-2" size={48} />
                    <p className="font-bold text-green-700 text-lg">OPEN (Approve)</p>
                    <p className="text-sm text-gray-600 mt-2">Task completed correctly</p>
                  </button>
                  
                  <button
                    onClick={() => setReviewAction('CLOSE')}
                    className="p-6 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors group"
                  >
                    <XCircle className="text-red-600 mx-auto mb-2" size={48} />
                    <p className="font-bold text-red-700 text-lg">CLOSE (Reject)</p>
                    <p className="text-sm text-gray-600 mt-2">Task needs improvement</p>
                  </button>
                </div>
              </div>
            )}

            {/* Review Form */}
            {reviewAction && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {reviewAction === 'OPEN' ? 'Approve Submission' : 'Reject Submission'}
                  </h3>
                  <button
                    onClick={() => setReviewAction('')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Change Action
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Score (out of {selectedSubmission.points}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedSubmission.points}
                    value={reviewData.score}
                    onChange={(e) => setReviewData({...reviewData, score: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={reviewAction === 'OPEN' ? "Enter score" : "0"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Feedback *
                  </label>
                  <textarea
                    value={reviewData.feedback}
                    onChange={(e) => setReviewData({...reviewData, feedback: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={reviewAction === 'OPEN' 
                      ? "Provide positive feedback and suggestions for improvement..."
                      : "Explain what needs to be corrected for resubmission..."
                    }
                    required
                  />
                </div>

                {reviewAction === 'CLOSE' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowResubmission"
                      checked={reviewData.allowResubmission}
                      onChange={(e) => setReviewData({...reviewData, allowResubmission: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="allowResubmission" className="text-sm text-gray-700">
                      Allow resubmission within 7 days
                    </label>
                  </div>
                )}

                <div className={`rounded-lg p-4 ${reviewAction === 'OPEN' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <h4 className={`font-medium mb-2 ${reviewAction === 'OPEN' ? 'text-green-900' : 'text-red-900'}`}>
                    What happens next?
                  </h4>
                  <ul className={`text-sm space-y-1 list-disc list-inside ${reviewAction === 'OPEN' ? 'text-green-800' : 'text-red-800'}`}>
                    {reviewAction === 'OPEN' ? (
                      <>
                        <li>Intern will be notified of approval</li>
                        <li>Score will be added to their progress</li>
                        <li>Next task will unlock after 12 hours wait time</li>
                        <li>If this is the last task, payment option will appear</li>
                      </>
                    ) : (
                      <>
                        <li>Intern will be notified of rejection</li>
                        <li>They can view your feedback in their dashboard</li>
                        {reviewData.allowResubmission && (
                          <>
                            <li>Resubmission opportunity will be created (7 days)</li>
                            <li>Attempt count: {selectedSubmission.attemptNumber + 1}/{selectedSubmission.maxAttempts}</li>
                          </>
                        )}
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => {
                setSelectedSubmission(null);
                setReviewAction('');
                setReviewData({ score: '', feedback: '', allowResubmission: true });
              }}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
            {reviewAction && (
              <button
                onClick={() => handleReview(selectedSubmission.id, reviewAction)}
                className={`px-6 py-2 rounded-md font-medium text-white ${
                  reviewAction === 'OPEN' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewAction === 'OPEN' ? '✓ Approve & Open Task' : '✗ Reject & Close Task'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Task Submission Review
          </h1>
          <p className="text-gray-600">
            Review and approve/reject intern task submissions
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Eye className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Approved (OPEN)</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rejected (CLOSE)</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by intern name, ID, or task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved (OPEN)</option>
                <option value="REJECTED">Rejected (CLOSE)</option>
                <option value="RESUBMITTED">Resubmitted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {submission.internName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.internUserId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        Task {submission.taskNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.taskTitle}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSubmissionTypeIcon(submission.submissionType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(submission.submissionDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(submission.submissionDate).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.score !== undefined ? (
                        <span className="text-sm font-medium text-gray-900">
                          {submission.score}/{submission.points}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Not graded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className={`px-4 py-2 rounded-md font-medium ${
                          submission.status === 'PENDING' || submission.status === 'RESUBMITTED'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {submission.status === 'PENDING' || submission.status === 'RESUBMITTED' 
                          ? 'Review Now' 
                          : 'View Details'
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No submissions found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Review Guidelines:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>OPEN (Approve):</strong> Task completed correctly - Next task unlocks after 12 hours</li>
            <li><strong>CLOSE (Reject):</strong> Task needs improvement - Allow resubmission if attempts remain</li>
            <li>Provide clear, constructive feedback for all submissions</li>
            <li>Ensure scores reflect the quality of work submitted</li>
            <li>Monitor completion rates and provide support for struggling interns</li>
          </ul>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal />
    </div>
  );
};

export default AdminReviewDashboard;