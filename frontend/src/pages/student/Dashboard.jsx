import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Clock, LogOut } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { fetchMyEnrollments } from '../../store/slices/internshipSlice';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { myEnrollments, loading } = useSelector((state) => state.internships);

  useEffect(() => {
    dispatch(fetchMyEnrollments());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const stats = [
    { name: 'Enrolled Courses', value: myEnrollments?.length || '0', icon: BookOpen, color: 'bg-blue-500' },
    { name: 'Completed Tasks', value: '15', icon: Award, color: 'bg-green-500' },
    { name: 'Pending Tasks', value: '8', icon: Clock, color: 'bg-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.firstName || 'Student'}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Courses */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Enrollments</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : myEnrollments?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/courses/${enrollment.id}`)}
                  >
                    <h3 className="font-semibold text-gray-900">{enrollment.internship?.title || 'Course'}</h3>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{enrollment.progressPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${enrollment.progressPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                      <span>{enrollment.completedTasks || 0}/{enrollment.totalTasks || 0} tasks</span>
                      <span className={`px-2 py-1 rounded ${
                        enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {enrollment.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No enrollments yet. Start learning today!</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;