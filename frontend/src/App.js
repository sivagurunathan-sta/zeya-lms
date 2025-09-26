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

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = {
  post: async (endpoint, data, isFormData = false) => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data)
    });
    
    const result = await response.json();
    
    // Handle both success/error response formats
    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }
    
    return result;
  },
  
  get: async (endpoint) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }
    
    return result;
  },
  
  put: async (endpoint, data) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }
    
    return result;
  }
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setUser(null);
        localStorage.removeItem('userData');
      }
    }
    setLoading(false);
  }, []);
  
  const login = async (userId, password) => {
    try {
      const response = await api.post('/auth/login', { userId, password });
      
      // Handle the response structure from your backend
      const { data } = response;
      
      if (!data || !data.token || !data.user) {
        throw new Error('Invalid response format');
      }
      
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      setUser(data.user);
      
      return data.user;
    } catch (error) {
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

// Login Component
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ZEYA LMS</h1>
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
              User ID or Email
            </label>
            <input
              type="text"
              required
              value={formData.userId}
              onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your User ID or Email"
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
        </div>
      </AnimatedCard>
    </div>
  );
};

// Admin Dashboard Components
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
            <h1 className="text-xl font-bold">ZEYA LMS</h1>
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

// Admin Dashboard Content Components
const AdminDashboardTab = () => {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/admin/analytics');
        setAnalytics(response);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };
    
    fetchAnalytics();
  }, []);
  
  if (!analytics) return <div className="p-8">Loading...</div>;
  
  const statCards = [
    {
      title: 'Total Interns',
      value: analytics.overview.totalInterns,
      icon: Users,
      color: 'blue',
      trend: '+12%'
    },
    {
      title: 'Active Tasks',
      value: analytics.overview.totalTasks,
      icon: Book,
      color: 'green',
      trend: '+5%'
    },
    {
      title: 'Submissions',
      value: analytics.overview.totalSubmissions,
      icon: CheckCircle,
      color: 'purple',
      trend: '+23%'
    },
    {
      title: 'Certificates Issued',
      value: analytics.overview.totalCertificates,
      icon: Award,
      color: 'yellow',
      trend: '+8%'
    }
  ];
  
  return (
    <div className="p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <AnimatedCard key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <span className="text-sm text-green-600">{stat.trend}</span>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>
      
      {/* Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Reviews</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.pendingReviews}</p>
              <p className="text-sm text-gray-600">submissions awaiting review</p>
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Payments</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.pendingPayments}</p>
              <p className="text-sm text-gray-600">payments awaiting approval</p>
            </div>
          </div>
        </AnimatedCard>
      </div>
      
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
          <div className="space-y-3">
            {analytics.recentActivity.submissions.map((submission, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{submission.userId?.name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-600">Task {submission.taskId}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {analytics.recentActivity.payments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{payment.userId?.name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-600">₹{payment.amount} - {payment.type}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                  payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
};

const UsersManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'intern'
  });
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/create-user', newUser);
      if (response.error) {
        alert(response.error);
        return;
      }
      
      alert(`User created successfully!\nUser ID: ${response.user.userId}\nDefault Password: ${response.user.defaultPassword}`);
      setNewUser({ name: '', email: '', phone: '', role: 'intern' });
      setShowCreateForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    }
  };
  
  if (loading) return <div className="p-8">Loading users...</div>;
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New User
        </button>
      </div>
      
      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AnimatedCard className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New User</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="intern">Intern</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </AnimatedCard>
        </div>
      )}
      
      {/* Users Table */}
      <AnimatedCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedCard>
    </div>
  );
};

