import React, { useState } from 'react';
import { Users, FileText, DollarSign, Award, Settings, Bell, Search, Filter, Download, Upload, Check, X, Clock, MessageSquare } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  // Sample Data
  const [users, setUsers] = useState([
    { id: 1, name: 'Rahul Kumar', email: 'rahul@example.com', status: 'active', progress: 75, tasksCompleted: 26, totalTasks: 35 },
    { id: 2, name: 'Priya Sharma', email: 'priya@example.com', status: 'active', progress: 90, tasksCompleted: 32, totalTasks: 35 },
    { id: 3, name: 'Amit Patel', email: 'amit@example.com', status: 'inactive', progress: 45, tasksCompleted: 16, totalTasks: 35 },
  ]);

  const [submissions, setSubmissions] = useState([
    { id: 1, userId: 1, userName: 'Rahul Kumar', taskId: 26, taskName: 'React Component Design', status: 'pending', submittedAt: '2 hours ago', githubUrl: 'https://github.com/user/repo' },
    { id: 2, userId: 2, userName: 'Priya Sharma', taskId: 32, taskName: 'API Integration', status: 'pending', submittedAt: '5 hours ago', githubUrl: 'https://github.com/user/repo2' },
  ]);

  const [payments, setPayments] = useState([
    { id: 1, userId: 1, userName: 'Rahul Kumar', amount: 499, type: 'certificate', status: 'pending', date: '2025-09-29', transactionId: 'TXN123456' },
    { id: 2, userId: 2, userName: 'Priya Sharma', amount: 1000, type: 'paid_task', status: 'verified', date: '2025-09-28', transactionId: 'TXN789012' },
  ]);

  const [certificates, setCertificates] = useState([
    { id: 1, userId: 1, userName: 'Rahul Kumar', uploadedAt: null, availableAt: null, status: 'payment_verified' },
  ]);

  const [tasks, setTasks] = useState([
    { id: 1, title: 'HTML Basics', day: 1, materials: 'PDF, Video', status: 'active' },
    { id: 2, title: 'CSS Fundamentals', day: 2, materials: 'PDF, Links', status: 'active' },
    { id: 3, title: 'JavaScript Intro', day: 3, materials: 'Video', status: 'active' },
  ]);

  // Modal Handlers
  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setModalType('');
  };

  // Action Handlers
  const handleRevokeUser = (userId) => {
    setUsers(users.map(u => u.id === userId ? {...u, status: 'inactive'} : u));
  };

  const handleVerifySubmission = (submissionId, status) => {
    setSubmissions(submissions.map(s => s.id === submissionId ? {...s, status} : s));
  };

  const handleVerifyPayment = (paymentId) => {
    setPayments(payments.map(p => p.id === paymentId ? {...p, status: 'verified'} : p));
    // Move to certificate section
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setCertificates([...certificates, {
        id: certificates.length + 1,
        userId: payment.userId,
        userName: payment.userName,
        uploadedAt: null,
        availableAt: null,
        status: 'payment_verified'
      }]);
    }
  };

  const handleUploadCertificate = (certId) => {
    const now = new Date();
    const available = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setCertificates(certificates.map(c => c.id === certId ? {
      ...c,
      uploadedAt: now.toISOString(),
      availableAt: available.toISOString(),
      status: 'uploaded'
    } : c));
  };

  // Stats Cards
  const stats = [
    { icon: Users, label: 'Total Users', value: users.length, color: 'blue' },
    { icon: FileText, label: 'Pending Submissions', value: submissions.filter(s => s.status === 'pending').length, color: 'orange' },
    { icon: DollarSign, label: 'Pending Payments', value: payments.filter(p => p.status === 'pending').length, color: 'green' },
    { icon: Award, label: 'Certificates Issued', value: certificates.filter(c => c.status === 'uploaded').length, color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                A
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {['users', 'tasks', 'submissions', 'payments', 'certificates'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Filter className="w-4 h-4" />
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                                {user.name[0]}
                              </div>
                              <div className="ml-3">
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-600">{user.tasksCompleted}/{user.totalTasks} tasks</span>
                                <span className="text-sm font-medium text-gray-900">{user.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${user.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openModal('edit', user)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRevokeUser(user.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                disabled={user.status === 'inactive'}
                              >
                                Revoke
                              </button>
                              <button
                                onClick={() => openModal('chat', user)}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm flex items-center space-x-1"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Chat</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Task Management</h2>
                  <button
                    onClick={() => openModal('createTask')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create New Task
                  </button>
                </div>

                <div className="space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">Day {task.day}: {task.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">Materials: {task.materials}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {task.status}
                          </span>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <Upload className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Task Submissions</h2>
                <div className="space-y-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                              {sub.userName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{sub.userName}</p>
                              <p className="text-sm text-gray-500">Task {sub.taskId}: {sub.taskName}</p>
                            </div>
                          </div>
                          <div className="ml-13 mt-2">
                            <a
                              href={sub.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {sub.githubUrl}
                            </a>
                            <p className="text-xs text-gray-500 mt-1">{sub.submittedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleVerifySubmission(sub.id, 'approved')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleVerifySubmission(sub.id, 'rejected')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>12-hour unlock timer will start after approval</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Payment Verification</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{payment.userName}</p>
                            <p className="text-sm text-gray-500">{payment.date}</p>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">₹{payment.amount}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {payment.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{payment.transactionId}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'verified' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {payment.status === 'pending' && (
                              <button
                                onClick={() => handleVerifyPayment(payment.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Certificate Management</h2>
                <div className="space-y-4">
                  {certificates.map(cert => (
                    <div key={cert.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{cert.userName}</h3>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              Status: <span className="font-medium">{cert.status}</span>
                            </p>
                            {cert.uploadedAt && (
                              <>
                                <p className="text-sm text-gray-600">
                                  Uploaded: {new Date(cert.uploadedAt).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Available to user: {new Date(cert.availableAt).toLocaleString()}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!cert.uploadedAt ? (
                            <button
                              onClick={() => handleUploadCertificate(cert.id)}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                            >
                              <Upload className="w-5 h-5" />
                              <span>Upload Certificate</span>
                            </button>
                          ) : (
                            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
                              <Download className="w-5 h-5" />
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {modalType === 'edit' && 'Edit User'}
                {modalType === 'chat' && 'Open Chat'}
                {modalType === 'createTask' && 'Create New Task'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalType === 'chat' && (
              <div className="space-y-4">
                <p className="text-gray-600">To open chat, user must upload their internship certificate first.</p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Upload internship certificate</p>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Verify & Open Chat
                </button>
              </div>
            )}

            {modalType === 'edit' && selectedUser && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    defaultValue={selectedUser.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue={selectedUser.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Save Changes
                </button>
              </div>
            )}

            {modalType === 'createTask' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    placeholder="Enter task title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day Number</label>
                  <input
                    type="number"
                    placeholder="1-35"
                    min="1"
                    max="35"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Materials</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Upload PDF, Videos, or add links</p>
                  </div>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;