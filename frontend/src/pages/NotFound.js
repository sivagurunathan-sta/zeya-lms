import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../components/UI/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-gray-200 dark:text-gray-700 mb-4">
            404
          </div>
          <div className="relative">
            <Search className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link to="/">
            <Button className="w-full">
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </Button>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>

        {/* Help Links */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Need help? Try these links:
          </p>
          <div className="space-y-2">
            <Link
              to="/courses"
              className="block text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Browse Courses
            </Link>
            <Link
              to="/certificates"
              className="block text-indigo-600 hover:text-indigo-500 text-sm"
            >
              View Certificates
            </Link>
            <Link
              to="/profile"
              className="block text-indigo-600 hover:text-indigo-500 text-sm"
            >
              My Profile
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-400 dark:text-gray-500">
          Error Code: 404 | Student LMS Platform
        </div>
      </div>
    </div>
  );
};

export default NotFound;