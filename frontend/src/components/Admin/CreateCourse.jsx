import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CreateCourse.css';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '499',
    image: null
  });
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState({
    title: '',
    description: '',
    materials: [],
    videos: []
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = (e) => {
    setFormData({
      ...formData,
      image: e.target.files[0]
    });
  };

  const handleTaskChange = (e) => {
    setCurrentTask({
      ...currentTask,
      [e.target.name]: e.target.value
    });
  };

  const handleMaterialUpload = (e) => {
    setCurrentTask({
      ...currentTask,
      materials: [...e.target.files]
    });
  };

  const handleVideoUpload = (e) => {
    setCurrentTask({
      ...currentTask,
      videos: [...e.target.files]
    });
  };

  const addTask = () => {
    if (currentTask.title && currentTask.description) {
      setTasks([...tasks, { ...currentTask, taskNumber: tasks.length + 1 }]);
      setCurrentTask({
        title: '',
        description: '',
        materials: [],
        videos: []
      });
    } else {
      alert('Please fill in task title and description');
    }
  };

  const removeTask = (index) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    setTasks(updatedTasks.map((task, i) => ({ ...task, taskNumber: i + 1 })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (tasks.length === 0) {
      alert('Please add at least one task');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('price', formData.price);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      // Upload course first
      const courseResponse = await axios.post(
        'http://localhost:5000/api/admin/courses',
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const courseId = courseResponse.data.course._id;

      // Upload tasks one by one
      for (const task of tasks) {
        const taskFormData = new FormData();
        taskFormData.append('courseId', courseId);
        taskFormData.append('taskNumber', task.taskNumber);
        taskFormData.append('title', task.title);
        taskFormData.append('description', task.description);

        task.materials.forEach(file => {
          taskFormData.append('materials', file);
        });

        task.videos.forEach(file => {
          taskFormData.append('videos', file);
        });

        await axios.post(
          'http://localhost:5000/api/admin/tasks',
          taskFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      alert('Course created successfully!');
      navigate('/admin/courses');
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-course">
      <div className="create-course-header">
        <h1>Create New Course</h1>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
      </div>

      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-section">
          <h2>Course Details</h2>
          
          <div className="form-group">
            <label>Course Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Full Stack Development Internship"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="4"
              placeholder="Describe what interns will learn..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration (Days) *</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                required
                min="1"
                placeholder="35"
              />
            </div>

            <div className="form-group">
              <label>Certificate Price (₹) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                placeholder="499"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Course Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Add Tasks</h2>
          
          <div className="task-input-section">
            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                name="title"
                value={currentTask.title}
                onChange={handleTaskChange}
                placeholder="e.g., Create HTML Structure"
              />
            </div>

            <div className="form-group">
              <label>Task Description *</label>
              <textarea
                name="description"
                value={currentTask.description}
                onChange={handleTaskChange}
                rows="3"
                placeholder="Describe what intern needs to do..."
              />
            </div>

            <div className="form-group">
              <label>Upload Materials (PDF, DOC, etc.)</label>
              <input
                type="file"
                multiple
                onChange={handleMaterialUpload}
                accept=".pdf,.doc,.docx,.txt"
              />
            </div>

            <div className="form-group">
              <label>Upload Videos (MP4, etc.)</label>
              <input
                type="file"
                multiple
                onChange={handleVideoUpload}
                accept="video/*"
              />
            </div>

            <button type="button" onClick={addTask} className="btn-add-task">
              + Add Task
            </button>
          </div>

          <div className="tasks-list">
            <h3>Tasks Added ({tasks.length})</h3>
            {tasks.map((task, index) => (
              <div key={index} className="task-item">
                <div className="task-info">
                  <strong>Task {task.taskNumber}:</strong> {task.title}
                  <p>{task.description}</p>
                  <small>
                    Materials: {task.materials.length} | Videos: {task.videos.length}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="btn-remove"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Creating Course...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;