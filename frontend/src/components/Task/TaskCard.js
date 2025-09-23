import React from 'react';
import { Lock, CheckCircle, Clock, Play, Eye, FileText } from 'lucide-react';
import Button from '../UI/Button';
import Badge from '../UI/Badge';

const TaskCard = ({ task, onStart, onViewSubmission }) => {
  const {
    // id,  // REMOVED - was unused
    title,
    description,
    taskOrder,
    estimatedHours,
    isUnlocked,
    isCompleted,
    submission,
    canSubmit
  } = task;

  const getStatusInfo = () => {
    if (isCompleted) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badge: { variant: 'success', text: 'Completed' }
      };
    }
    if (!isUnlocked) {
      return {
        icon: Lock,
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badge: { variant: 'default', text: 'Locked' }
      };
    }
    return {
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badge: { variant: 'primary', text: 'Available' }
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const getSubmissionStatusBadge = () => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'PENDING':
        return <Badge variant="warning" size="sm">Under Review</Badge>;
      case 'APPROVED':
        return <Badge variant="success" size="sm">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      case 'NEEDS_REVISION':
        return <Badge variant="warning" size="sm">Needs Revision</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${statusInfo.borderColor} p-6 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">Task {taskOrder}</span>
              <Badge variant={statusInfo.badge.variant} size="sm">
                {statusInfo.badge.text}
              </Badge>
              {getSubmissionStatusBadge()}
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{estimatedHours}h</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
      </div>

      {/* Submission Info */}
      {submission && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your Submission</span>
            <span className="text-xs text-gray-500">
              {new Date(submission.submittedAt).toLocaleDateString()}
            </span>
          </div>
          {submission.feedback && (
            <div className="text-sm text-gray-600">
              <strong>Feedback:</strong> {submission.feedback}
            </div>
          )}
          {submission.grade && (
            <div className="text-sm text-gray-600 mt-1">
              <strong>Grade:</strong> {submission.grade}/10
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {task.resources && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <FileText className="w-4 h-4" />
              <span>{Object.keys(task.resources).length} resources</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {submission && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSubmission(task)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          )}
          
          <Button
            onClick={() => onStart(task)}
            disabled={!isUnlocked}
            size="sm"
            variant={isCompleted ? 'outline' : 'primary'}
          >
            {isCompleted ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Review
              </>
            ) : !isUnlocked ? (
              <>
                <Lock className="w-4 h-4 mr-1" />
                Locked
              </>
            ) : canSubmit ? (
              <>
                <Play className="w-4 h-4 mr-1" />
                Start
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                View
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;