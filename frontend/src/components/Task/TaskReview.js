import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import Button from '../UI/Button';
import Textarea from '../Form/Textarea';
import Select from '../Form/Select';
import Input from '../Form/Input';
import Modal from '../UI/Modal';
import Badge from '../UI/Badge';

const TaskReview = ({ isOpen, onClose, submission, onReview, loading }) => {
  const [reviewData, setReviewData] = useState({
    status: '',
    feedback: '',
    grade: ''
  });

  const statusOptions = [
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'NEEDS_REVISION', label: 'Needs Revision' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onReview(submission.id, reviewData);
  };

  const resetForm = () => {
    setReviewData({
      status: '',
      feedback: '',
      grade: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'NEEDS_REVISION':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Under Review</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      case 'NEEDS_REVISION':
        return <Badge variant="warning">Needs Revision</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Review Task Submission"
      size="lg"
    >
      <div className="space-y-6">
        {/* Submission Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              {submission?.task?.title}
            </h4>
            {getStatusBadge(submission?.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Student:</span>
              <p className="font-medium">
                {submission?.enrollment?.student?.firstName} {submission?.enrollment?.student?.lastName}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>
              <p className="font-medium">
                {submission?.submittedAt && new Date(submission.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Course:</span>
              <p className="font-medium">
                {submission?.enrollment?.internship?.title}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Task Order:</span>
              <p className="font-medium">
                Task {submission?.task?.taskOrder}
              </p>
            </div>
          </div>
        </div>

        {/* Student Submission */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Student Submission</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">
              {submission?.submissionText || 'No text submission provided.'}
            </p>
            
            {submission?.fileUrls && submission.fileUrls.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Attached Files</h5>
                <div className="space-y-2">
                  {submission.fileUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline"
                    >
                      📎 File {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Previous Review (if exists) */}
        {submission?.feedback && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Previous Review</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(submission.status)}
                <span className="font-medium">
                  {submission.status?.replace('_', ' ')}
                </span>
                {submission.grade && (
                  <span className="text-sm text-gray-600">
                    Grade: {submission.grade}/10
                  </span>
                )}
              </div>
              <p className="text-gray-700">{submission.feedback}</p>
            </div>
          </div>
        )}

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Review Status"
              value={reviewData.status}
              onChange={(e) => setReviewData(prev => ({
                ...prev,
                status: e.target.value
              }))}
              options={statusOptions}
              required
            />

            <Input
              label="Grade (Optional)"
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="0-10"
              value={reviewData.grade}
              onChange={(e) => setReviewData(prev => ({
                ...prev,
                grade: e.target.value
              }))}
            />
          </div>

          <Textarea
            label="Feedback"
            placeholder="Provide detailed feedback to help the student improve..."
            value={reviewData.feedback}
            onChange={(e) => setReviewData(prev => ({
              ...prev,
              feedback: e.target.value
            }))}
            rows={4}
            required
          />

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              disabled={!reviewData.status || !reviewData.feedback.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default TaskReview;