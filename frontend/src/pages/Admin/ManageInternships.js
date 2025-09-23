import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { adminAPI } from '../../services/adminAPI';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Pagination from '../../components/UI/Pagination';
import Modal from '../../components/UI/Modal';
import StatCard from '../../components/UI/StatCard';
import { useDebounce } from '../../hooks/useDebounce';
import { formatters } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ManageInternships = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: internshipsData, isLoading } = useQuery(
    ['admin-internships', currentPage, debouncedSearch, statusFilter],
    () => adminAPI.getInternships({
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

  const updateInternshipMutation = useMutation(
    ({ internshipId, data }) => adminAPI.updateInternship(internshipId, data),
    {
      onSuccess: () => {
        toast.success('Internship updated successfully');
        queryClient.invalidateQueries('admin-internships');
        setShowEditModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update internship');
      },
    }
  );

  const handleUpdateInternship = (data) => {
    updateInternshipMutation.mutate({
      internshipId: selectedInternship.id,
      data
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <PlayCircle className="w-4 h-4 text-green-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'PAUSED':
        return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'TERMINATED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const { internships = [], pagination = {}, stats = {} } = internshipsData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Internships
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage all student internship programs
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Internships"
          value={stats.total || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Programs"
          value={stats.active || 0}
          icon={PlayCircle}
          color="green"
        />
        <StatCard
          title="Completed"
          value={stats.completed || 0}
          icon={CheckCircle}
          color="purple"
        />
        <StatCard
          title="Avg. Completion Rate"
          value={`${stats.avgCompletionRate || 0}%`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search internships..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {pagination.total || 0} internships
            </span>
          </div>
        </div>
      </div>

      {/* Internships Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {internships.map((internship) => (
                <tr key={internship.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={`https://ui-avatars.com/api/?name=${internship.user?.name}&background=6366f1&color=fff`}
                        alt={internship.user?.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {internship.user?.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {internship.user?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Day</span>
                        <span className="text-gray-900 dark:text-white">
                          {internship.currentDay}/35
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(internship.currentDay / 35) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {internship.completedTasks} tasks completed
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {Math.round(internship.totalScore)}% avg
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {internship.skippedTasks} skipped
                      </div>
                      {internship.isEligibleForCert && (
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Cert eligible
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(internship.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(internship.status)}`}>
                        {internship.status}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatters.date(internship.startDate, 'short')}
                    </div>
                    {internship.endDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        to {formatters.date(internship.endDate, 'short')}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatters.relativeTime(internship.startDate)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedInternship(internship);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      
                      <div className="relative">
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Edit Internship Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Internship"
      >
        {selectedInternship && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleUpdateInternship({
                status: formData.get('status'),
                currentDay: parseInt(formData.get('currentDay')),
                totalScore: parseFloat(formData.get('totalScore'))
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student
                </label>
                <input
                  type="text"
                  value={selectedInternship.user?.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={selectedInternship.status}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">Paused</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Day
                </label>
                <input
                  type="number"
                  name="currentDay"
                  min="1"
                  max="35"
                  defaultValue={selectedInternship.currentDay}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Score
                </label>
                <input
                  type="number"
                  name="totalScore"
                  min="0"
                  max="100"
                  step="0.1"
                  defaultValue={selectedInternship.totalScore}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="text"
                  value={formatters.date(selectedInternship.startDate)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Completed Tasks
                </label>
                <input
                  type="text"
                  value={`${selectedInternship.completedTasks}/35`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateInternshipMutation.isLoading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ManageInternships;
