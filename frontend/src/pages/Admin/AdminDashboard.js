// src/pages/Admin/AdminDashboard.js
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  Award,
  TrendingUp,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';;
import { adminAPI } from '../../services/adminAPI';
import AnalyticsDashboard from '../../components/Analytics/Dashboard';
import StatsCard from '../../components/Analytics/StatsCard';
import Chart from '../../components/Analytics/Chart';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatters } from '../../utils/formatters';

const AdminDashboard = () => {
  const [period, setPeriod] = useState('30'); // days

  const { data: dashboardData, isLoading } = useQuery(
    ['admin-dashboard', period],
    () => adminAPI.getDashboard(period),
    {
      staleTime: 2 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    }
  );

  const { data: analyticsData } = useQuery(
    ['admin-analytics', period],
    () => adminAPI.getAnalytics(period),
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const {
    stats = {},
    recentSubmissions = [],
    recentPayments = [],
    recentEnrollments = [],
    alerts = []
  } = dashboardData?.data || {};

  const dashboardStats = [
    {
      title: 'Total Students',
      value: stats.totalStudents || 0,
      change: stats.studentsGrowth || '+0%',
      changeType: 'positive',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Courses',
      value: stats.activeCourses || 0,
      change: stats.coursesGrowth || '+0%',
      changeType: 'positive',
      icon: BookOpen,
      color: 'green'
    },
    {
      title: 'Monthly Revenue',
      value: formatters.currency(stats.monthlyRevenue || 0),
      change: stats.revenueGrowth || '+0%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'purple'
    },
    {
      title: 'Certificates Issued',
      value: stats.certificatesIssued || 0,
      change: stats.certificatesGrowth || '+0%',
      changeType: 'positive',
      icon: Award,
      color: 'orange'
    }
  ];

  const getSubmissionStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of platform performance and key metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-4 rounded-lg border ${
              alert.type === 'error' ? 'bg-red-50 border-red-200' :
              alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className={`w-5 h-5 ${
                    alert.type === 'error' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-900">{alert.title}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                </div>
                <Badge variant={getAlertColor(alert.type)} size="sm">
                  {alert.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Analytics */}
      {analyticsData?.data && (
        <AnalyticsDashboard data={analyticsData.data} />
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Submissions
              </h3>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            
            <div className="space-y-3">
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent submissions
                </div>
              ) : (
                recentSubmissions.slice(0, 5).map((submission) => (
                  <div key={submission.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getSubmissionStatusIcon(submission.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {submission.task.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        by {submission.user.name} • {formatters.relativeTime(submission.submittedAt)}
                      </div>
                    </div>
                    <Badge variant={
                      submission.status === 'APPROVED' ? 'success' :
                      submission.status === 'REJECTED' ? 'danger' : 'warning'
                    } size="sm">
                      {submission.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Recent Payments */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Payments
              </h3>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent payments
                </div>
              ) : (
                recentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {formatters.currency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.user.name} • {formatters.relativeTime(payment.createdAt)}
                      </div>
                    </div>
                    <Badge variant={getPaymentStatusColor(payment.status)} size="sm">
                      {payment.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Enrollments */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Enrollments
            </h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrolled
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No recent enrollments
                    </td>
                  </tr>
                ) : (
                  recentEnrollments.slice(0, 10).map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {enrollment.user.name.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {enrollment.user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {enrollment.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {enrollment.internship.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {enrollment.internship.category}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatters.relativeTime(enrollment.enrolledAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${enrollment.progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
{Math.round(enrollment.progressPercentage)}%
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={
                          enrollment.status === 'ACTIVE' ? 'success' :
                          enrollment.status === 'COMPLETED' ? 'primary' :
                          enrollment.status === 'PAUSED' ? 'warning' : 'default'
                        } size="sm">
                          {enrollment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <Users className="w-4 h-4 mr-2" />
              Manage Students
            </Button>
            <Button variant="outline" className="justify-start">
              <BookOpen className="w-4 h-4 mr-2" />
              Review Submissions
            </Button>
            <Button variant="outline" className="justify-start">
              <Award className="w-4 h-4 mr-2" />
              Issue Certificates
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;