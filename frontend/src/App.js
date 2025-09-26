import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { SocketProvider } from './contexts/SocketContext';

// Layout Components
import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';

// Student Pages
import Dashboard from './pages/Student/Dashboard';
import Internships from './pages/Student/Internships';
import InternshipDetail from './pages/Student/InternshipDetail';
import TaskView from './pages/Student/TaskView';
import MyCourses from './pages/Student/MyCourses';
import Certificates from './pages/Student/Certificates';
import Profile from './pages/Student/Profile';
import PaymentPage from './pages/Student/PaymentPage';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import ManageInternships from './pages/Admin/ManageInternships';
import ManageStudents from './pages/Admin/ManageStudents';
import ReviewSubmissions from './pages/Admin/ReviewSubmissions';
import Analytics from './pages/Admin/Analytics';
import PaymentHistory from './pages/Admin/PaymentHistory';
import ContentManager from './pages/Admin/ContentManager';
import UserIdManager from './pages/Admin/UserIdManager';
import TasksManager from './pages/Admin/TasksManager';

// Shared Pages
import NotFound from './pages/NotFound';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Protected Route Component
import ProtectedRoute from './components/Route/ProtectedRoute';
import AdminRoute from './components/Route/AdminRoute';

function App() {
  const dispatch = useDispatch();

  return (
    <SocketProvider>
      <div className="App">
        <Routes>
          {/* Auth */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />

          {/* Student Site */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="internships" element={<Internships />} />
            <Route path="internships/:id" element={<InternshipDetail />} />
            <Route path="courses" element={<MyCourses />} />
            <Route path="courses/:enrollmentId/tasks" element={<TaskView />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="profile" element={<Profile />} />
            <Route path="payment/:enrollmentId" element={<PaymentPage />} />
          </Route>

          {/* Admin Site */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="internships" element={<ManageInternships />} />
            <Route path="students" element={<ManageStudents />} />
            <Route path="submissions" element={<ReviewSubmissions />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="payments" element={<PaymentHistory />} />
            <Route path="content" element={<ContentManager />} />
            <Route path="user-ids" element={<UserIdManager />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </SocketProvider>
  );
}

export default App;
