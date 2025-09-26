import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, token } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated || !token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  return children ? children : <Outlet />;
};

export default AdminRoute;
