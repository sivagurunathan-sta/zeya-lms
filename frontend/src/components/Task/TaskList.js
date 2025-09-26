import React from 'react';
import TaskCard from './TaskCard';
import LoadingSpinner from '../UI/LoadingSpinner';

const TaskList = ({ tasks, loading, onTaskStart, onViewSubmission }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-gray-200 animate-pulse rounded-lg h-32"></div>
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks available</h3>
          <p className="text-gray-600">Tasks will appear here once you enroll in a course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStart={onTaskStart}
          onViewSubmission={onViewSubmission}
        />
      ))}
    </div>
  );
};

export default TaskList;