import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CourseView.css';

const CourseView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(false);
  const [githubLink, setGithubLink] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [courseRes, tasksRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/intern/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/intern/courses/${courseId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setCourse(courseRes.data.course);
      setTasks(tasksRes.data.tasks);
      
      // Find the first unlocked task
      const firstUnlocked = tasksRes.data.tasks.find(t => t.isUnlocked && !t.isCompleted);
      if (firstUnlocked) {
        setCurrentTask(firstUnlocked);
      } else if (tasksRes.data.tasks.length > 0) {
        // If no unlocked task, show the first task
        setCurrentTask(tasksRes.data.tasks[0]);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      alert('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const openSubmitModal = (task) => {
    setCurrentTask(task);
    setSubmitModal(true);
    setGithubLink('');
    setFiles([]);
  };

  const closeSubmitModal = () => {
    setSubmitModal(false);
    setGithubLink('');
    setFiles([]);
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!githubLink.trim()) {
      alert('Please provide GitHub repository link');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('taskId', currentTask._id);
      formData.append('courseId', courseId);
      formData.append('githubLink', githubLink);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      await axios.post(
        'http://localhost:5000/api/intern/submissions',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('Task submitted successfully! Admin will review it within 12 hours.');
      closeSubmitModal();
      fetchCourseData();
    } catch (error) {
      console.error('Error submitting task:', error);
      alert('Failed to submit task: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h2>Course not found</h2>
          <button onClick={() => navigate('/intern/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-view">
      <div className="course-header">
        <button onClick={() => navigate('/intern/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <div className="course-title-section">
          <h1>{course.name}</h1>
          <div className="course-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${course.progress || 0}%` }}
              ></div>
            </div>
            <span className="progress-text">{course.progress || 0}% Complete</span>
          </div>
        </div>
      </div>

      <div className="course-layout">
        <div className="tasks-sidebar">
          <h2>Tasks ({tasks.filter(t => t.isCompleted).length}/{tasks.length})</h2>
          <div className="tasks-list">
            {tasks.length === 0 ? (
              <p className="no-tasks">No tasks available</p>
            ) : (
              tasks.map(task => (
                <div
                  key={task._id}
                  className={`task-item ${task.isUnlocked ? 'unlocked' : 'locked'} ${task.isCompleted ? 'completed' : ''} ${currentTask?._id === task._id ? 'active' : ''}`}
                  onClick={() => task.isUnlocked && setCurrentTask(task)}
                >
                  <div className="task-number">
                    {task.isCompleted ? '✓' : task.isUnlocked ? task.taskNumber : '🔒'}
                  </div>
                  <div className="task-info">
                    <h4>Task {task.taskNumber}</h4>
                    <p>{task.title}</p>
                    {task.submissionStatus && (
                      <span className={`submission-status ${task.submissionStatus}`}>
                        {task.submissionStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="task-content">
          {currentTask ? (
            <>
              <div className="task-header">
                <h2>Task {currentTask.taskNumber}: {currentTask.title}</h2>
                {currentTask.isCompleted && (
                  <span className="completed-badge">✓ Completed</span>
                )}
              </div>

              <div className="task-description">
                <h3>📝 Description</h3>
                <p>{currentTask.description}</p>
              </div>
// ...existing code...
{currentTask.materials && currentTask.materials.length > 0 && (
  <div className="task-materials">
    <h3>📎 Study Materials</h3>
    <div className="materials-list">
      {currentTask.materials.map((material, idx) => (
        <a
          key={idx}
          href={`http://localhost:5000${material}`}
          target="_blank"
          rel="noopener noreferrer"
          className="material-link"
        >
          📄 Material {idx + 1}
        </a>
      ))}
    </div>
  </div>
)}
// ...existing code...

              {currentTask.videos && currentTask.videos.length > 0 && (
                <div className="task-videos">
                  <h3>🎥 Video Tutorials</h3>
                  <div className="videos-list">
                    {currentTask.videos.map((video, idx) => (
                      <video
                        key={idx}
                        controls
                        className="video-player"
                      >
                        <source src={`http://localhost:5000${video}`} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ))}
                  </div>
                </div>
              )}

              {currentTask.feedback && (
                <div className="task-feedback">
                  <h3>📝 Admin Feedback</h3>
                  <p>{currentTask.feedback}</p>
                </div>
              )}

              <div className="task-actions">
                {!currentTask.isUnlocked && (
                  <div className="locked-message">
                    🔒 This task is locked. Complete previous tasks to unlock.
                  </div>
                )}
                
                {currentTask.isUnlocked && !currentTask.isCompleted && (
                  <>
                    {currentTask.submissionStatus === 'pending' ? (
                      <div className="pending-message">
                        ⏳ Submission pending review. Please wait for admin approval (up to 12 hours).
                      </div>
                    ) : (
                      <button onClick={() => openSubmitModal(currentTask)} className="btn-submit">
                        {currentTask.submissionStatus === 'rejected' ? '🔄 Resubmit Task' : '📤 Submit Task'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="no-task-selected">
              <p>Select a task from the sidebar to view details</p>
            </div>
          )}
        </div>
      </div>

      {submitModal && (
        <div className="modal-overlay" onClick={closeSubmitModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Task {currentTask?.taskNumber}</h2>
              <button onClick={closeSubmitModal} className="btn-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>GitHub Repository Link *</label>
                <input
                  type="url"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  required
                />
              </div>

              <div className="form-group">
                <label>Upload Additional Files (Optional)</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                />
                {files.length > 0 && (
                  <small className="file-count">{files.length} file(s) selected</small>
                )}
              </div>

              <div className="submit-note">
                <p>⚠️ Note: Your submission will be reviewed by admin within 12 hours. Next task will unlock after approval.</p>
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={submitting} className="btn-submit-final">
                  {submitting ? 'Submitting...' : '📤 Submit Task'}
                </button>
                <button type="button" onClick={closeSubmitModal} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseView;