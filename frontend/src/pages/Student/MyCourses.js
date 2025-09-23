// src/pages/Student/MyCourses.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  BookOpen, 
  Clock, 
  Award, 
  Play, 
  CheckCircle,
  Search,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { internshipAPI } from '../../services/internshipAPI';
import EnrollmentProgress from '../../components/Internship/EnrollmentProgress';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import ProgressBar from '../../components/UI/ProgressBar';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatters } from '../../utils/formatters';

const MyCourses = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: enrollmentsData, isLoading, error } = useQuery(
    'my-enrollments',
    internshipAPI.getMyEnrollments,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Normalize possible shapes: axios {data: []}, direct [], or nested {data:{data:[]}}
  const enrollments = Array.isArray(enrollmentsData)
    ? enrollmentsData
    : Array.isArray(enrollmentsData?.data)
      ? enrollmentsData.data
      : Array.isArray(enrollmentsData?.data?.data)
        ? enrollmentsData.data.data
        : [];

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesStatus = statusFilter === 'all' || enrollment?.status === statusFilter;
    const title = enrollment?.internship?.title?.toLowerCase?.() || '';
    const category = enrollment?.internship?.category?.toLowerCase?.() || '';
    const matchesSearch = title.includes(searchTerm.toLowerCase()) || category.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'primary';
      case 'PAUSED':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getNextTask = (enrollment) => {
    const incompleteTasks = enrollment.tasks?.filter(task => !task.isCompleted) || [];
    return incompleteTasks.find(task => task.isUnlocked);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load courses</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">
            Track your progress and continue learning
          </p>
        </div>
        <Link to="/internships">
          <Button>
            <BookOpen className="w-4 h-4 mr-2" />
            Browse More Courses
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {enrollments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {enrollments.filter(e => e.status === 'ACTIVE').length}
                </div>
                <div className="text-sm text-gray-600">Active Courses</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {enrollments.filter(e => e.status === 'COMPLETED').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {enrollments.filter(e => e.certificateIssued).length}
                </div>
                <div className="text-sm text-gray-600">Certificates</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / enrollments.length) || 0}%
                </div>
                <div className="text-sm text-gray-600">Avg Progress</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-500">
            {filteredEnrollments.length} course{filteredEnrollments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Course List */}
      {filteredEnrollments.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No courses found' : 'No courses yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Start your learning journey by enrolling in an internship program'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Link to="/internships">
              <Button>Browse Internships</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEnrollments.map((enrollment) => (
            <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="primary" size="sm">
                      {enrollment?.internship?.category || 'General'}
                    </Badge>
                    <Badge variant={getStatusColor(enrollment?.status)} size="sm">
                      {enrollment?.status || 'ACTIVE'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {enrollment?.internship?.title || 'Course'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {(enrollment?.internship?.duration || 0)} weeks • Enrolled {formatters.relativeTime(enrollment?.enrolledAt || new Date())}
                  </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm text-gray-500">
                      {(enrollment?.completedTasks || 0)}/{(enrollment?.totalTasks || 0)} tasks
                    </span>
                  </div>
                  <ProgressBar
                    progress={enrollment?.progressPercentage || 0}
                    color={(enrollment?.progressPercentage || 0) === 100 ? 'green' : 'blue'}
                    showPercentage={false}
                  />
                  <div className="text-right mt-1">
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(enrollment?.progressPercentage || 0)}%
                    </span>
                  </div>
                </div>

                {/* Next Task */}
                {enrollment.status === 'ACTIVE' && (
                  <div className="mb-4">
                    {getNextTask(enrollment) ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Play className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Next Task</span>
                        </div>
                        <p className="text-sm text-blue-800">
                          {getNextTask(enrollment).title}
                        </p>
                      </div>
                    ) : enrollment.progressPercentage === 100 ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            Course Completed!
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <span className="text-sm text-gray-600">No available tasks</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Certificate Status */}
                {(enrollment?.progressPercentage || 0) === 100 && (
                  <div className="mb-4">
                    {enrollment?.certificateIssued ? (
                      <div className="flex items-center space-x-2 text-green-600 text-sm">
                        <Award className="w-4 h-4" />
                        <span>Certificate issued</span>
                      </div>
                    ) : enrollment?.paymentStatus === 'COMPLETED' ? (
                      <div className="flex items-center space-x-2 text-blue-600 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Certificate being processed</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-orange-600 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>Payment required for certificate</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <Link
                    to={`/courses/${enrollment?.id}/tasks`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      {enrollment?.status === 'COMPLETED' ? 'Review' : 'Continue'}
                    </Button>
                  </Link>

                  {(enrollment?.progressPercentage || 0) === 100 && !enrollment?.certificateIssued && enrollment?.paymentStatus !== 'COMPLETED' && (
                    <Link
                      to={`/payment/${enrollment?.id}`}
                      className="flex-1"
                    >
                      <Button className="w-full">
                        Get Certificate
                      </Button>
                    </Link>
                  )}

                  {enrollment?.certificateIssued && (
                    <Link
                      to="/certificates"
                      className="flex-1"
                    >
                      <Button className="w-full">
                        <Award className="w-4 h-4 mr-2" />
                        View Certificate
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
