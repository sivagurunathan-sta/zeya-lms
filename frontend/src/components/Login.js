// src/components/Login.js
import React, { useState } from 'react';
import { LogIn, BookOpen } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Simulate Google OAuth login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    // In production, this would integrate with Google OAuth
    // For now, simulate the login process
    setTimeout(() => {
      // Mock user data - you can toggle between admin and user
      const mockUser = {
        id: '1',
        name: 'Rahul Kumar',
        email: 'rahul@example.com',
        role: 'user', // Change to 'admin' to test admin dashboard
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Kumar'
      };
      
      const mockToken = 'mock-jwt-token-12345';
      
      onLogin(mockUser, mockToken);
      setIsLoading(false);
    }, 1500);
  };

  // Demo login buttons for testing
  const handleDemoLogin = (role) => {
    const demoUsers = {
      admin: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@lms.com',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User'
      },
      user: {
        id: 'user-1',
        name: 'Rahul Kumar',
        email: 'rahul@example.com',
        role: 'user',
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Kumar'
      }
    };

    const mockToken = `mock-token-${role}-12345`;
    onLogin(demoUsers[role], mockToken);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student LMS Portal</h1>
          <p className="text-gray-600">Sign in to access your learning dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                  <span className="font-medium text-gray-700">Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium text-gray-700">Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or for demo</span>
              </div>
            </div>

            {/* Demo Login Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleDemoLogin('admin')}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium transition"
              >
                Login as Admin
              </button>
              <button
                onClick={() => handleDemoLogin('user')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 font-medium transition"
              >
                Login as Student
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5"></div>
                <p>Complete 35 daily tasks to earn your certificate</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5"></div>
                <p>Score 75%+ to qualify for certification</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5"></div>
                <p>Access premium tasks after certification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2025 Student LMS Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;