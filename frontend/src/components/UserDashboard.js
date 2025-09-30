import React, { useState } from 'react';
import { CheckCircle, Lock, Clock, Upload, Download, QrCode, Award, AlertCircle, Github } from 'lucide-react';

const UserDashboard = () => {
  const [activeSection, setActiveSection] = useState('tasks');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // User data
  const user = {
    name: 'Rahul Kumar',
    email: 'rahul@example.com',
    progress: 75,
    tasksCompleted: 26,
    totalTasks: 35,
    score: 82,
    certificateEligible: true,
    certificatePurchased: false,
    certificateAvailable: false
  };

  // Sample tasks data
  const [tasks, setTasks] = useState([
    { id: 1, day: 1, title: 'HTML Basics', status: 'completed', score: 100, submittedAt: '2025-09-01', githubUrl: 'https://github.com/user/task1' },
    { id: 2, day: 2, title: 'CSS Fundamentals', status: 'completed', score: 95, submittedAt: '2025-09-02', githubUrl: 'https://github.com/user/task2' },
    { id: 3, day: 3, title: 'JavaScript Intro', status: 'completed', score: 90, submittedAt: '2025-09-03', githubUrl: 'https://github.com/user/task3' },
    { id: 26, day: 26, title: 'React Component Design', status: 'pending_review', submittedAt: '2025-09-26', githubUrl: 'https://github.com/user/task26' },
    { id: 27, day: 27, title: 'State Management', status: 'unlocked', unlockTime: '12 hours', submittedAt: null },
    { id: 28, day: 28, title: 'API Integration', status: 'locked', submittedAt: null },
  ]);

  const [paidTasks] = useState([
    { id: 1, title: 'Build E-commerce Website', price: 1000, status: 'locked', description: 'Complete project with payment gateway' },
    { id: 2, title: 'Advanced React Patterns', price: 1000, status: 'locked', description: 'Advanced hooks and optimization' },
  ]);

  const [notifications] = useState([
    { id: 1, message: 'Task 26 is under review', type: 'info', time: '2 hours ago' },
    { id: 2, message: 'Task 27 will unlock in 10 hours', type: 'warning', time: '5 hours ago' },
    { id: 3, message: 'You are eligible for certificate!', type: 'success', time: '1 day ago' },
  ]);

  const handleSubmitTask = (taskId, githubUrl) => {
    setTasks(tasks.map(t => 
      t.id === taskId 
        ? { ...t, status: 'pending_review', githubUrl, submittedAt: new Date().toISOString() }
        : t
    ));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'unlocked': return 'bg-blue-100 text-blue-800';
      case 'locked': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending_review': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'unlocked': return <Upload className="w-5 h-5 text-blue-600" />;
      case 'locked': return <Lock className="w-5 h-5 text-gray-400" />;
      default: return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
              <p className="text-blue-100 mt-1">Keep up the great work on your learning journey</p>
            </div>
            <div className="text-right">
              <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Overall Score</p>
                <p className="text-3xl font-bold">{user.score}%</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress: {user.tasksCompleted}/{user.totalTasks} Tasks</span>
              <span className="text-sm font-medium">{user.progress}%</span>
            </div>
            <div className="w-full bg-blue-400 bg-opacity-30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${user.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-blue-100 text-sm">Tasks Completed</p>
              <p className="text-2xl font-bold mt-1">{user.tasksCompleted}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-blue-100 text-sm">Average Score</p>
              <p className="text-2xl font-bold mt-1">{user.score}%</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-blue-100 text-sm">Certificate Status</p>
              <p className="text-2xl font-bold mt-1">{user.certificateEligible ? 'Eligible' : 'In Progress'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b">
                <nav className="flex space-x-8 px-6">
                  {['tasks', 'paid-tasks', 'certificate'].map(section => (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                        activeSection === section
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {section.replace('-', ' ')}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Tasks Section */}
                {activeSection === 'tasks' && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Daily Tasks</h2>
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className={`border rounded-lg p-4 ${
                          task.status === 'locked' ? 'bg-gray-50 opacity-60' : 'bg-white hover:shadow-md'
                        } transition`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">{getStatusIcon(task.status)}</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h3 className="font-semibold text-gray-900">Day {task.day}: {task.title}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              {task.status === 'completed' && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600">Score: <span className="font-semibold text-green-600">{task.score}%</span></p>
                                  <p className="text-sm text-gray-600">Submitted: {new Date(task.submittedAt).toLocaleDateString()}</p>
                                  {task.githubUrl && (
                                    <a href={task.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center space-x-1">
                                      <Github className="w-4 h-4" />
                                      <span>View Submission</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {task.status === 'pending_review' && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600">Submitted for review. Next task will unlock in 12 hours after approval.</p>
                                  {task.githubUrl && (
                                    <a href={task.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center space-x-1 mt-1">
                                      <Github className="w-4 h-4" />
                                      <span>View Submission</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {task.status === 'unlocked' && (
                                <div className="mt-3">
                                  {task.unlockTime && (
                                    <div className="flex items-center space-x-2 mb-3 text-sm text-orange-600">
                                      <Clock className="w-4 h-4" />
                                      <span>Available in {task.unlockTime}</span>
                                    </div>
                                  )}
                                  <SubmitTaskForm taskId={task.id} onSubmit={handleSubmitTask} />
                                </div>
                              )}

                              {task.status === 'locked' && (
                                <p className="text-sm text-gray-500 mt-2">Complete previous tasks to unlock</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Paid Tasks Section */}
                {activeSection === 'paid-tasks' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">Premium Tasks</h2>
                      <p className="text-gray-600 mt-1">Complete your certificate purchase to unlock these premium tasks</p>
                    </div>

                    {!user.certificatePurchased && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-900">Certificate Required</p>
                            <p className="text-sm text-yellow-700 mt-1">You need to purchase and receive your certificate to access paid tasks.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {paidTasks.map(task => (
                        <div key={task.id} className="border rounded-lg p-6 bg-white hover:shadow-md transition">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                              <p className="text-gray-600 mt-1">{task.description}</p>
                              <div className="flex items-center space-x-4 mt-3">
                                <span className="text-2xl font-bold text-blue-600">₹{task.price}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                            </div>
                            <button
                              disabled={!user.certificatePurchased}
                              className={`px-6 py-2 rounded-lg font-medium ${
                                user.certificatePurchased
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {user.certificatePurchased ? 'Purchase' : 'Locked'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certificate Section */}
                {activeSection === 'certificate' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Certificate Status</h2>
                    
                    {user.certificateEligible ? (
                      <div className="space-y-6">
                        {/* Eligibility Card */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Congratulations!</h3>
                              <p className="text-gray-600">You're eligible to purchase your completion certificate</p>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-sm text-gray-600">Score</p>
                              <p className="text-xl font-bold text-gray-900">{user.score}%</p>
                            </div>
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-sm text-gray-600">Tasks</p>
                              <p className="text-xl font-bold text-gray-900">{user.tasksCompleted}/{user.totalTasks}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-sm text-gray-600">Required</p>
                              <p className="text-xl font-bold text-gray-900">75%</p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Section */}
                        {!user.certificatePurchased ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">Purchase Certificate</h3>
                                <p className="text-gray-600 mt-1">Complete your payment to receive your certificate</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Certificate Fee</p>
                                <p className="text-3xl font-bold text-blue-600">₹499</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-2"
                            >
                              <QrCode className="w-5 h-5" />
                              <span>Proceed to Payment</span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            {user.certificateAvailable ? (
                              <div className="text-center">
                                <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Certificate is Ready!</h3>
                                <p className="text-gray-600 mb-6">Download your completion certificate below</p>
                                <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium flex items-center justify-center space-x-2 mx-auto">
                                  <Download className="w-5 h-5" />
                                  <span>Download Certificate</span>
                                </button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Certificate Processing</h3>
                                <p className="text-gray-600 mb-4">Your payment has been verified. Your certificate will be available within 24 hours.</p>
                                <div className="bg-blue-50 rounded-lg p-4">
                                  <p className="text-sm text-blue-900 font-medium">Estimated availability: Tomorrow, 3:00 PM</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Not Eligible Yet</h3>
                        <p className="text-gray-600 mb-4">You need to score at least 75% to be eligible for the certificate</p>
                        <div className="bg-white rounded-lg p-4 inline-block">
                          <p className="text-sm text-gray-600">Your current score</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{user.score}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Notifications & Info */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Notifications</h3>
              <div className="space-y-3">
                {notifications.map(notif => (
                  <div key={notif.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notif.type === 'success' ? 'bg-green-500' :
                      notif.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Important Info</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 mt-0.5 text-blue-600" />
                  <p>Submit tasks within 24 hours</p>
                </div>
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-orange-600" />
                  <p>12-hour wait between tasks after approval</p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                  <p>75% score required for certificate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Complete Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <QrCode className="w-32 h-32 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600 mt-4">Scan QR code to pay</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Amount to pay</p>
                <p className="text-3xl font-bold text-blue-600">₹499</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter Transaction ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Submit Payment Details
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                After payment verification, your certificate will be available within 24 hours
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Submit Task Form Component
const SubmitTaskForm = ({ taskId, onSubmit }) => {
  const [githubUrl, setGithubUrl] = useState('');

  const handleSubmit = () => {
    if (githubUrl) {
      onSubmit(taskId, githubUrl);
      setGithubUrl('');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GitHub Repository URL
        </label>
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-2"
      >
        <Upload className="w-4 h-4" />
        <span>Submit Task</span>
      </button>
      <p className="text-xs text-gray-500">
        ⏰ You have 24 hours to submit this task
      </p>
    </div>
  );
};

export default UserDashboard;