import React from 'react';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  return children;
};

export default ProtectedRoute;
