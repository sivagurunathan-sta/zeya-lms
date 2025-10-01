import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isAdmin 
        ? 'http://localhost:5000/api/auth/admin/login'
        : 'http://localhost:5000/api/auth/intern/login';

      const response = await axios.post(endpoint, formData);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userRole', isAdmin ? 'admin' : 'intern');
      localStorage.setItem('userId', response.data.user._id);
      localStorage.setItem('userName', response.data.user.name);
      
      alert(`${isAdmin ? 'Admin' : 'Intern'} login successful!`);
      navigate(isAdmin ? '/admin/dashboard' : '/intern/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + (error.response?.data?.message || 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">📚</div>
          <h1>LMS Portal</h1>
          <p>Learning Management System</p>
        </div>

        <div className="login-toggle">
          <button
            className={!isAdmin ? 'active' : ''}
            onClick={() => {
              setIsAdmin(false);
              setFormData({ userId: '', password: '' });
            }}
          >
            👨‍🎓 Intern
          </button>
          <button
            className={isAdmin ? 'active' : ''}
            onClick={() => {
              setIsAdmin(true);
              setFormData({ userId: '', password: '' });
            }}
          >
            👨‍💼 Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>{isAdmin ? 'Admin ID' : 'Intern ID'}</label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              placeholder={isAdmin ? 'Enter admin ID' : 'Enter intern ID'}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              autoComplete="off"
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : `Login as ${isAdmin ? 'Admin' : 'Intern'}`}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isAdmin 
              ? '🔒 Admin access only' 
              : '📝 Contact admin to get your credentials'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;