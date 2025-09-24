import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  ExternalLink, 
  Star,
} from 'lucide-react';
import { adminAPI } from '../../services/adminAPI';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

const ReviewSubmissions = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: submissionsData, isLoading } = useQuery(
    ['admin-submissions', currentPage, debouncedSearch, statusFilter],
    () => adminAPI.getSubmissions({
      page: currentPage,
      limit: 20,
      search: debouncedSearch,
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  const reviewSubmissionMutation = useMutation(
    ({ submissionId, data }) => adminAPI.reviewSubmission(submissionId, data),
    {
      onSuccess: () => {
        toast.success('Submission reviewed successfully');
        queryClient.invalidateQueries('admin-submissions');
        setShowReviewModal(false);
        setSelectedSubmission(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to review submission');
      },
    }
  );

  const handleReviewSubmission = (data) => {
    reviewSubmissionMutation.mutate({
      submissionId: selectedSubmission.id,
      data
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const { submissions = [], pagination = {} } = submissionsData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review Submissions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and grade student task submissions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="PENDING">Pending Review</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="all">All Submissions</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.total || 0} submissions
            </span>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student & Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {submission.user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {submission.task.title} • Day {submission.task.dayNumber}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <a
                      href={submission.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-indigo-600 hover:text-indigo-500"
                    >
                      <span className="text-sm truncate max-w-xs">
                        {submission.githubRepoUrl.split('/').slice(-2).join('/')}
                      </span>
                      <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                    </a>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {submission.isLate ? (
                        <span className="text-red-600">
                          Late by {Math.round(submission.hoursLate)}h
                        </span>
                      ) : (
                        <span className="text-green-600">On time</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      submission.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : submission.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : submission.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {submission.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    {submission.score !== null ? (
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {submission.score}%
                        </span>
                        <div className="ml-2 flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(submission.score / 20)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Not graded
                      </span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setShowReviewModal(true);
                      }}
                      className={submission.status === 'PENDING' ? '' : 'opacity-75'}
                    >
                      {submission.status === 'PENDING' ? 'Review' : 'Edit Review'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Submission"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            {/* Submission Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Submission Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Student:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {selectedSubmission.user.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Task:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {selectedSubmission.task.title}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Day:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {selectedSubmission.task.dayNumber}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(selectedSubmission.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <a
                  href={selectedSubmission.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                >
                  View Repository
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>

            {/* Review Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleReviewSubmission({
                  score: parseInt(formData.get('score')),
                  feedback: formData.get('feedback'),
                  status: formData.get('status')
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Score (0-100)
                  </label>
                  <input
                    type="number"
                    name="score"
                    min="0"
                    max="100"
                    defaultValue={selectedSubmission.score || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={selectedSubmission.status}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="REVIEWED">Reviewed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Feedback
                </label>
                <textarea
                  name="feedback"
                  rows={4}
                  defaultValue={selectedSubmission.feedback || ''}
                  placeholder="Provide detailed feedback for the student..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={reviewSubmissionMutation.isLoading}
                >
                  Save Review
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewSubmissions;
