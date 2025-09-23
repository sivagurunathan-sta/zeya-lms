// src/pages/Student/TaskView.js
import React, { useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  Play, 
  FileText,
  ExternalLink,
  Send,
  Award
} from 'lucide-react';
import { taskAPI } from '../../services/taskAPI';
import TaskCard from '../../components/Task/TaskCard';
import TaskSubmission from '../../components/Task/TaskSubmission';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import ProgressBar from '../../components/UI/ProgressBar';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import { formatters } from '../../utils/formatters';
import toast from 'react-hot-toast';

const TaskView = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const { data: tasksData, isLoading } = useQuery(
    ['tasks', enrollmentId],
    () => taskAPI.getTasksForEnrollment(enrollmentId),
    {
      enabled: !!enrollmentId,
      staleTime: 5 * 60 * 1000,
    }
  );

  const submitTaskMutation = useMutation(
    ({ taskId, data }) => taskAPI.submitTask(taskId, data),
    {
      onSuccess: () => {
        toast.success('Task submitted successfully! 🎯');
        queryClient.invalidateQueries(['tasks', enrollmentId]);
        setShowSubmissionModal(false);
        setSelectedTask(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to submit task');
      },
    }
  );

  const handleTaskStart = (task) => {
    setSelectedTask(task);
    if (task.isCompleted || task.submission) {
      setShowTaskDetail(true);
    } else {
      setShowSubmissionModal(true);
    }
  };

  const handleTaskSubmit = (taskId, submissionData) => {
    submitTaskMutation.mutate({ taskId, data: submissionData });
  };

  const handleViewSubmission = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!tasksData?.data) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load tasks</div>
        <Button onClick={() => navigate('/courses')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </div>
    );
  }

  const { enrollment, tasks } = tasksData.data;
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const availableTasks = tasks.filter(task => task.isUnlocked && !task.isCompleted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/courses')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </div>

      {/* Course Overview */}
      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="primary" size="sm">
                  {enrollment.internship.category}
                </Badge>
                <Badge variant="success" size="sm">
                  {enrollment.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {enrollment.internship.title}
              </h1>
              <p className="text-gray-600">
                {enrollment.internship.duration} weeks • Enrolled {formatters.relativeTime(enrollment.enrolledAt)}
              </p>
            </div>
            
            {enrollment.progressPercentage === 100 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <Award className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-600">Course Complete!</p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Course Progress</span>
              <span className="text-sm text-gray-500">
                {completedTasks}/{tasks.length} tasks completed
              </span>
            </div>
            <ProgressBar 
              progress={enrollment.progressPercentage} 
              color={enrollment.progressPercentage === 100 ? 'green' : 'blue'}
              showPercentage={false}
            />
            <div className="text-right mt-1">
              <span className="text-sm font-medium text-gray-900">
                {Math.round(enrollment.progressPercentage)}%
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{completedTasks}</div>
              <div className="text-sm text-blue-800">Completed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{availableTasks}</div>
              <div className="text-sm text-green-800">Available</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(enrollment.averageScore || 0)}%
              </div>
              <div className="text-sm text-purple-800">Avg Score</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {enrollment.daysRemaining || 0}
              </div>
              <div className="text-sm text-orange-800">Days Left</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tasks</h2>
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={handleTaskStart}
              onViewSubmission={handleViewSubmission}
            />
          ))}
        </div>
      </div>

      {/* Task Submission Modal */}
      <TaskSubmission
        isOpen={showSubmissionModal}
        onClose={() => {
          setShowSubmissionModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onSubmit={handleTaskSubmit}
        loading={submitTaskMutation.isLoading}
      />

      {/* Task Detail Modal */}
      <Modal
        isOpen={showTaskDetail}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
        }}
        title={selectedTask?.title}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Task Info */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Badge variant="primary" size="sm">
                  Task {selectedTask.taskOrder}
                </Badge>
                {selectedTask.isCompleted && (
                  <Badge variant="success" size="sm">
                    Completed
                  </Badge>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedTask.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedTask.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Estimated Time:</span>
                  <span className="ml-2 font-medium">{selectedTask.estimatedHours}h</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium">
                    {selectedTask.isCompleted ? 'Completed' : selectedTask.isUnlocked ? 'Available' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resources */}
            {selectedTask.resources && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Resources</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedTask.resources.videos && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Videos:</span>
                      <ul className="mt-1 space-y-1">
                        {selectedTask.resources.videos.map((video, index) => (
                          <li key={index}>
                            <a 
                              href={video} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Video {index + 1}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedTask.resources.documents && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Documents:</span>
                      <ul className="mt-1 space-y-1">
                        {selectedTask.resources.documents.map((doc, index) => (
                          <li key={index}>
                            <a 
                              href={doc} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Document {index + 1}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submission */}
            {selectedTask.submission && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Your Submission</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Submitted:</span>
                    <span className="text-sm text-gray-600">
                      {formatters.date(selectedTask.submission.submittedAt, 'datetime')}
                    </span>
                  </div>
                  
                  {selectedTask.submission.githubRepoUrl && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Repository:</span>
                      <a 
                        href={selectedTask.submission.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline text-sm"
                      >
                        View on GitHub
                        <ExternalLink className="w-3 h-3 ml-1 inline" />
                      </a>
                    </div>
                  )}

                  {selectedTask.submission.submissionText && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Notes:</span>
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                        {selectedTask.submission.submissionText}
                      </p>
                    </div>
                  )}

                  {selectedTask.submission.feedback && (
                    <div className="border-t pt-3">
                      <span className="text-sm font-medium text-gray-700">Feedback:</span>
                      <p className="mt-1 text-sm text-gray-600">
                        {selectedTask.submission.feedback}
                      </p>
                      {selectedTask.submission.grade && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Grade:</span>
                          <span className="ml-2 text-sm font-semibold text-green-600">
                            {selectedTask.submission.grade}/10
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowTaskDetail(false)}
              >
                Close
              </Button>
              
              {!selectedTask.isCompleted && selectedTask.isUnlocked && (
                <Button
                  onClick={() => {
                    setShowTaskDetail(false);
                    setShowSubmissionModal(true);
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Task
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskView;