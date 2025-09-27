import React, { useState, useEffect, createContext, useContext } from 'react';
import { Bell, Book, Users, TrendingUp, Award, CreditCard, Settings, LogOut, Menu, X, CheckCircle, Clock, AlertCircle, Download, Eye, Github } from 'lucide-react';

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API Configuration - Fixed the API base URL and endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = {
  post: async (endpoint, data, isFormData = false) => {
    const token = localStorage.getItem('authToken');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }
      
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  get: async (endpoint) => {
    const token = localStorage.getItem('authToken');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }
      
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  put: async (endpoint, data) => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }
      
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

// Auth Provider - Fixed the login logic
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user data:', e);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    setLoading(false);
  }, []);
  
  const login = async (userId, password) => {
    try {
      // Determine if this is an admin or intern login
      const isAdmin = userId.toLowerCase().includes('admin') || userId === 'admin';
      const endpoint = isAdmin ? '/auth/admin-login' : '/auth/intern-login';
      
      const response = await api.post(endpoint, { userId, password });
      
      // The response should contain token and user directly
      if (!response.token || !response.user) {
        throw new Error('Invalid response format from server');
      }
      
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
      setUser(response.user);
      
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };
  
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Animated Card Component
const AnimatedCard = ({ children, className = "", hover = true }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300 ${hover ? 'hover:shadow-lg hover:-translate-y-1' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ percentage, color = "blue" }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-500 ${colorClasses[color]}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

// Notification Badge
const NotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;
  
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// Login Component - Fixed styling and error handling
const LoginForm = () => {
  const [formData, setFormData] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(formData.userId, formData.password);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <AnimatedCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Book className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student LMS</h1>
          <p className="text-gray-600">Welcome back! Please sign in to continue.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              required
              value={formData.userId}
              onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your User ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your password"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account? Contact your administrator.
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Demo Credentials:</p>
            <p>Admin: admin@lms.com / admin123</p>
            <p>Intern: Check seeded users in backend</p>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
};

// Admin Sidebar Component
const AdminSidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Manage Users' },
    { id: 'tasks', icon: Book, label: 'Tasks' },
    { id: 'submissions', icon: CheckCircle, label: 'Submissions' },
    { id: 'payments', icon: CreditCard, label: 'Payments' },
    { id: 'certificates', icon: Award, label: 'Certificates' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];
  
  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-br from-gray-900 to-gray-800 text-white transform transition-transform duration-300 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Book className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">Student LMS</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-4">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors duration-200 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const AdminHeader = ({ sidebarOpen, setSidebarOpen, notifications = 0 }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-600 hover:text-gray-900 cursor-pointer" />
          <NotificationBadge count={notifications} />
        </div>
      </div>
    </header>
  );
};

// Simple placeholder for dashboard content
const AdminDashboardTab = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Interns</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
              <span className="text-sm text-green-600">+12%</span>
            </div>
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">35</p>
              <span className="text-sm text-green-600">+5%</span>
            </div>
            <div className="p-3 rounded-lg bg-green-100">
              <Book className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Submissions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">156</p>
              <span className="text-sm text-green-600">+23%</span>
            </div>
            <div className="p-3 rounded-lg bg-purple-100">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Certificates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
              <span className="text-sm text-green-600">+8%</span>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </AnimatedCard>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Reviews</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">8</p>
              <p className="text-sm text-gray-600">submissions awaiting review</p>
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Payments</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-sm text-gray-600">payments awaiting approval</p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
};

// Simple placeholders for other tabs
const UsersManagementTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">User management interface will be here.</p>
    </AnimatedCard>
  </div>
);

const TasksManagementTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Task Management</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Task management interface will be here.</p>
    </AnimatedCard>
  </div>
);

const SubmissionsReviewTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Submission Reviews</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Submission review interface will be here.</p>
    </AnimatedCard>
  </div>
);

const PaymentsTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Management</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Payment management interface will be here.</p>
    </AnimatedCard>
  </div>
);

const CertificatesTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Certificate Management</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Certificate management interface will be here.</p>
    </AnimatedCard>
  </div>
);

const SettingsTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Settings interface will be here.</p>
    </AnimatedCard>
  </div>
);

// Intern Components
const InternSidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
    { id: 'tasks', icon: Book, label: 'Tasks' },
    { id: 'progress', icon: CheckCircle, label: 'Progress' },
    { id: 'certificate', icon: Award, label: 'Certificate' },
    { id: 'payments', icon: CreditCard, label: 'Payments' }
  ];
  
  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-br from-blue-900 to-indigo-800 text-white transform transition-transform duration-300 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-blue-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
              <Book className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">Student LMS</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-blue-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-4">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors duration-200 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-200 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-blue-300">Intern</p>
            </div>
            <button
              onClick={logout}
              className="text-blue-300 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const InternHeader = ({ sidebarOpen, setSidebarOpen, notifications = 0 }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900">Intern Dashboard</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-600 hover:text-gray-900 cursor-pointer" />
          <NotificationBadge count={notifications} />
        </div>
      </div>
    </header>
  );
};

// Intern placeholder components
const InternDashboardTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Intern Dashboard</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Welcome to your dashboard! Intern features coming soon.</p>
    </AnimatedCard>
  </div>
);

const InternTasksTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Tasks</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Your tasks will appear here.</p>
    </AnimatedCard>
  </div>
);

const ProgressTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Tracking</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Progress tracking will be here.</p>
    </AnimatedCard>
  </div>
);

const CertificateTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Certificate</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Certificate information will be here.</p>
    </AnimatedCard>
  </div>
);

const PaymentsHistoryTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Payment history will be here.</p>
    </AnimatedCard>
  </div>
);

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  
  const renderContent = () => {
    if (isAdmin) {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboardTab />;
        case 'users':
          return <UsersManagementTab />;
        case 'tasks':
          return <TasksManagementTab />;
        case 'submissions':
          return <SubmissionsReviewTab />;
        case 'payments':
          return <PaymentsTab />;
        case 'certificates':
          return <CertificatesTab />;
        case 'settings':
          return <SettingsTab />;
        default:
          return <AdminDashboardTab />;
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return <InternDashboardTab />;
        case 'tasks':
          return <InternTasksTab />;
        case 'progress':
          return <ProgressTab />;
        case 'certificate':
          return <CertificateTab />;
        case 'payments':
          return <PaymentsHistoryTab />;
        default:
          return <InternDashboardTab />;
      }
    }
  };

  const SidebarComponent = isAdmin ? AdminSidebar : InternSidebar;
  const HeaderComponent = isAdmin ? AdminHeader : InternHeader;

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarComponent
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <HeaderComponent
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Book className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginForm />;
};

// Export the app wrapped with AuthProvider
export default function LMSApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}