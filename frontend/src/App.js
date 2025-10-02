// ============================================
// FILE: frontend/src/App.js
// COMPLETE VERSION - WITH AUTHENTICATION & ROUTING
// ============================================

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import UserManagement from './pages/admin/UserManagement';
import InternDashboard from './pages/intern/Dashboard';
import { authAPI } from './services/api';

// ============================================
// LOGIN PAGE COMPONENT
// ============================================

const LoginPage = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    userIdOrEmail: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(credentials);
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Store auth data in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Call parent callback to update state
        onLogin(user);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        {/* Header */}
        <div style={loginStyles.header}>
          <h1 style={loginStyles.title}>🎓 Student LMS</h1>
          <p style={loginStyles.subtitle}>Sign in to your account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={loginStyles.error}>
            ❌ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={loginStyles.form}>
          <div style={loginStyles.inputGroup}>
            <label style={loginStyles.label}>User ID or Email</label>
            <input
              type="text"
              value={credentials.userIdOrEmail}
              onChange={(e) => setCredentials({ ...credentials, userIdOrEmail: e.target.value })}
              placeholder="ADMIN001 or admin@lms.com"
              style={loginStyles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={loginStyles.inputGroup}>
            <label style={loginStyles.label}>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter your password"
              style={loginStyles.input}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...loginStyles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        {/* Help Section */}
        <div style={loginStyles.footer}>
          <p style={loginStyles.helpText}>
            💡 <strong>Default Credentials:</strong>
          </p>
          <div style={loginStyles.credentialBox}>
            <p style={loginStyles.credential}>
              <strong>👨‍💼 Admin:</strong> ADMIN001 / admin123
            </p>
            <p style={loginStyles.credential}>
              <strong>👨‍🎓 Intern:</strong> INT2025001 / int2025001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ADMIN LAYOUT WITH SIDEBAR
// ============================================

const AdminLayout = ({ user, onLogout, children }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin/users', icon: '👥', label: 'User Management' },
    { path: '/admin/tasks', icon: '📋', label: 'Tasks & Submissions' },
    { path: '/admin/payments', icon: '💰', label: 'Payment Verification' },
    { path: '/admin/certificates', icon: '🎓', label: 'Certificates' },
    { path: '/admin/chat', icon: '💬', label: 'Chat & Private Tasks' },
    { path: '/admin/analytics', icon: '📊', label: 'Analytics' }
  ];

  return (
    <div style={layoutStyles.container}>
      {/* Sidebar */}
      <aside style={layoutStyles.sidebar}>
        {/* Logo Section */}
        <div style={layoutStyles.sidebarHeader}>
          <h2 style={layoutStyles.logo}>🎓 Student LMS</h2>
          <p style={layoutStyles.logoSubtitle}>Admin Portal</p>
        </div>

        {/* Navigation Menu */}
        <nav style={layoutStyles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...layoutStyles.navItem,
                backgroundColor: location.pathname === item.path ? '#3b82f6' : 'transparent',
                color: location.pathname === item.path ? 'white' : '#6b7280'
              }}
            >
              <span style={{ fontSize: '20px', marginRight: '12px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div style={layoutStyles.sidebarFooter}>
          <div style={layoutStyles.userInfo}>
            <div style={layoutStyles.userAvatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={layoutStyles.userName}>{user.name}</div>
              <div style={layoutStyles.userRole}>{user.role}</div>
            </div>
          </div>
          <button onClick={onLogout} style={layoutStyles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={layoutStyles.main}>
        {children}
      </main>
    </div>
  );
};

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

const ProtectedRoute = ({ children, user, requiredRole }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const userRole = (user.role || '').toString().toUpperCase();
    const reqRole = (requiredRole || '').toString().toUpperCase();
    if (userRole !== reqRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

// ============================================
// PLACEHOLDER PAGES FOR OTHER ROUTES
// ============================================

const TasksPage = () => (
  <div style={placeholderStyles.container}>
    <h1 style={placeholderStyles.title}>📋 Tasks & Submissions</h1>
    <p style={placeholderStyles.subtitle}>Task management system coming soon...</p>
    <div style={placeholderStyles.card}>
      <p>✅ View all task submissions</p>
      <p>✅ Approve or reject submissions</p>
      <p>✅ Provide feedback to interns</p>
      <p>✅ Track completion rates</p>
    </div>
  </div>
);

const PaymentsPage = () => (
  <div style={placeholderStyles.container}>
    <h1 style={placeholderStyles.title}>💰 Payment Verification</h1>
    <p style={placeholderStyles.subtitle}>Payment verification system coming soon...</p>
    <div style={placeholderStyles.card}>
      <p>✅ Verify payment proofs</p>
      <p>✅ Approve/reject payments</p>
      <p>✅ Track revenue</p>
      <p>✅ Generate payment reports</p>
    </div>
  </div>
);

const CertificatesPage = () => (
  <div style={placeholderStyles.container}>
    <h1 style={placeholderStyles.title}>🎓 Certificate Management</h1>
    <p style={placeholderStyles.subtitle}>Certificate system coming soon...</p>
    <div style={placeholderStyles.card}>
      <p>✅ Upload certificates</p>
      <p>✅ Track certificate requests</p>
      <p>✅ Validate certificates</p>
      <p>✅ Enable paid task access</p>
    </div>
  </div>
);

const ChatPage = () => (
  <div style={placeholderStyles.container}>
    <h1 style={placeholderStyles.title}>💬 Chat & Private Tasks</h1>
    <p style={placeholderStyles.subtitle}>Chat system coming soon...</p>
    <div style={placeholderStyles.card}>
      <p>✅ Chat with interns</p>
      <p>✅ Assign private tasks</p>
      <p>✅ Review submissions</p>
      <p>✅ Real-time messaging</p>
    </div>
  </div>
);

const AnalyticsPage = () => (
  <div style={placeholderStyles.container}>
    <h1 style={placeholderStyles.title}>📊 Analytics Dashboard</h1>
    <p style={placeholderStyles.subtitle}>Analytics system coming soon...</p>
    <div style={placeholderStyles.card}>
      <p>✅ User statistics</p>
      <p>✅ Revenue reports</p>
      <p>✅ Completion rates</p>
      <p>✅ Performance metrics</p>
    </div>
  </div>
);

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          const role = (parsed?.role || parsed?.userRole || '').toString().toUpperCase();
          if (role === 'INTERN') return navigate('/intern/dashboard');
          if (role === 'ADMIN') return navigate('/admin/users');
        }

        // If token exists but no user, try fetching profile
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) {
          try {
            const { data } = await authAPI.getProfile();
            const profile = data?.data?.user || data?.user || data;
            if (profile) {
              localStorage.setItem('user', JSON.stringify(profile));
              const role = (profile?.role || '').toString().toUpperCase();
              if (role === 'INTERN') return navigate('/intern/dashboard');
              if (role === 'ADMIN') return navigate('/admin/users');
            }
          } catch (err) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    };

    checkAndRedirect();
  }, [navigate]);

  return (
    <div style={placeholderStyles.container}>
      <h1 style={placeholderStyles.title}>🚫 Unauthorized</h1>
      <p style={placeholderStyles.subtitle}>You don't have permission to access this page.</p>
    </div>
  );
};

