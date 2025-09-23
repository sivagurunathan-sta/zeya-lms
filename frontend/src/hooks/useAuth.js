import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  loginUser, 
  registerUser, 
  checkAuth, 
  logout as logoutAction, 
  clearError,
  updateProfile 
} from '../store/slices/authSlice';

/**
 * Custom hook for authentication state management
 * Provides a clean interface to Redux auth state and actions
 */
const useAuth = () => {
  const dispatch = useDispatch();
  
  // Get auth state from Redux store
  const { 
    user, 
    token, 
    isAuthenticated, 
    loading, 
    error 
  } = useSelector((state) => state.auth);

  /**
   * Initialize authentication on app load
   * Checks for existing token and validates it
   */
  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    
    if (storedToken) {
      try {
        // Validate token by fetching current user
        await dispatch(checkAuth()).unwrap();
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('token');
        console.error('Token validation failed:', error);
      }
    }
  }, [dispatch]);

  /**
   * Login user with credentials
   * @param {Object} credentials - { email, password }
   * @returns {Promise} Login result
   */
  const login = useCallback(async (credentials) => {
    try {
      const result = await dispatch(loginUser(credentials)).unwrap();
      
      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      
      return {
        success: true,
        user: result.user,
        message: 'Login successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error || 'Login failed'
      };
    }
  }, [dispatch]);

  /**
   * Register new user
   * @param {Object} userData - { firstName, lastName, email, password, phone? }
   * @returns {Promise} Registration result
   */
  const register = useCallback(async (userData) => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap();
      
      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      
      return {
        success: true,
        user: result.user,
        message: 'Registration successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error || 'Registration failed'
      };
    }
  }, [dispatch]);

  /**
   * Logout user and clear all auth data
   */
  const logout = useCallback(() => {
    // Clear token from localStorage
    localStorage.removeItem('token');
    
    // Clear any other auth-related data
    localStorage.removeItem('refreshToken');
    
    // Dispatch logout action
    dispatch(logoutAction());
    
    // Optional: Clear any cached data or redirect
    window.location.href = '/auth/login';
  }, [dispatch]);

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile information
   */
  const updateUserProfile = useCallback((profileData) => {
    dispatch(updateProfile(profileData));
  }, [dispatch]);

  /**
   * Clear any authentication errors
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has the role
   */
  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  /**
   * Check if user is admin
   * @returns {boolean} True if user is admin
   */
  const isAdmin = useCallback(() => {
    return hasRole('ADMIN');
  }, [hasRole]);

  /**
   * Check if user is student
   * @returns {boolean} True if user is student
   */
  const isStudent = useCallback(() => {
    return hasRole('STUDENT');
  }, [hasRole]);

  /**
   * Get user's full name
   * @returns {string} Full name or empty string
   */
  const getFullName = useCallback(() => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }, [user]);

  /**
   * Get user's initials for avatar
   * @returns {string} User initials
   */
  const getUserInitials = useCallback(() => {
    if (!user) return '';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user]);

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired
   */
  const isTokenExpired = useCallback(() => {
    if (!token) return true;
    
    try {
      // Decode JWT token to check expiration
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return tokenData.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }, [token]);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    if (token && !isTokenExpired()) {
      try {
        await dispatch(checkAuth()).unwrap();
      } catch (error) {
        console.error('Failed to refresh auth:', error);
        logout();
      }
    }
  }, [dispatch, token, isTokenExpired, logout]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up token expiration check
  useEffect(() => {
    if (isAuthenticated && token) {
      const checkTokenInterval = setInterval(() => {
        if (isTokenExpired()) {
          console.warn('Token expired, logging out...');
          logout();
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkTokenInterval);
    }
  }, [isAuthenticated, token, isTokenExpired, logout]);

  // Return the auth interface
  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,
    error,
    
    // Actions
    login,
    register,
    logout,
    updateUserProfile,
    clearAuthError,
    refreshAuth,
    
    // Utilities
    hasRole,
    isAdmin,
    isStudent,
    getFullName,
    getUserInitials,
    isTokenExpired,
    
    // Computed properties
    isLoading: loading,
    hasError: !!error,
    userName: getFullName(),
    userInitials: getUserInitials(),
  };
};

export default useAuth;