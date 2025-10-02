import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('intern'); // 'admin' or 'intern'
  const [formData, setFormData] = useState({
    userId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = userType === 'admin' 
        ? 'http://localhost:5000/api/auth/admin/login'
        : 'http://localhost:5000/api/auth/intern/login';

      const response = await axios.post(endpoint, formData);

      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect based on role
      if (userType === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/intern/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🎓 Student LMS</h1>
          <p>Learning Management System</p>
        </div>

        <div className="user-type-toggle">
          <button
            type="button"
            className={userType === 'intern' ? 'active' : ''}
            onClick={() => setUserType('intern')}
          >
            👨‍💻 Intern Login
          </button>
          <button
            type="button"
            className={userType === 'admin' ? 'active' : ''}
            onClick={() => setUserType('admin')}
          >
            👨‍💼 Admin Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              placeholder={userType === 'admin' ? 'Enter Admin ID' : 'Enter Intern ID'}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2025 Student LMS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;