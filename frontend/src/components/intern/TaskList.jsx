import React, { useState, useEffect } from 'react';
import { Upload, Github, FileText, Clock, CheckCircle, XCircle, AlertCircle, Lock, Unlock } from 'lucide-react';

const TaskSubmissionUI = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionType, setSubmissionType] = useState('github');
  const [formData, setFormData] = useState({
    githubUrl: '',
    googleFormUrl: '',
    file: null,
    additionalNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Mock data - Replace with actual API call
  useEffect(() => {
    const mockTasks = [
      {
        id: '1',
        taskNumber: 1,
        title: 'Setup Development Environment',
        description: 'Install Node.js, VS Code, and Git. Create your first repository.',
        points: 100,
        waitTimeHours: 12,
        maxAttempts: 3,
        isUnlocked: true,
        canSubmit: true,
        submission: null,
        files: [
          { name: 'Setup Guide.pdf', url: '/files/setup-guide.pdf' }
        ]
      },
      {
        id: '2',
        taskNumber: 2,
        title: 'HTML & CSS Fundamentals',
        description: 'Create a responsive portfolio website using HTML5 and CSS3.',
        points: 100,
        waitTimeHours: 12,
        maxAttempts: 3,
        isUnlocked: false,
        canSubmit: false,
        waitMessage: 'Complete Task 1 first',
        submission: null
      },
      {
        id: '3',
        taskNumber: 3,
        title: 'JavaScript Basics',
        description: 'Learn JavaScript fundamentals and DOM manipulation.',
        points: 100,
        waitTimeHours: 12,
        maxAttempts: 3,
        isUnlocked: false,
        canSubmit: false,
        waitMessage: 'Locked',
        submission: null
      }
    ];
    setTasks(mockTasks);
  }, []);

  const handleSubmit = async (taskId) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      alert(`Task submitted successfully! Type: ${submissionType}`);
      setLoading(false);
      setSelectedTask(null);
      setFormData({
        githubUrl: '',
        googleFormUrl: '',
        file: null,
        additionalNotes: ''
      });
    }, 1500);
  };

  const getStatusBadge = (submission) => {
    if (!submission) return null;
    
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Under Review' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejected' },
      RESUBMITTED: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, text: 'Resubmitted' }
    };
    
    const badge = badges[submission.status];
    const Icon = badge.icon;
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon size={16} />
        {badge.text}
      </div>
    );
  };

  const TaskCard = ({ task }) => (
    <div className={`border rounded-lg p-6 ${task.isUnlocked ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
            task.submission?.status === 'APPROVED' ? 'bg-green-500 text-white' :
            task.isUnlocked ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {task.taskNumber}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
            <p className="text-sm text-gray-500">Points: {task.points}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {task.isUnlocked ? (
            <Unlock className="text-green-500" size={20} />
          ) : (
            <Lock className="text-gray-400" size={20} />
          )}
          {task.submission && getStatusBadge(task.submission)}
        </div>
      </div>

      <p className="text-gray-700 mb-4">{task.description}</p>

      {task.files && task.files.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Task Materials:</p>
          <div className="flex flex-wrap gap-2">
            {task.files.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100"
              >
                <FileText size={16} />
                {file.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {!task.isUnlocked && (
        <div className="bg-gray-100 border border-gray-300 rounded-md p-4 flex items-center gap-2">
          <Lock className="text-gray-500" size={20} />
          <span className="text-gray-700 font-medium">{task.waitMessage}</span>
        </div>
      )}

      {task.isUnlocked && !task.canSubmit && task.unlockTime && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 flex items-center gap-2">
          <Clock className="text-yellow-600" size={20} />
          <span className="text-yellow-800">Task unlocks at {new Date(task.unlockTime).toLocaleString()}</span>
        </div>
      )}

      {task.submission && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Your Submission</h4>
          <div className="space-y-2 text-sm">
            {task.submission.githubRepoUrl && (
              <p><span className="font-medium">GitHub:</span> <a href={task.submission.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{task.submission.githubRepoUrl}</a></p>
            )}
            {task.submission.googleFormUrl && (
              <p><span className="font-medium">Form:</span> <a href={task.submission.googleFormUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{task.submission.googleFormUrl}</a></p>
            )}
            {task.submission.fileName && (
              <p><span className="font-medium">File:</span> {task.submission.fileName}</p>
            )}
            <p><span className="font-medium">Submitted:</span> {new Date(task.submission.submissionDate).toLocaleString()}</p>
            {task.submission.score && (
              <p><span className="font-medium">Score:</span> {task.submission.score}/{task.points}</p>
            )}
            {task.submission.adminFeedback && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="font-medium text-blue-900">Admin Feedback:</p>
                <p className="text-blue-800">{task.submission.adminFeedback}</p>
              </div>
            )}
          </div>
          
          {task.hasResubmissionOpportunity && task.submission.status === 'REJECTED' && (
            <button
              onClick={() => setSelectedTask(task)}
              className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm font-medium"
            >
              Resubmit Task (Attempt {task.submission.attemptNumber + 1}/{task.maxAttempts})
            </button>
          )}
        </div>
      )}

      {task.canSubmit && !task.submission && (
        <button
          onClick={() => setSelectedTask(task)}
          className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
        >
          Submit Task
        </button>
      )}
    </div>
  );

  const SubmissionModal = () => {
    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Submit Task {selectedTask.taskNumber}: {selectedTask.title}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Submission Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Submission Type *
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setSubmissionType('github')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    submissionType === 'github' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Github size={32} className={submissionType === 'github' ? 'text-blue-600' : 'text-gray-600'} />
                  <span className="font-medium">GitHub Repo</span>
                </button>

                <button
                  onClick={() => setSubmissionType('form')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    submissionType === 'form' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FileText size={32} className={submissionType === 'form' ? 'text-blue-600' : 'text-gray-600'} />
                  <span className="font-medium">Google Form</span>
                </button>

                <button
                  onClick={() => setSubmissionType('file')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    submissionType === 'file' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload size={32} className={submissionType === 'file' ? 'text-blue-600' : 'text-gray-600'} />
                  <span className="font-medium">File Upload</span>
                </button>
              </div>
            </div>

            {/* GitHub URL Input */}
            {submissionType === 'github' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({...formData, githubUrl: e.target.value})}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the complete URL of your GitHub repository
                </p>
              </div>
            )}

            {/* Google Form URL Input */}
            {submissionType === 'form' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Form Response URL *
                </label>
                <input
                  type="url"
                  value={formData.googleFormUrl}
                  onChange={(e) => setFormData({...formData, googleFormUrl: e.target.value})}
                  placeholder="https://docs.google.com/forms/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Submit your Google Form response and paste the URL here
                </p>
              </div>
            )}

            {/* File Upload */}
            {submissionType === 'file' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                  <input
                    type="file"
                    onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.zip,.rar,.jpg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 font-medium hover:text-blue-700">
                      Click to upload
                    </span>
                    <span className="text-gray-600"> or drag and drop</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF, DOC, ZIP, or Images (Max 50MB)
                  </p>
                  {formData.file && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800 font-medium">
                        Selected: {formData.file.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                rows={4}
                placeholder="Add any additional information about your submission..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submission Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Submission Guidelines:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Ensure all required information is accurate</li>
                <li>You have {selectedTask.maxAttempts} attempts for this task</li>
                <li>Admin will review within 12-24 hours</li>
                <li>Next task unlocks {selectedTask.waitTimeHours} hours after approval</li>
              </ul>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => {
                setSelectedTask(null);
                setFormData({
                  githubUrl: '',
                  googleFormUrl: '',
                  file: null,
                  additionalNotes: ''
                });
              }}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-100"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(selectedTask.id)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Task'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">🎉 Internship Completed!</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Congratulations!
              </h3>
              <p className="text-gray-600">
                You've successfully completed all tasks with a score of <span className="font-bold text-green-600">85%</span>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Certificate Payment</h4>
              <p className="text-sm text-blue-800 mb-3">
                To receive your completion certificate, please make the payment of ₹499
              </p>
              <div className="bg-white rounded-md p-4 border border-blue-300">
                <div className="w-48 h-48 bg-gray-200 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-gray-500">QR Code</span>
                </div>
                <p className="text-center text-sm text-gray-600">
                  Scan to pay with UPI
                </p>
              </div>
            </div>

            <button
              onClick={() => alert('Redirecting to payment page...')}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
            >
              Proceed to Payment
            </button>
          </div>

          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full text-gray-600 hover:text-gray-800 text-sm"
            >
              I'll pay later
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Full Stack Web Development Internship
          </h1>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>Duration: 35 Days</span>
            <span>•</span>
            <span>Total Tasks: {tasks.length}</span>
            <span>•</span>
            <span>Pass Percentage: 75%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">Overall Progress</h3>
            <span className="text-sm text-gray-600">
              {tasks.filter(t => t.submission?.status === 'APPROVED').length} / {tasks.length} Tasks Completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ 
                width: `${(tasks.filter(t => t.submission?.status === 'APPROVED').length / tasks.length) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>

        {/* Completion Payment Button (Show when all tasks done) */}
        <div className="mt-6">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 shadow-lg"
          >
            🎓 Complete Payment for Certificate - ₹499
          </button>
        </div>
      </div>

      {/* Modals */}
      <SubmissionModal />
      <PaymentModal />
    </div>
  );
};

export default TaskSubmissionUI;