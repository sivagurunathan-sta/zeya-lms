import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, CheckCircle, Lock, Clock } from 'lucide-react';
import { fetchTasksForEnrollment } from '../../store/slices/taskSlice';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentEnrollmentTasks, loading } = useSelector((state) => state.tasks);

  useEffect(() => {
    dispatch(fetchTasksForEnrollment(id));
  }, [dispatch, id]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentEnrollmentTasks?.enrollment?.internship?.title || 'Course Details'}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Course Tasks</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {currentEnrollmentTasks?.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-4 ${
                      task.isUnlocked ? 'cursor-pointer hover:shadow-md' : 'opacity-50'
                    } transition-shadow`}
                    onClick={() => task.isUnlocked && navigate(`/tasks/${task.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {task.isCompleted ? (
                            <CheckCircle className="text-green-500" size={20} />
                          ) : task.isUnlocked ? (
                            <Clock className="text-blue-500" size={20} />
                          ) : (
                            <Lock className="text-gray-400" size={20} />
                          )}
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>Task {task.taskOrder}</span>
                          <span>•</span>
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded ${
                          task.isCompleted
                            ? 'bg-green-100 text-green-800'
                            : task.isUnlocked
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {task.isCompleted ? 'Completed' : task.isUnlocked ? 'In Progress' : 'Locked'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CourseDetails;