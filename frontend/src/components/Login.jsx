import React, { useState } from 'react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/enhancedAPI';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    await attemptLogin(formData);
  };

  const attemptLogin = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(credentials);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (response.data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/intern/dashboard');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    const creds = { email: 'ADMIN001', password: 'admin123' };
    setFormData({ email: creds.email, password: creds.password });
    await attemptLogin(creds);
  };

  const loginAsIntern = async () => {
    const creds = { email: 'INT2025001', password: 'int2025001' };
    setFormData({ email: creds.email, password: creds.password });
    await attemptLogin(creds);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">🎓</div>
          <h1>Student LMS</h1>
          <p>Sign in to your account</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="admin@lms.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="default-creds-title">Default Credentials:</p>
          <div className="default-creds">
            <button type="button" className="cred-btn cred-admin" onClick={loginAsAdmin}>
              👨‍💼 Admin: ADMIN001 / admin123
            </button>
            <button type="button" className="cred-btn cred-intern" onClick={loginAsIntern}>
              👨‍🎓 Intern: INT2025001 / int2025001
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
