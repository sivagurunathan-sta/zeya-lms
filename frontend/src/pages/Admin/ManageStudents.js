// src/pages/Admin/ManageStudents.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Ban, 
  CheckCircle,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
  Download
} from 'lucide-react';
import { adminAPI } from '../../services/adminAPI';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Pagination from '../../components/UI/Pagination';
import Modal from '../../components/UI/Modal';
import Badge from '../../components/UI/Badge';
import StatCard from '../../components/UI/StatCard';
import Dropdown, { DropdownItem } from '../../components/UI/Dropdown';
import { useDebounce } from '../../hooks/useDebounce';
import { formatters } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ManageStudents = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: studentsData, isLoading } = useQuery(
    ['admin-students', currentPage, debouncedSearch, statusFilter],
    () => adminAPI.getStudents({
      page: currentPage,
      limit: 20,
      search: debouncedSearch,
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  const updateStudentMutation = useMutation(
    ({ studentId, data }) => adminAPI.updateStudent(studentId, data),
    {
      onSuccess: () => {
        toast.success('Student updated successfully');
        queryClient.invalidateQueries('admin-students');
        setShowStudentModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update student');
      },
    }
  );

  const suspendStudentMutation = useMutation(
    adminAPI.suspendStudent,
    {
      onSuccess: () => {
        toast.success('Student suspended successfully');
        queryClient.invalidateQueries('admin-students');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to suspend student');
      },
    }
  );

  const handleStudentAction = (action, studentId) => {
    switch (action) {
      case 'suspend':
        if (window.confirm('Are you sure you want to suspend this student?')) {
          suspendStudentMutation.mutate(studentId);
        }
        break;
      case 'activate':
        updateStudentMutation.mutate({
          studentId,
          data: { status: 'ACTIVE' }
        });
        break;
      case 'view':
        const student = studentsData?.data?.students?.find(s => s.id === studentId);
        setSelectedStudent(student);
        setShowStudentModal(true);
        break;
      default:
        break;
    }
  };

  const exportStudents = () => {
    // Implement CSV export functionality
    toast.info('Export functionality coming soon!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'danger';
      case 'INACTIVE':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const { students = [], pagination = {}, stats = {} } = studentsData?.data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
          <p className="text-gray-600 mt-1">
            View and manage all registered students
          </p>
        </div>
        
        <Button variant="outline" onClick={exportStudents}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.total || 0}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Active Students"
          value={stats.active || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="New This Month"
          value={stats.newThisMonth || 0}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Avg Completion"
          value={`${stats.avgCompletion || 0}%`}
          icon={Award}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
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
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Total: {pagination.total || 0} students
            </span>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-4">
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {student.email}
                          </span>
                          {student.phone && (
                            <span className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {student.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {student.enrollments?.length || 0} courses
                      </div>
                      <div className="text-xs text-gray-500">
                        {student.completedCourses || 0} completed
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(student.averageProgress || 0)}% avg
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${student.averageProgress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <Badge variant={getStatusColor(student.status)} size="sm">
                      {student.status}
                    </Badge>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatters.date(student.createdAt, 'short')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatters.relativeTime(student.createdAt)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    <Dropdown
                      trigger={
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      }
                    >
                      <DropdownItem onClick={() => handleStudentAction('view', student.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownItem>
                      {student.status === 'ACTIVE' ? (
                        <DropdownItem onClick={() => handleStudentAction('suspend', student.id)}>
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend
                        </DropdownItem>
                      ) : (
                        <DropdownItem onClick={() => handleStudentAction('activate', student.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activate
                        </DropdownItem>
                      )}
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      <Modal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        title="Student Details"
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center space-x-4 pb-4 border-b">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {selectedStudent.firstName?.charAt(0)}{selectedStudent.lastName?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <p className="text-gray-600">{selectedStudent.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={getStatusColor(selectedStudent.status)} size="sm">
                    {selectedStudent.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Joined {formatters.relativeTime(selectedStudent.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedStudent.email}</span>
                  </div>
                  {selectedStudent.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedStudent.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Joined {formatters.date(selectedStudent.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Learning Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Enrollments:</span>
                    <span className="font-medium">{selectedStudent.enrollments?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed Courses:</span>
                    <span className="font-medium">{selectedStudent.completedCourses || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Progress:</span>
                    <span className="font-medium">{Math.round(selectedStudent.averageProgress || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Certificates:</span>
                    <span className="font-medium">{selectedStudent.certificates || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollments */}
            {selectedStudent.enrollments && selectedStudent.enrollments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Course Enrollments</h4>
                <div className="space-y-3">
                  {selectedStudent.enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          {enrollment.internship.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {enrollment.internship.category} • Enrolled {formatters.relativeTime(enrollment.enrolledAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          enrollment.status === 'ACTIVE' ? 'success' :
                          enrollment.status === 'COMPLETED' ? 'primary' : 'warning'
                        } size="sm">
                          {enrollment.status}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">
                          {Math.round(enrollment.progressPercentage)}% complete
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowStudentModal(false)}
              >
                Close
              </Button>
              {selectedStudent.status === 'ACTIVE' ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    handleStudentAction('suspend', selectedStudent.id);
                    setShowStudentModal(false);
                  }}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend Student
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    handleStudentAction('activate', selectedStudent.id);
                    setShowStudentModal(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate Student
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageStudents;