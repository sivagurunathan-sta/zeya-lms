// frontend/src/App.js
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

// Import your React components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/admin/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import CourseDetails from './pages/student/CourseDetails';
import TaskView from './pages/student/TaskView';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';

// Import actions
import { initDemoAuth } from './store/slices/authSlice';

import './App.css';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Initialize demo authentication or check existing auth
    dispatch(initDemoAuth());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} 
        />

        {/* Admin Routes */}
        <Route 
          path="/admin/*" 
          element={
            <PrivateRoute role="ADMIN">
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        {/* Student Routes */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <StudentDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/courses/:id" 
          element={
            <PrivateRoute>
              <CourseDetails />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/tasks/:id" 
          element={
            <PrivateRoute>
              <TaskView />
            </PrivateRoute>
          } 
        />

        {/* Default Routes */}
        <Route 
          path="/" 
          element={
            isAuthenticated 
              ? <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} />
              : <Navigate to="/login" />
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;