import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Plus, Eye, Edit, Ban, MessageSquare, 
  Award, BookOpen, DollarSign, CheckCircle, Clock, X, Upload,
  FileText, Calendar, TrendingUp, Activity, Mail, Phone, MapPin,
  Download, Send, Paperclip, Image, File
} from 'lucide-react';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCertificateVerification, setShowCertificateVerification] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [bulkUserIds, setBulkUserIds] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadedCertificate, setUploadedCertificate] = useState(null);
  const [privateTaskData, setPrivateTaskData] = useState({
    title: '',
    description: '',
    deadline: '',
    files: []
  });
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });

  // Sample user data - Replace with actual API calls
  useEffect(() => {
    const sampleUsers = [
      {
        id: 'INT2025001',
        name: 'Rahul Kumar',
        email: 'rahul@example.com',
        phone: '+91 9876543210',
        location: 'Mumbai, Maharashtra',
        status: 'active',
        isActive: true,
        joinedDate: '2025-01-15',
        lastActive: '2 hours ago',
        chatEnabled: false,
        certificateSubmitted: false,
        enrollments: [
          {
            id: 'enr1',
            courseName: 'Full Stack Web Development',
            status: 'in_progress',
            progress: 75,
            startDate: '2025-01-15',
            tasksCompleted: 26,
            totalTasks: 35,
            currentDay: 26
          }
        ],
        completedCourses: [
          {
            id: 'course1',
            name: 'HTML & CSS Basics',
            completedDate: '2024-12-20',
            score: 92,
            certificateIssued: true
          }
        ],
        certificates: [
          {
            id: 'cert1',
            courseName: 'HTML & CSS Basics',
            issueDate: '2024-12-21',
            certificateNumber: 'CERT-2024-001',
            downloadUrl: '/certificates/cert1.pdf'
          }
        ],
        payments: [
          {
            id: 'pay1',
            amount: 499,
            type: 'Certificate',
            status: 'completed',
            date: '2024-12-21',
            transactionId: 'TXN123456'
          }
        ],
        submissions: [
          {
            id: 'sub1',
            taskNumber: 26,
            taskName: 'React Components',
            status: 'pending',
            submittedDate: '2025-09-29',
            githubUrl: 'https://github.com/rahul/task26'
          }
        ],
        stats: {
          totalEnrollments: 2,
          coursesCompleted: 1,
          certificatesEarned: 1,
          totalSpent: 499,
          averageScore: 92,
          currentStreak: 12
        }
      },
      {
        id: 'INT2025002',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '+91 9876543211',
        location: 'Delhi, India',
        status: 'active',
        isActive: true,
        joinedDate: '2025-01-10',
        lastActive: '1 day ago',
        chatEnabled: true,
        certificateSubmitted: true,
        enrollments: [
          {
            id: 'enr2',
            courseName: 'Full Stack Web Development',
            status: 'completed',
            progress: 100,
            startDate: '2025-01-10',
            completedDate: '2025-09-25',
            tasksCompleted: 35,
            totalTasks: 35,
            currentDay: 35
          }
        ],
        completedCourses: [
          {
            id: 'course2',
            name: 'Full Stack Web Development',
            completedDate: '2025-09-25',
            score: 95,
            certificateIssued: true
          }
        ],
        certificates: [
          {
            id: 'cert2',
            courseName: 'Full Stack Web Development',
            issueDate: '2025-09-26',
            certificateNumber: 'CERT-2025-002',
            downloadUrl: '/certificates/cert2.pdf'
          }
        ],
        payments: [
          {
            id: 'pay2',
            amount: 499,
            type: 'Certificate',
            status: 'completed',
            date: '2025-09-25',
            transactionId: 'TXN789012'
          }
        ],
        submissions: [],
        stats: {
          totalEnrollments: 1,
          coursesCompleted: 1,
          certificatesEarned: 1,
          totalSpent: 499,
          averageScore: 95,
          currentStreak: 35
        }
      },
      {
        id: 'INT2025003',
        name: 'Amit Patel',
        email: 'amit@example.com',
        phone: '+91 9876543212',
        location: 'Bangalore, Karnataka',
        status: 'revoked',
        isActive: false,
        joinedDate: '2025-01-20',
        lastActive: '2 weeks ago',
        chatEnabled: false,
        certificateSubmitted: false,
        enrollments: [
          {
            id: 'enr3',
            courseName: 'Full Stack Web Development',
            status: 'paused',
            progress: 45,
            startDate: '2025-01-20',
            tasksCompleted: 16,
            totalTasks: 35,
            currentDay: 16
          }
        ],
        completedCourses: [],
        certificates: [],
        payments: [],
        submissions: [],
        stats: {
          totalEnrollments: 1,
          coursesCompleted: 0,
          certificatesEarned: 0,
          totalSpent: 0,
          averageScore: 0,
          currentStreak: 0
        }
      }
    ];
    setUsers(sampleUsers);
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Handle bulk add users
  const handleBulkAddUsers = () => {
    const userIds = bulkUserIds.split('\n').filter(id => id.trim());
    // API call to add users
    alert(`Adding ${userIds.length} users...`);
    setBulkUserIds('');
    setShowAddUsers(false);
  };

  // Handle edit user
  const handleEditUser = (updatedData) => {
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updatedData } : u));
    setShowEditModal(false);
    alert('User updated successfully!');
  };

  // Handle revoke user
  const handleRevokeUser = (userId) => {
    if (confirm('Are you sure you want to revoke access for this user?')) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'revoked', isActive: false } : u));
      alert('User access revoked successfully!');
    }
  };

  // Handle restore user
  const handleRestoreUser = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'active', isActive: true } : u));
    alert('User access restored successfully!');
  };

  // Handle certificate verification
  const handleVerifyCertificate = (approved) => {
    if (approved) {
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, chatEnabled: true, certificateSubmitted: true }
          : u
      ));
      alert('Certificate verified! Chat access enabled.');
      setShowCertificateVerification(false);
      setShowChatModal(true);
    } else {
      alert('Certificate rejected. Please ask user to resubmit.');
      setShowCertificateVerification(false);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages([...chatMessages, {
        id: Date.now(),
        sender: 'admin',
        message: newMessage,
        timestamp: new Date(),
        type: 'text'
      }]);
      setNewMessage('');
    }
  };

  // Handle assign private task
  const handleAssignPrivateTask = () => {
    // API call to assign private task
    setChatMessages([...chatMessages, {
      id: Date.now(),
      sender: 'admin',
      message: `Private Task Assigned: ${privateTaskData.title}`,
      timestamp: new Date(),
      type: 'task',
      taskData: privateTaskData
    }]);
    setPrivateTaskData({ title: '', description: '', deadline: '', files: [] });
    alert('Private task assigned successfully!');
  };

  // User Details Modal
  const UserDetailsModal = () => {
    if (!selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                <p className="text-blue-100">{selectedUser.id}</p>
                <p className="text-blue-100 flex items-center gap-2 mt-1">
                  <Mail size={16} /> {selectedUser.email}
                </p>
                <p className="text-blue-100 flex items-center gap-2">
                  <Phone size={16} /> {selectedUser.phone}
                </p>
                <p className="text-blue-100 flex items-center gap-2">
                  <MapPin size={16} /> {selectedUser.location}
                </p>
              </div>
            </div>
            <button onClick={() => setShowUserDetails(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded">
              <X size={24} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-b bg-gray-50 flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit size={18} />
              Edit Profile
            </button>
            {selectedUser.isActive ? (
              <button
                onClick={() => handleRevokeUser(selectedUser.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Ban size={18} />
                Revoke Access
              </button>
            ) : (
              <button
                onClick={() => handleRestoreUser(selectedUser.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle size={18} />
                Restore Access
              </button>
            )}
            <button
              onClick={() => {
                if (!selectedUser.certificateSubmitted) {
                  setShowCertificateVerification(true);
                } else if (selectedUser.chatEnabled) {
                  setShowChatModal(true);
                } else {
                  alert('Please verify certificate first to enable chat');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <MessageSquare size={18} />
              {selectedUser.chatEnabled ? 'Open Chat' : 'Enable Chat'}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">{selectedUser.stats.totalEnrollments}</p>
              <p className="text-sm text-blue-600">Enrollments</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{selectedUser.stats.coursesCompleted}</p>
              <p className="text-sm text-green-600">Completed</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-900">{selectedUser.stats.certificatesEarned}</p>
              <p className="text-sm text-purple-600">Certificates</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <DollarSign className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-900">₹{selectedUser.stats.totalSpent}</p>
              <p className="text-sm text-yellow-600">Total Spent</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-900">{selectedUser.stats.averageScore}%</p>
              <p className="text-sm text-orange-600">Avg Score</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <Activity className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-900">{selectedUser.stats.currentStreak}</p>
              <p className="text-sm text-red-600">Day Streak</p>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="p-6 space-y-6">
            {/* Current Enrollments */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="text-blue-600" />
                Current Enrollments
              </h3>
              {selectedUser.enrollments.map(enrollment => (
                <div key={enrollment.id} className="border rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{enrollment.courseName}</h4>
                      <p className="text-sm text-gray-600">Started: {enrollment.startDate}</p>
                      <p className="text-sm text-gray-600">Day {enrollment.currentDay} of {enrollment.totalTasks}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      enrollment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {enrollment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{enrollment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${enrollment.progress}%` }}></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Tasks: {enrollment.tasksCompleted}/{enrollment.totalTasks} completed
                  </p>
                </div>
              ))}
            </div>

            {/* Completed Courses */}
            {selectedUser.completedCourses.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-600" />
                  Completed Courses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.completedCourses.map(course => (
                    <div key={course.id} className="border rounded-lg p-4 bg-green-50">
                      <h4 className="font-semibold text-gray-900">{course.name}</h4>
                      <p className="text-sm text-gray-600">Completed: {course.completedDate}</p>
                      <p className="text-sm text-gray-900 font-medium">Score: {course.score}%</p>
                      {course.certificateIssued && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-2">
                          <Award size={14} />
                          Certificate Issued
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {selectedUser.certificates.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="text-purple-600" />
                  Certificates Earned
                </h3>
                <div className="space-y-3">
                  {selectedUser.certificates.map(cert => (
                    <div key={cert.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">{cert.courseName}</h4>
                        <p className="text-sm text-gray-600">Issued: {cert.issueDate}</p>
                        <p className="text-sm text-gray-600">Certificate #: {cert.certificateNumber}</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Download size={18} />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment History */}
            {selectedUser.payments.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="text-yellow-600" />
                  Payment History
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Transaction ID</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedUser.payments.map(payment => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{payment.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{payment.type}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{payment.amount}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{payment.transactionId}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Submissions */}
            {selectedUser.submissions.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Recent Submissions
                </h3>
                <div className="space-y-3">
                  {selectedUser.submissions.map(submission => (
                    <div key={submission.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">Task {submission.taskNumber}: {submission.taskName}</h4>
                          <p className="text-sm text-gray-600">Submitted: {submission.submittedDate}</p>
                          <a href={submission.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            {submission.githubUrl}
                          </a>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          {submission.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Edit User Modal
  const EditUserModal = () => {
    if (!showEditModal || !selectedUser) return null;

    const [editData, setEditData] = useState({
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone,
      location: selectedUser.location
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Edit User Profile</h3>
            <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({...editData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({...editData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={editData.location}
                onChange={(e) => setEditData({...editData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleEditUser(editData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Certificate Verification Modal
  const CertificateVerificationModal = () => {
    if (!showCertificateVerification || !selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Verify Internship Certificate</h3>
            <button onClick={() => setShowCertificateVerification(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 font-medium">User: {selectedUser.name}</p>
              <p className="text-blue-800 text-sm">ID: {selectedUser.id}</p>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {uploadedCertificate ? (
                <div>
                  <FileText className="w-16 h-16 text-green-600 mx-auto mb-3" />
                  <p className="text-gray-900 font-medium">{uploadedCertificate.name}</p>
                  <button
                    onClick={() => setUploadedCertificate(null)}
                    className="text-red-600 hover:text-red-700 text-sm mt-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">User needs to submit their internship certificate</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadedCertificate(e.target.files[0])}
                    className="hidden"
                    id="cert-upload"
                  />
                  <label
                    htmlFor="cert-upload"
                    className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
                  >
                    Upload Certificate (Simulated)
                  </label>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Verification Guidelines:</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Check if certificate is from a recognized institution</li>
                <li>Verify the completion dates match internship duration</li>
                <li>Ensure all details are clearly visible</li>
                <li>Once verified, chat access will be enabled for private task assignment</li>
              </ul>
            </div>
          </div>
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={() => handleVerifyCertificate(false)}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Reject
            </button>
            <button
              onClick={() => handleVerifyCertificate(true)}
              disabled={!uploadedCertificate}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify & Enable Chat
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Chat Modal with Private Task Assignment
  const ChatModal = () => {
    if (!showChatModal || !selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold">{selectedUser.name}</h3>
                <p className="text-sm text-blue-100">Online</p>
              </div>
            </div>
            <button onClick={() => setShowChatModal(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded">
              <X size={24} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                <p>Start conversation with {selectedUser.name}</p>
                <p className="text-sm">You can assign private tasks directly from here</p>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender === 'admin' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    {msg.type === 'task' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={18} />
                          <span className="font-semibold">Private Task Assigned</span>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{msg.taskData.title}</p>
                          <p className="opacity-90 mt-1">{msg.taskData.description}</p>
                          {msg.taskData.deadline && (
                            <p className="opacity-90 mt-1 flex items-center gap-1">
                              <Clock size={14} />
                              Deadline: {msg.taskData.deadline}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p>{msg.message}</p>
                    )}
                    <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Private Task Assignment Panel */}
          <div className="border-t bg-gray-50 p-4">
            <div className="bg-white rounded-lg border-2 border-purple-200 p-4 mb-3">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="text-purple-600" />
                Assign Private Task
              </h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Task Title"
                  value={privateTaskData.title}
                  onChange={(e) => setPrivateTaskData({...privateTaskData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <textarea
                  placeholder="Task Description & Requirements"
                  value={privateTaskData.description}
                  onChange={(e) => setPrivateTaskData({...privateTaskData, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={privateTaskData.deadline}
                    onChange={(e) => setPrivateTaskData({...privateTaskData, deadline: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  <button
                    onClick={handleAssignPrivateTask}
                    disabled={!privateTaskData.title || !privateTaskData.description}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                  >
                    <Send size={16} />
                    Assign Task
                  </button>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-100">
                <Paperclip size={20} className="text-gray-600" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={18} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Bulk Add Users Modal
  const BulkAddUsersModal = () => {
    if (!showAddUsers) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Add Multiple Users</h3>
            <button onClick={() => setShowAddUsers(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Enter User IDs (one per line)</li>
                <li>Each user will receive login credentials via email</li>
                <li>Format: INT2025XXX (example: INT2025001)</li>
                <li>Duplicate IDs will be ignored</li>
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter User IDs (one per line)
              </label>
              <textarea
                value={bulkUserIds}
                onChange={(e) => setBulkUserIds(e.target.value)}
                placeholder="INT2025001&#10;INT2025002&#10;INT2025003"
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-sm text-gray-600 mt-2">
                {bulkUserIds.split('\n').filter(id => id.trim()).length} users to be added
              </p>
            </div>
          </div>
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={() => setShowAddUsers(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAddUsers}
              disabled={!bulkUserIds.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Users
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage all student accounts, access, and private communications</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-green-600">{users.filter(u => u.isActive).length}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revoked Access</p>
              <p className="text-3xl font-bold text-red-600">{users.filter(u => !u.isActive).length}</p>
            </div>
            <Ban className="w-12 h-12 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chat Enabled</p>
              <p className="text-3xl font-bold text-purple-600">{users.filter(u => u.chatEnabled).length}</p>
            </div>
            <MessageSquare className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 flex gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddUsers(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus size={20} />
            Add Multiple Users
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.id}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
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
                    <div className="text-sm text-gray-900">
                      {user.enrollments.length} Active
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.completedCourses.length} Completed
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.chatEnabled ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={16} />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock size={16} />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDetails(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      {user.isActive ? (
                        <button
                          onClick={() => handleRevokeUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Revoke Access"
                        >
                          <Ban size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreUser(user.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Restore Access"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          if (!user.certificateSubmitted) {
                            setShowCertificateVerification(true);
                          } else if (user.chatEnabled) {
                            setShowChatModal(true);
                          } else {
                            alert('Please verify certificate first to enable chat');
                          }
                        }}
                        className={`p-2 rounded ${
                          user.chatEnabled 
                            ? 'text-purple-600 hover:bg-purple-50' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={user.chatEnabled ? 'Open Chat' : 'Enable Chat'}
                      >
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No users found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserDetailsModal />
      <EditUserModal />
      <CertificateVerificationModal />
      <ChatModal />
      <BulkAddUsersModal />
    </div>
  );
};

export default AdminUserManagement;
