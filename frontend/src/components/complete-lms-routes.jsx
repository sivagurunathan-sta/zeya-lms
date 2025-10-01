import React, { useState } from 'react';
import { 
  Upload, CheckCircle, XCircle, Clock, Lock, Unlock, 
  FileText, Github, Image, Video, Download, QrCode,
  Eye, AlertCircle, MessageSquare, Award, DollarSign
} from 'lucide-react';

// ============================================
// MAIN APP COMPONENT WITH ROUTING
// ============================================

const App = () => {
  const [userRole, setUserRole] = useState('admin'); // 'admin' or 'intern'
  const [currentView, setCurrentView] = useState('admin-review'); // 'admin-create', 'admin-review', 'intern-tasks'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">Student LMS System</h1>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setUserRole('admin');
                  setCurrentView('admin-create');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentView === 'admin-create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📚 Create Course
              </button>
              <button
                onClick={() => {
                  setUserRole('admin');
                  setCurrentView('admin-review');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentView === 'admin-review'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✅ Review Submissions
              </button>
              <button
                onClick={() => {
                  setUserRole('intern');
                  setCurrentView('intern-tasks');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentView === 'intern-tasks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                👨‍💻 Intern View
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div>
        {currentView === 'admin-create' && <CreateCourse />}
        {currentView === 'admin-review' && <AdminReviewSubmissions />}
        {currentView === 'intern-tasks' && <InternTaskView />}
      </div>

      {/* Info Panel */}
      <div className="fixed bottom-4 right-4 bg-white shadow-2xl rounded-lg p-4 max-w-sm border-2 border-blue-500">
        <h3 className="font-bold text-lg mb-2 text-blue-600">🎓 System Flow:</h3>
        <ul className="text-sm space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <span>Admin creates course with tasks, videos, files</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <span>Intern completes Task 1 → submits</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <span>Admin reviews → clicks OPEN ✅ or CLOSE ❌</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <span>If OPEN: Next task unlocks in 12 hours</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">5.</span>
            <span>If CLOSE: Intern gets feedback, can resubmit</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">6.</span>
            <span>After all 35 tasks: Payment modal appears</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">7.</span>
            <span>QR code shown → Intern pays ₹499</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-blue-600">8.</span>
            <span>Admin verifies payment → issues certificate</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default App; 
// ============================================

const CreateCourse = () => {
  const [courseData, setCourseData] = useState({
    name: '',
    description: '',
    image: null,
    duration: 35,
    passPercentage: 75,
    certificatePrice: 499
  });

  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState({
    taskNumber: 1,
    title: '',
    description: '',
    videoUrl: '',
    files: [],
    submissionType: 'FORM' // FORM, FILE, GITHUB
  });

  const addTask = () => {
    setTasks([...tasks, { ...currentTask, id: Date.now() }]);
    setCurrentTask({
      taskNumber: tasks.length + 2,
      title: '',
      description: '',
      videoUrl: '',
      files: [],
      submissionType: 'FORM'
    });
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === 'course') {
      setCourseData({ ...courseData, image: files[0] });
    } else {
      setCurrentTask({ ...currentTask, files: [...currentTask.files, ...files] });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Create New Internship/Course</h1>
      
      {/* Course Basic Info */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Course Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Course Name"
            value={courseData.name}
            onChange={(e) => setCourseData({...courseData, name: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="number"
            placeholder="Duration (days)"
            value={courseData.duration}
            onChange={(e) => setCourseData({...courseData, duration: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          />
          <textarea
            placeholder="Course Description"
            value={courseData.description}
            onChange={(e) => setCourseData({...courseData, description: e.target.value})}
            className="px-4 py-2 border rounded-lg col-span-2"
            rows="3"
          />
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Course Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'course')}
              className="px-4 py-2 border rounded-lg w-full"
            />
          </div>
          <input
            type="number"
            placeholder="Pass Percentage (75%)"
            value={courseData.passPercentage}
            onChange={(e) => setCourseData({...courseData, passPercentage: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="number"
            placeholder="Certificate Price (₹499)"
            value={courseData.certificatePrice}
            onChange={(e) => setCourseData({...courseData, certificatePrice: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Add Tasks */}
      <div className="mb-8 p-6 bg-green-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add Task #{currentTask.taskNumber}</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Task Title"
            value={currentTask.title}
            onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})}
            className="px-4 py-2 border rounded-lg w-full"
          />
          <textarea
            placeholder="Task Description"
            value={currentTask.description}
            onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})}
            className="px-4 py-2 border rounded-lg w-full"
            rows="3"
          />
          <input
            type="url"
            placeholder="Video URL (YouTube/Vimeo)"
            value={currentTask.videoUrl}
            onChange={(e) => setCurrentTask({...currentTask, videoUrl: e.target.value})}
            className="px-4 py-2 border rounded-lg w-full"
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Upload Task Materials (PDFs, Videos, Images)</label>
            <input
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e, 'task')}
              className="px-4 py-2 border rounded-lg w-full"
            />
            {currentTask.files.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                {currentTask.files.length} file(s) selected
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Submission Type</label>
            <select
              value={currentTask.submissionType}
              onChange={(e) => setCurrentTask({...currentTask, submissionType: e.target.value})}
              className="px-4 py-2 border rounded-lg w-full"
            >
              <option value="FORM">Google Form</option>
              <option value="FILE">File Upload</option>
              <option value="GITHUB">GitHub Repository</option>
            </select>
          </div>

          <button
            onClick={addTask}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full font-semibold"
          >
            Add Task to Course
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Tasks Added ({tasks.length})</h2>
          <div className="space-y-3">
            {tasks.map((task, idx) => (
              <div key={task.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Task {idx + 1}: {task.title}</h3>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 inline-block">
                      {task.submissionType}
                    </span>
                  </div>
                  <button
                    onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Course */}
      <button
        onClick={() => alert('Course created successfully! (Connect to backend API)')}
        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg"
      >
        Create Internship Course
      </button>
    </div>
  );
};

// ============================================
// ADMIN - REVIEW SUBMISSIONS COMPONENT
// ============================================

const AdminReviewSubmissions = () => {
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      internName: 'Rahul Kumar',
      internId: 'INT2025001',
      taskNumber: 1,
      taskTitle: 'Setup Development Environment',
      submittedAt: new Date(),
      submissionType: 'GITHUB',
      githubUrl: 'https://github.com/rahul/dev-setup',
      status: 'PENDING'
    },
    {
      id: 2,
      internName: 'Priya Sharma',
      internId: 'INT2025002',
      taskNumber: 2,
      taskTitle: 'HTML & CSS Portfolio',
      submittedAt: new Date(),
      submissionType: 'FILE',
      fileUrl: '/uploads/portfolio.zip',
      status: 'PENDING'
    }
  ]);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewAction, setReviewAction] = useState(''); // 'OPEN' or 'CLOSE'
  const [adminFeedback, setAdminFeedback] = useState('');

  const handleReview = (submissionId, action) => {
    setSubmissions(submissions.map(sub => {
      if (sub.id === submissionId) {
        return {
          ...sub,
          status: action === 'OPEN' ? 'APPROVED' : 'REJECTED',
          reviewedAt: new Date(),
          adminFeedback: adminFeedback
        };
      }
      return sub;
    }));
    
    alert(`Task ${action === 'OPEN' ? 'OPENED (Approved)' : 'CLOSED (Rejected)'}\nNext task will ${action === 'OPEN' ? 'unlock in 12 hours' : 'remain locked'}`);
    setSelectedSubmission(null);
    setReviewAction('');
    setAdminFeedback('');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Review Submissions</h1>

      <div className="grid gap-4">
        {submissions.filter(s => s.status === 'PENDING').map(submission => (
          <div key={submission.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{submission.internName}</h3>
                <p className="text-gray-600">{submission.internId}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Task {submission.taskNumber}: {submission.taskTitle}
                </p>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                Pending Review
              </span>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Submission Details:</p>
              {submission.submissionType === 'GITHUB' && (
                <a 
                  href={submission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Github size={20} />
                  {submission.githubUrl}
                </a>
              )}
              {submission.submissionType === 'FILE' && (
                <a 
                  href={submission.fileUrl}
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <FileText size={20} />
                  Download Submission
                </a>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedSubmission(submission);
                  setReviewAction('OPEN');
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                OPEN (Approve Task)
              </button>
              <button
                onClick={() => {
                  setSelectedSubmission(submission);
                  setReviewAction('CLOSE');
                }}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center gap-2"
              >
                <XCircle size={20} />
                CLOSE (Reject Task)
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {reviewAction === 'OPEN' ? '✓ Approve & Open Task' : '✗ Reject & Close Task'}
            </h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">{selectedSubmission.internName}</p>
              <p className="text-sm text-gray-600">Task {selectedSubmission.taskNumber}: {selectedSubmission.taskTitle}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Admin Feedback *</label>
              <textarea
                value={adminFeedback}
                onChange={(e) => setAdminFeedback(e.target.value)}
                rows="4"
                placeholder={reviewAction === 'OPEN' 
                  ? "Great work! All requirements met. Next task will unlock in 12 hours."
                  : "Please fix the following issues and resubmit..."
                }
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className={`mb-4 p-4 rounded-lg ${reviewAction === 'OPEN' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className={`font-semibold mb-2 ${reviewAction === 'OPEN' ? 'text-green-900' : 'text-red-900'}`}>
                What happens next?
              </h4>
              <ul className={`text-sm space-y-1 list-disc list-inside ${reviewAction === 'OPEN' ? 'text-green-800' : 'text-red-800'}`}>
                {reviewAction === 'OPEN' ? (
                  <>
                    <li>Intern will receive approval notification</li>
                    <li>Current task marked as completed</li>
                    <li>Next task will unlock after 12 hours</li>
                    <li>If this was the last task, payment option will appear</li>
                  </>
                ) : (
                  <>
                    <li>Intern will receive rejection notification with feedback</li>
                    <li>They can view feedback and resubmit corrected work</li>
                    <li>Next task remains locked until this is approved</li>
                    <li>Task reopens for resubmission</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  setReviewAction('');
                  setAdminFeedback('');
                }}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedSubmission.id, reviewAction)}
                className={`flex-1 px-6 py-2 rounded-lg text-white font-semibold ${
                  reviewAction === 'OPEN' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {reviewAction === 'OPEN' ? 'OPEN' : 'CLOSE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// INTERN - VIEW TASKS & SUBMIT
// ============================================

const InternTaskView = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      taskNumber: 1,
      title: 'Setup Development Environment',
      description: 'Install Node.js, VS Code, Git. Create your first repository.',
      videoUrl: 'https://youtube.com/watch?v=example',
      files: [
        { name: 'Setup Guide.pdf', url: '/files/guide.pdf' }
      ],
      submissionType: 'GITHUB',
      status: 'UNLOCKED',
      canSubmit: true
    },
    {
      id: 2,
      taskNumber: 2,
      title: 'HTML & CSS Portfolio',
      description: 'Create a responsive portfolio website.',
      submissionType: 'FILE',
      status: 'LOCKED',
      unlockMessage: 'Complete Task 1 first'
    },
    {
      id: 3,
      taskNumber: 3,
      title: 'JavaScript Basics',
      description: 'Learn JS fundamentals and DOM manipulation.',
      submissionType: 'FORM',
      status: 'LOCKED',
      unlockMessage: 'Complete previous tasks'
    }
  ]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [submission, setSubmission] = useState({
    githubUrl: '',
    formUrl: '',
    file: null,
    notes: ''
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleSubmit = (taskId) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'SUBMITTED',
          canSubmit: false,
          submittedAt: new Date()
        };
      }
      return t;
    }));
    
    alert('Task submitted! Admin will review within 12-24 hours.');
    setSelectedTask(null);
    setSubmission({ githubUrl: '', formUrl: '', file: null, notes: '' });
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">Full Stack Web Development Internship</h1>
        <p className="text-blue-100">Complete all 35 tasks to earn your certificate</p>
        <div className="mt-4 bg-white bg-opacity-20 rounded-full h-3">
          <div className="bg-white h-3 rounded-full" style={{width: '8%'}}></div>
        </div>
        <p className="text-sm mt-2">Progress: 3/35 tasks completed (8%)</p>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <div 
            key={task.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${task.status === 'LOCKED' ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  task.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                  task.status === 'UNLOCKED' ? 'bg-blue-500 text-white' :
                  task.status === 'SUBMITTED' ? 'bg-yellow-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {task.taskNumber}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{task.title}</h3>
                  <p className="text-gray-600">{task.description}</p>
                </div>
              </div>
              
              {task.status === 'UNLOCKED' && <Unlock className="text-green-500" size={24} />}
              {task.status === 'LOCKED' && <Lock className="text-gray-400" size={24} />}
              {task.status === 'SUBMITTED' && <Clock className="text-yellow-500" size={24} />}
            </div>

            {task.videoUrl && task.status !== 'LOCKED' && (
              <div className="mb-4">
                <a 
                  href={task.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Video size={20} />
                  Watch Tutorial Video
                </a>
              </div>
            )}

            {task.files && task.status !== 'LOCKED' && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Task Materials:</p>
                <div className="flex gap-2">
                  {task.files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100 flex items-center gap-1"
                    >
                      <FileText size={16} />
                      {file.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {task.status === 'LOCKED' && (
              <div className="bg-gray-100 border border-gray-300 rounded-md p-4 flex items-center gap-2">
                <Lock className="text-gray-500" />
                <span className="text-gray-700 font-medium">{task.unlockMessage}</span>
              </div>
            )}

            {task.status === 'SUBMITTED' && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 flex items-center gap-2">
                <Clock className="text-yellow-600" />
                <span className="text-yellow-800">Submitted! Waiting for admin review (12-24 hours)</span>
              </div>
            )}

            {task.canSubmit && task.status === 'UNLOCKED' && (
              <button
                onClick={() => setSelectedTask(task)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Submit Task
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Check if all tasks completed - Show payment */}
      <div className="mt-6">
        <button
          onClick={() => setShowPaymentModal(true)}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 shadow-lg flex items-center justify-center gap-2"
        >
          <Award size={24} />
          Complete Payment for Certificate - ₹499
        </button>
      </div>

      {/* Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              Submit Task {selectedTask.taskNumber}: {selectedTask.title}
            </h2>

            {selectedTask.submissionType === 'GITHUB' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">GitHub Repository URL *</label>
                <input
                  type="url"
                  value={submission.githubUrl}
                  onChange={(e) => setSubmission({...submission, githubUrl: e.target.value})}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}

            {selectedTask.submissionType === 'FORM' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Google Form Response URL *</label>
                <input
                  type="url"
                  value={submission.formUrl}
                  onChange={(e) => setSubmission({...submission, formUrl: e.target.value})}
                  placeholder="https://docs.google.com/forms/..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}

            {selectedTask.submissionType === 'FILE' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Upload File *</label>
                <input
                  type="file"
                  onChange={(e) => setSubmission({...submission, file: e.target.files[0]})}
                  className="w-full px-4 py-2 border rounded-lg"
                  accept=".pdf,.zip,.jpg,.png"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
              <textarea
                value={submission.notes}
                onChange={(e) => setSubmission({...submission, notes: e.target.value})}
                rows="3"
                placeholder="Any additional information..."
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="font-medium text-blue-900 mb-2">⏰ Important:</p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Submit within 24 hours of task unlock</li>
                <li>Admin will review within 12-24 hours</li>
                <li>Next task unlocks 12 hours after approval</li>
                <li>If rejected, you can resubmit with corrections</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(selectedTask.id)}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Submit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold mb-2">🎉 Congratulations!</h2>
              <p className="text-gray-600">
                You completed all tasks with <span className="font-bold text-green-600">85%</span> score
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-3">Certificate Payment</h3>
              <div className="bg-white rounded-lg p-4 text-center">
                <QrCode size={200} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">Scan to pay ₹499</p>
                <p className="text-xs text-gray-500">UPI: admin@paytm</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter Transaction ID"
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={() => alert('Payment submitted! Upload screenshot for verification.')}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Submit Payment
              </button>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-3 text-gray-600 hover:text-gray-800 text-sm"
            >
              I'll pay later
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
//