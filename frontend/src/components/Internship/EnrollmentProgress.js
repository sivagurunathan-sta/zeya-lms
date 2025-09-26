import React from 'react';
import { Calendar, Clock, Award, TrendingUp } from 'lucide-react';
import ProgressBar from '../UI/ProgressBar';
import Badge from '../UI/Badge';

const EnrollmentProgress = ({ enrollment }) => {
  const {
    internship,
    progressPercentage,
    completedTasks,
    totalTasks,
    enrolledAt,
    status,
    paymentStatus,
    certificateIssued
  } = enrollment;

  const getStatusBadge = () => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="primary">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'SUSPENDED':
        return <Badge variant="warning">Suspended</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getPaymentBadge = () => {
    switch (paymentStatus) {
      case 'COMPLETED':
        return <Badge variant="success">Paid</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{internship.title}</h3>
          <p className="text-sm text-gray-600">{internship.category}</p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {getPaymentBadge()}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Course Progress</span>
          <span className="text-sm text-gray-500">
            {completedTasks}/{totalTasks} tasks completed
          </span>
        </div>
        <ProgressBar 
          progress={progressPercentage} 
          showPercentage={false}
          color={progressPercentage === 100 ? 'green' : 'blue'}
        />
        <div className="text-right mt-1">
          <span className="text-sm font-medium text-gray-900">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Enrolled</p>
            <p className="text-sm font-medium">
              {new Date(enrolledAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <p className="text-sm font-medium">{internship.duration} weeks</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Progress</p>
            <p className="text-sm font-medium">{Math.round(progressPercentage)}%</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Certificate</p>
            <p className="text-sm font-medium">
              {certificateIssued ? 'Issued' : 'Pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Certificate Status */}
      {progressPercentage === 100 && (
        <div className="border-t border-gray-200 pt-4">
          {certificateIssued ? (
            <div className="text-center">
              <div className="mb-2">
                <Award className="w-8 h-8 text-green-600 mx-auto" />
              </div>
              <p className="text-sm font-medium text-green-600">Certificate Available!</p>
              <p className="text-xs text-gray-500">You can download your certificate now</p>
            </div>
          ) : paymentStatus === 'COMPLETED' ? (
            <div className="text-center">
              <div className="mb-2">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto" />
              </div>
              <p className="text-sm font-medium text-yellow-600">Certificate Processing</p>
              <p className="text-xs text-gray-500">Your certificate will be ready soon</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-2">
                <Award className="w-8 h-8 text-blue-600 mx-auto" />
              </div>
              <p className="text-sm font-medium text-blue-600">Complete Payment</p>
              <p className="text-xs text-gray-500">Pay to unlock your certificate</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnrollmentProgress;