import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  return children ? children : <Outlet />;
};

export default AdminRoute;
