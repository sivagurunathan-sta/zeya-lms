import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { BookOpen, Award, Clock, TrendingUp, ArrowRight, Play } from 'lucide-react';
import StatsCard from '../../components/Analytics/StatsCard';
import EnrollmentProgress from '../../components/Internship/EnrollmentProgress';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import { useContentKeys } from '../../hooks/useContent';

const StudentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { data: contentItems = [] } = useContentKeys(['dashboard.welcomeSubtitle', 'ui.activeCoursesTitle', 'ui.viewAll']);
  const subtitle = (contentItems.find(i => i.key === 'dashboard.welcomeSubtitle')?.value) || 'Continue your learning journey and achieve your goals.';
  const activeCoursesTitle = (contentItems.find(i => i.key === 'ui.activeCoursesTitle')?.value) || 'Active Courses';
  const viewAllLabel = (contentItems.find(i => i.key === 'ui.viewAll')?.value) || 'View All';

  // Mock data - replace with real API calls
  const stats = {
    activeEnrollments: 2,
    completedCourses: 1,
    totalHoursLearned: 45,
    averageProgress: 75
  };

  const recentEnrollments = [
    {
      id: '1',
      internship: {
        id: '1',
        title: 'Full Stack Web Development',
        category: 'Programming',
        duration: 12
      },
      progressPercentage: 60,
      completedTasks: 6,
      totalTasks: 10,
      enrolledAt: new Date('2024-01-15'),
      status: 'ACTIVE',
      paymentStatus: 'COMPLETED',
      certificateIssued: false
    },
    {
      id: '2',
      internship: {
        id: '2',
        title: 'Digital Marketing Strategy',
        category: 'Marketing',
        duration: 8
      },
      progressPercentage: 25,
      completedTasks: 2,
      totalTasks: 8,
      enrolledAt: new Date('2024-02-01'),
      status: 'ACTIVE',
      paymentStatus: 'PENDING',
      certificateIssued: false
    }
  ];

  const upcomingTasks = [
    {
      id: '1',
      title: 'React State Management',
      courseName: 'Full Stack Web Development',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      estimatedHours: 4
    },
    {
      id: '2',
      title: 'API Integration',
      courseName: 'Full Stack Web Development',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      estimatedHours: 6
    }
  ];

  const dashboardStats = [
    {
      title: 'Active Courses',
      value: stats.activeEnrollments,
      icon: BookOpen,
      color: 'blue'
    },
    {
      title: 'Completed Courses',
      value: stats.completedCourses,
      icon: Award,
      color: 'green'
    },
    {
      title: 'Hours Learned',
      value: `${stats.totalHoursLearned}h`,
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'Average Progress',
      value: `${stats.averageProgress}%`,
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="opacity-90">
          {subtitle}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Courses */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{activeCoursesTitle}</h2>
            <Link to="/courses">
              <Button variant="outline" size="sm">
                {viewAllLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          {recentEnrollments.length > 0 ? (
            <div className="space-y-4">
              {recentEnrollments.map((enrollment) => (
                <EnrollmentProgress key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active courses</h3>
              <p className="text-gray-600 mb-4">
                Start your learning journey by enrolling in an internship program.
              </p>
              <Link to="/internships">
                <Button>Browse Internships</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Tasks */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
              
              {upcomingTasks.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600">{task.courseName}</p>
                      <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                        <span>Due: {task.dueDate.toLocaleDateString()}</span>
                        <span>{task.estimatedHours}h</span>
                      </div>
                    </div>
                  ))}
                  
                  <Link to="/courses" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No upcoming tasks</p>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/internships" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse Internships
                  </Button>
                </Link>
                <Link to="/certificates" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Award className="w-4 h-4 mr-2" />
                    My Certificates
                  </Button>
                </Link>
                <Link to="/profile" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Progress
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