const TasksManagementTab = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    instructions: '',
    difficulty: 'medium',
    estimatedTime: '',
    points: 10
  });
  
  useEffect(() => {
    fetchTasks();
  }, []);
  
  const fetchTasks = async () => {
    try {
      const response = await api.get('/admin/tasks');
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(newTask).forEach(key => {
        formData.append(key, newTask[key]);
      });
      
      const response = await api.post('/admin/tasks', formData, true);
      if (response.error) {
        alert(response.error);
        return;
      }
      
      alert('Task created successfully!');
      setNewTask({
        title: '',
        description: '',
        instructions: '',
        difficulty: 'medium',
        estimatedTime: '',
        points: 10
      });
      setShowCreateForm(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task');
    }
  };
  
  if (loading) return <div className="p-8">Loading tasks...</div>;
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Task
        </button>
      </div>
      
      {/* Create Task Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <AnimatedCard className="w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Task</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  rows={4}
                  value={newTask.instructions}
                  onChange={(e) => setNewTask(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={newTask.difficulty}
                    onChange={(e) => setNewTask(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time</label>
                  <input
                    type="text"
                    value={newTask.estimatedTime}
                    onChange={(e) => setNewTask(prev => ({ ...prev, estimatedTime: e.target.value }))}
                    placeholder="e.g., 2-3 hours"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newTask.points}
                    onChange={(e) => setNewTask(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </AnimatedCard>
        </div>
      )}
      
      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task, index) => (
          <AnimatedCard key={index} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Task {task.taskId}: {task.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {task.description}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {task.difficulty}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{task.estimatedTime || 'No time estimate'}</span>
              <span>{task.points} points</span>
            </div>
            
            {task.resources && task.resources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Resources: {task.resources.length}</p>
                <div className="flex flex-wrap gap-1">
                  {task.resources.map((resource, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {resource.type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </AnimatedCard>
        ))}
      </div>
      
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No tasks created yet</p>
          <p className="text-gray-500">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
};

const SubmissionsReviewTab = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ show: false, submission: null });
  const [reviewData, setReviewData] = useState({ status: 'reviewed', score: '', feedback: '' });
  
  useEffect(() => {
    fetchSubmissions();
  }, []);
  
  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/admin/submissions');
      setSubmissions(response.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(
        `/admin/submissions/${reviewModal.submission._id}/review`,
        reviewData
      );
      
      if (response.error) {
        alert(response.error);
        return;
      }
      
      alert('Submission reviewed successfully!');
      setReviewModal({ show: false, submission: null });
      setReviewData({ status: 'reviewed', score: '', feedback: '' });
      fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing submission:', error);
      alert('Error reviewing submission');
    }
  };
  
  const openReviewModal = (submission) => {
    setReviewModal({ show: true, submission });
    setReviewData({
      status: submission.status === 'submitted' ? 'reviewed' : submission.status,
      score: submission.score || '',
      feedback: submission.feedback || ''
    });
  };
  
  if (loading) return <div className="p-8">Loading submissions...</div>;
  
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Submission Reviews</h2>
      
      {/* Review Modal */}
      {reviewModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <AnimatedCard className="w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Review Submission</h3>
              <button
                onClick={() => setReviewModal({ show: false, submission: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p><strong>Student:</strong> {reviewModal.submission.userId?.name || 'Unknown'}</p>
              <p><strong>Task:</strong> {reviewModal.submission.task?.title || `Task ${reviewModal.submission.taskId}`}</p>
              <p><strong>GitHub URL:</strong> 
                <a 
                  href={reviewModal.submission.githubUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 ml-2"
                >
                  <Github className="w-4 h-4 inline mr-1" />
                  View Repository
                </a>
              </p>
              <p><strong>Submitted:</strong> {new Date(reviewModal.submission.submittedAt).toLocaleString()}</p>
              {reviewModal.submission.isLate && (
                <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                  Late Submission
                </span>
              )}
            </div>
            
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={reviewData.status}
                  onChange={(e) => setReviewData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={reviewData.score}
                  onChange={(e) => setReviewData(prev => ({ ...prev, score: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  rows={4}
                  value={reviewData.feedback}
                  onChange={(e) => setReviewData(prev => ({ ...prev, feedback: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide feedback to the student..."
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setReviewModal({ show: false, submission: null })}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </AnimatedCard>
        </div>
      )}
      
      {/* Submissions Table */}
      <AnimatedCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.userId?.name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.userId?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Task {submission.taskId}
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.task?.title || 'Unknown Task'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                    {submission.isLate && (
                      <span className="block text-red-500 text-xs">Late</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                      submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      submission.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {submission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {submission.score !== null && submission.score !== undefined ? `${submission.score}/100` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <a
                      href={submission.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </a>
                    <button
                      onClick={() => openReviewModal(submission)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedCard>
      
      {submissions.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No submissions yet</p>
          <p className="text-gray-500">Submissions will appear here once students start submitting tasks</p>
        </div>
      )}
    </div>
  );
};

// Intern Dashboard Components
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
            <h1 className="text-xl font-bold">ZEYA LMS</h1>
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

// Intern Dashboard Content
const InternDashboardTab = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/intern/dashboard');
        setDashboardData(response);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, []);
  
  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!dashboardData) return <div className="p-8">Error loading dashboard</div>;
  
  const { progress, nextTask, recentSubmissions, certificate, canPurchaseCertificate } = dashboardData;
  
  return (
    <div className="p-8 space-y-8">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{progress.completedTasks}</p>
              <p className="text-sm text-blue-600">of {progress.totalTasks} total</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{progress.averageScore.toFixed(1)}%</p>
              <div className="w-full mt-2">
                <ProgressBar percentage={progress.averageScore} color="green" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Consistency</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{progress.consistencyScore.toFixed(1)}%</p>
              <div className="w-full mt-2">
                <ProgressBar percentage={progress.consistencyScore} color="yellow" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </AnimatedCard>
        
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{progress.completionPercentage.toFixed(1)}%</p>
              <div className="w-full mt-2">
                <ProgressBar percentage={progress.completionPercentage} color="blue" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-purple-100">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </AnimatedCard>
      </div>
      
      {/* Next Task and Certificate Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nextTask && (
          <AnimatedCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Task</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900">Task {nextTask.taskId}: {nextTask.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{nextTask.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  nextTask.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  nextTask.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {nextTask.difficulty}
                </span>
                <span className="text-gray-500">{nextTask.points} points</span>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Start Task
              </button>
            </div>
          </AnimatedCard>
        )}
        
        <AnimatedCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Status</h3>
          <div className="text-center">
            {certificate ? (
              <div className="space-y-3">
                <Award className="w-16 h-16 text-yellow-500 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Certificate Issued!</p>
                  <p className="text-sm text-gray-600">Certificate ID: {certificate.certificateId}</p>
                  <p className="text-sm text-gray-600">Final Score: {certificate.finalScore}%</p>
                </div>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
                  <Download className="w-4 h-4 inline mr-2" />
                  Download Certificate
                </button>
              </div>
            ) : canPurchaseCertificate ? (
              <div className="space-y-3">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Eligible for Certificate!</p>
                  <p className="text-sm text-gray-600">You've achieved the required 75% score</p>
                  <p className="text-sm text-gray-600">Purchase your certificate for ₹499</p>
                </div>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Purchase Certificate
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <AlertCircle className="w-16 h-16 text-orange-500 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Keep Going!</p>
                  <p className="text-sm text-gray-600">Complete more tasks to become eligible</p>
                  <p className="text-sm text-gray-600">Need 75% average score and 80% completion</p>
                </div>
              </div>
            )}
          </div>
        </AnimatedCard>
      </div>
      
      {/* Recent Submissions */}
      <AnimatedCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
        {recentSubmissions && recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((submission, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Task {submission.taskId}</p>
                  <p className="text-sm text-gray-600">
                    Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                  {submission.feedback && (
                    <p className="text-sm text-blue-600 mt-1">Feedback: {submission.feedback}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {submission.score !== null && submission.score !== undefined && (
                    <span className="text-lg font-semibold text-gray-900">{submission.score}%</span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                    submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    submission.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {submission.status}
                  </span>
                  <a
                    href={submission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No submissions yet</p>
            <p className="text-sm text-gray-500">Start with your first task!</p>
          </div>
        )}
      </AnimatedCard>
    </div>
  );
};

const InternTasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState({ show: false, task: null });
  const [githubUrl, setGithubUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    fetchTasks();
  }, []);
  
  const fetchTasks = async () => {
    try {
      const response = await api.get('/intern/tasks');
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await api.post('/intern/submit-task', {
        taskId: submitModal.task.taskId,
        githubUrl
      });
      
      if (response.error) {
        alert(response.error);
        return;
      }
      
      alert('Task submitted successfully!');
      setSubmitModal({ show: false, task: null });
      setGithubUrl('');
      fetchTasks();
    } catch (error) {
      console.error('Error submitting task:', error);
      alert('Error submitting task');
    } finally {
      setSubmitting(false);
    }
  };
  
  const openSubmitModal = (task) => {
    setSubmitModal({ show: true, task });
    setGithubUrl('');
  };
  
  if (loading) return <div className="p-8">Loading tasks...</div>;
  
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Your Tasks</h2>
      
      {/* Submit Modal */}
      {submitModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <AnimatedCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Submit Task</h3>
              <button
                onClick={() => setSubmitModal({ show: false, task: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{submitModal.task?.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{submitModal.task?.description}</p>
            </div>
            
            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  required
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Make sure your repository is public and contains the completed task
                </p>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitModal({ show: false, task: null })}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </AnimatedCard>
        </div>
      )}
      
      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task, index) => (
          <AnimatedCard key={index} className={`p-6 ${task.isLocked ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Task {task.taskId}: {task.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {task.difficulty}
                  </span>
                  {task.isLocked && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      🔒 Locked
                    </span>
                  )}
                  {task.isCompleted && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✅ Completed
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">{task.description}</p>
                
                {task.instructions && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                    <p className="text-blue-800 text-sm">{task.instructions}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>⏱️ {task.estimatedTime || 'No time estimate'}</span>
                  <span>🏆 {task.points} points</span>
                </div>
                
                {task.resources && task.resources.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Resources:</h4>
                    <div className="space-y-2">
                      {task.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={`${API_BASE_URL}${resource.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {resource.type === 'video' ? '🎥' : '📄'} {resource.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {task.submission && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Your Submission</p>
                        <p className="text-sm text-gray-600">
                          Submitted on {new Date(task.submission.submittedAt).toLocaleDateString()}
                        </p>
                        {task.submission.score !== null && task.submission.score !== undefined && (
                          <p className="text-sm font-medium text-green-600">
                            Score: {task.submission.score}%
                          </p>
                        )}
                        {task.submission.feedback && (
                          <p className="text-sm text-blue-600 mt-1">
                            Feedback: {task.submission.feedback}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                          task.submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          task.submission.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.submission.status}
                        </span>
                        <a
                          href={task.submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="ml-6">
                {!task.isLocked && !task.isCompleted && (
                  <button
                    onClick={() => openSubmitModal(task)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Task
                  </button>
                )}
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>
      
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No tasks available</p>
          <p className="text-gray-500">Check back later for new tasks</p>
        </div>
      )}
    </div>
  );
};

const CertificateTab = () => {
  const [certificateData, setCertificateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentProof, setPaymentProof] = useState(null);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    fetchCertificateData();
  }, []);
  
  const fetchCertificateData = async () => {
    try {
      const response = await api.get('/intern/certificate');
      setCertificateData(response);
    } catch (error) {
      console.error('Error fetching certificate data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentProof) {
      alert('Please upload payment proof');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('type', 'certificate');
      formData.append('amount', '499');
      formData.append('paymentProof', paymentProof);
      formData.append('upiTransactionId', upiTransactionId);
      
      const response = await api.post('/intern/payment/create', formData, true);
      
      if (response.error) {
        alert(response.error);
        return;
      }
      
      alert('Payment submitted successfully! It will be reviewed by admin.');
      setPaymentModal(false);
      setPaymentProof(null);
      setUpiTransactionId('');
      fetchCertificateData();
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Error submitting payment');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) return <div className="p-8">Loading certificate information...</div>;
  if (!certificateData) return <div className="p-8">Error loading certificate data</div>;
  
  const { certificate, progress, canPurchase } = certificateData;
  
  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Certificate</h2>
      
      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <AnimatedCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Purchase Certificate</h3>
              <button
                onClick={() => setPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* QR Code */}
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img 
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='white'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='.3em' font-family='monospace' font-size='14' fill='black'%3EQR CODE%0ASCAN TO PAY%0A₹499%3C/text%3E%3C/svg%3E"
                  alt="UPI QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                UPI ID: sivagurunathan874@oksbi
              </p>
              <p className="text-sm font-medium text-gray-900">Amount: ₹499</p>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI Transaction ID *
                </label>
                <input
                  type="text"
                  required
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value)}
                  placeholder="Enter transaction ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Screenshot *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setPaymentProof(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload screenshot of successful payment
                </p>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </AnimatedCard>
        </div>
      )}
      
      {/* Certificate Status */}
      <div className="max-w-2xl mx-auto">
        <AnimatedCard className="p-8 text-center">
          {certificate ? (
            // Certificate Issued
            <div className="space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Congratulations! 🎉
                </h3>
                <p className="text-lg text-gray-600">
                  Your certificate has been issued
                </p>
              </div>
              
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Certificate ID</p>
                    <p className="font-medium text-gray-900">{certificate.certificateId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Final Score</p>
                    <p className="font-medium text-gray-900">{certificate.finalScore}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Completion</p>
                    <p className="font-medium text-gray-900">{certificate.completionPercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Issued Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(certificate.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <button className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors">
                  <Download className="w-5 h-5 inline mr-2" />
                  Download Certificate
                </button>
                <br />
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  Verify Certificate Online
                </button>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Verification Code: {certificate.verificationCode}</p>
              </div>
            </div>
          ) : canPurchase ? (
            // Eligible for Certificate
            <div className="space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  You're Eligible! 🌟
                </h3>
                <p className="text-lg text-gray-600">
                  Purchase your completion certificate
                </p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Your Score</p>
                    <p className="font-medium text-green-900">{progress.averageScore.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Completion</p>
                    <p className="font-medium text-green-900">{progress.completionPercentage.toFixed(1)}%</p>
                  </div>
                </div>
                <p className="text-green-800 text-sm">
                  ✅ You've met all requirements for certification!
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="text-3xl font-bold text-gray-900">₹499</div>
                <button
                  onClick={() => setPaymentModal(true)}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
                >
                  <CreditCard className="w-5 h-5 inline mr-2" />
                  Purchase Certificate
                </button>
              </div>
            </div>
          ) : (
            // Not Eligible Yet
            <div className="space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Keep Working! 💪
                </h3>
                <p className="text-lg text-gray-600">
                  You're on your way to earning a certificate
                </p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-4">Requirements:</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Average Score (75% required)</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${progress.averageScore >= 75 ? 'text-green-600' : 'text-orange-600'}`}>
                        {progress.averageScore.toFixed(1)}%
                      </span>
                      {progress.averageScore >= 75 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-orange-600" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Completion (80% required)</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${progress.completionPercentage >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                        {progress.completionPercentage.toFixed(1)}%
                      </span>
                      {progress.completionPercentage >= 80 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-orange-600" />}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-600">Current Progress:</p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((progress.averageScore/75) * 50 + (progress.completionPercentage/80) * 50, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  );
};

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

// Additional Tabs (Placeholder components)
const PaymentsTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Management</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Payment management interface coming soon...</p>
    </AnimatedCard>
  </div>
);

const CertificatesTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Certificate Management</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Certificate management interface coming soon...</p>
    </AnimatedCard>
  </div>
);

const SettingsTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Settings interface coming soon...</p>
    </AnimatedCard>
  </div>
);

const ProgressTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Tracking</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Detailed progress tracking coming soon...</p>
    </AnimatedCard>
  </div>
);

const PaymentsHistoryTab = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h2>
    <AnimatedCard className="p-6">
      <p className="text-gray-600">Payment history interface coming soon...</p>
    </AnimatedCard>
  </div>
);

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