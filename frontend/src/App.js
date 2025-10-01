// frontend/src/App.js - UNIFIED LMS APPLICATION
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import './App.css';

// Auth Pages
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUserManagement from './pages/admin/UserManagement';
import AdminTaskManagement from './pages/admin/TaskManagement';
import AdminSubmissionReview from './pages/admin/ReviewSubmissions';
import AdminPaymentVerification from './pages/admin/PaymentVerificationDashboard';
import AdminCertificateDashboard from './pages/admin/CertificateDashboard';
import ManageCourses from './pages/admin/ManageCourses';
import CreateCourse from './pages/admin/CreateCourse';
import ViewInterns from './pages/admin/ViewInterns';

// Intern/Student Pages
import InternDashboard from './pages/intern/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import CourseView from './pages/intern/CourseView';
import TaskView from './pages/student/TaskView';
import PaymentSubmission from './pages/intern/PaymentSubmission';
import InternCertificateDashboard from './pages/intern/CertificateDashboard';

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    // Check if user role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      toast.error('Access denied. Insufficient permissions.');
      return <Navigate to="/login" replace />;
    }

    return children;
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
};

// ============================================
// ROLE-BASED ROUTE WRAPPERS
// ============================================
const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['ADMIN', 'admin']}>
    {children}
  </ProtectedRoute>
);

const InternRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['INTERN', 'intern']}>
    {children}
  </ProtectedRoute>
);

// ============================================
// 404 NOT FOUND COMPONENT
// ============================================
const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center fade-in">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block transition-all"
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block transition-all"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Error parsing user data:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {/* Global Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
              padding: '16px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#3b82f6',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Logout Button (visible when logged in) */}
        {user && (
          <div className="fixed top-4 right-4 z-50 no-print">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 shadow-lg transition-all"
            >
              Logout
            </button>
          </div>
        )}

        {/* Application Routes */}
        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route 
            path="/login" 
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            } 
          />

          {/* ==================== HOME REDIRECT ==================== */}
          <Route
            path="/"
            element={
              user ? (
                user.role === 'ADMIN' || user.role === 'admin' ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : (
                  <Navigate to="/intern/dashboard" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* ==================== ADMIN ROUTES ==================== */}
          
          {/* Main Dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* User Management */}
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUserManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/manage-users"
            element={
              <AdminRoute>
                <AdminUserManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/interns"
            element={
              <AdminRoute>
                <ViewInterns />
              </AdminRoute>
            }
          />

          {/* Course/Task Management */}
          <Route
            path="/admin/courses"
            element={
              <AdminRoute>
                <ManageCourses />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/courses/create"
            element={
              <AdminRoute>
                <CreateCourse />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId"
            element={
              <AdminRoute>
                <ManageCourses />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <AdminRoute>
                <AdminTaskManagement />
              </AdminRoute>
            }
          />

          {/* Submission Management */}
          <Route
            path="/admin/submissions"
            element={
              <AdminRoute>
                <AdminSubmissionReview />
              </AdminRoute>
            }
          />

          {/* Payment Management */}
          <Route
            path="/admin/payments"
            element={
              <AdminRoute>
                <AdminPaymentVerification />
              </AdminRoute>
            }
          />

          {/* Certificate Management */}
          <Route
            path="/admin/certificates"
            element={
              <AdminRoute>
                <AdminCertificateDashboard />
              </AdminRoute>
            }
          />

          {/* ==================== INTERN/STUDENT ROUTES ==================== */}
          
          {/* Main Dashboard */}
          <Route
            path="/intern/dashboard"
            element={
              <InternRoute>
                <InternDashboard />
              </InternRoute>
            }
          />
          <Route
            path="/student/dashboard"
            element={
              <InternRoute>
                <StudentDashboard />
              </InternRoute>
            }
          />

          {/* Course/Task Views */}
          <Route
            path="/intern/courses/:courseId"
            element={
              <InternRoute>
                <CourseView />
              </InternRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <InternRoute>
                <TaskView />
              </InternRoute>
            }
          />

          {/* Payment Submission */}
          <Route
            path="/intern/payment/:enrollmentId"
            element={
              <InternRoute>
                <PaymentSubmission />
              </InternRoute>
            }
          />

          {/* Certificate Dashboard */}
          <Route
            path="/intern/certificates"
            element={
              <InternRoute>
                <InternCertificateDashboard />
              </InternRoute>
            }
          />
          <Route
            path="/student/certificates"
            element={
              <InternRoute>
                <InternCertificateDashboard />
              </InternRoute>
            }
          />

          {/* ==================== 404 NOT FOUND ==================== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;