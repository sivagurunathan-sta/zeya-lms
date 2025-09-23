import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-4">
          <LoadingSpinner size="xl" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we load your content</p>
      </div>
    </div>
  );
};

export default LoadingScreen;