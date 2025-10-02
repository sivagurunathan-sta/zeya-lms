import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import AdminDashboard from './components/Admin/AdminDashboard';
import CreateCourse from './components/Admin/CreateCourse';
import ManageCourses from './components/Admin/ManageCourses';
import ManageUsers from './components/Admin/ManageUsers';
import ReviewSubmissions from './components/Admin/ReviewSubmissions';
import ViewInterns from './components/Admin/ViewInterns';
import ManagePayments from './components/Admin/ManagePayments';
import InternDashboard from './components/intern/InternDashboard';
import CourseView from './components/intern/CourseView';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />

          {/* Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/courses" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ManageCourses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/courses/create" 
            element={
              <ProtectedRoute requiredRole="admin">
                <CreateCourse />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/interns" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ViewInterns />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ManageUsers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/submissions" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ReviewSubmissions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/payments" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ManagePayments />
              </ProtectedRoute>
            } 
          />

          {/* Intern Routes */}
          <Route 
            path="/intern/dashboard" 
            element={
              <ProtectedRoute requiredRole="intern">
                <InternDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/intern/courses/:courseId" 
            element={
              <ProtectedRoute requiredRole="intern">
                <CourseView />
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;