const NotFoundPage = () => (
  <div style={placeholderStyles.container}>
    <h1 style={placeholderStyles.title}>404</h1>
    <p style={placeholderStyles.subtitle}>Page not found</p>
    <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
      ← Go back home
    </Link>
  </div>
);

// ============================================
// MAIN APP COMPONENT
// ============================================

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const storedUser = localStorage.getItem('user') || localStorage.getItem('userData') || localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // normalize role
        if (parsedUser && parsedUser.role) parsedUser.role = parsedUser.role.toString().toUpperCase();
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userData');
      }
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner}></div>
        <p style={loadingStyles.text}>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.role === 'ADMIN' ? '/admin/users' : '/intern/dashboard'} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* Admin Routes - Protected */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} requiredRole="ADMIN">
              <AdminLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="users" element={<UserManagement />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="certificates" element={<CertificatesPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Unauthorized Route */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Intern Route */}
        <Route
          path="/intern/dashboard"
          element={
            <ProtectedRoute user={user} requiredRole="INTERN">
              <InternDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route
          path="/"
          element={<Navigate to={user ? (user.role === 'ADMIN' ? '/admin/users' : '/intern/dashboard') : '/login'} replace />}
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        a {
          text-decoration: none;
          transition: all 0.2s;
        }
        
        a:hover {
          opacity: 0.8;
        }
        
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        table tr:hover {
          background-color: #f9fafb;
        }
        
        input:focus, textarea:focus, select:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </Router>
  );
};

// ============================================
// STYLES - LOGIN PAGE
// ============================================

const loginStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    width: '100%',
    maxWidth: '440px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280'
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    border: '1px solid #fecaca'
  },
  form: {
    marginBottom: '24px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  footer: {
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  helpText: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px'
  },
  credentialBox: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  credential: {
    fontSize: '13px',
    color: '#374151',
    marginBottom: '8px',
    textAlign: 'left'
  }
};

// ============================================
// STYLES - ADMIN LAYOUT
// ============================================

const layoutStyles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f9fafb'
  },
  sidebar: {
    width: '280px',
    backgroundColor: 'white',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto'
  },
  sidebarHeader: {
    padding: '24px 20px',
    borderBottom: '1px solid #e5e7eb'
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '4px'
  },
  logoSubtitle: {
    fontSize: '13px',
    color: '#6b7280'
  },
  nav: {
    flex: 1,
    padding: '20px 12px'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280'
  },
  logoutButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  main: {
    flex: 1,
    overflow: 'auto'
  }
};

// ============================================
// STYLES - LOADING STATE
// ============================================

const loadingStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f9fafb'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  text: {
    marginTop: '16px',
    color: '#6b7280',
    fontSize: '14px'
  }
};

// ============================================
// STYLES - PLACEHOLDER PAGES
// ============================================

const placeholderStyles = {
  container: {
    padding: '60px 30px',
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center'
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '16px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '40px'
  },
  card: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'left'
  }
};

export default App;
