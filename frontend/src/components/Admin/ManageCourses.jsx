import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ManageCourses.css';

const ManageCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseStatus = async (courseId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/admin/courses/${courseId}/status`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCourses();
    } catch (error) {
      console.error('Error updating course status:', error);
    }
  };

  const deleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/admin/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCourses();
        alert('Course deleted successfully');
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }

  return (
    <div className="manage-courses">
      <div className="courses-header">
        <h1>Manage Courses</h1>
        <button onClick={() => navigate('/admin/courses/create')} className="btn-create">
          + Create New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="no-courses">
          <p>No courses available</p>
          <button onClick={() => navigate('/admin/courses/create')} className="btn-create">
            Create Your First Course
          </button>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course._id} className="course-card">
              <div className="course-image">
                {course.image ? (
                  <img src={`http://localhost:5000${course.image}`} alt={course.name} />
                ) : (
                  <div className="no-image">📚</div>
                )}
                <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>
                  {course.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="course-info">
                <h3>{course.name}</h3>
                <p>{course.description}</p>
                
                <div className="course-meta">
                  <span>📅 {course.duration} days</span>
                  <span>💰 ₹{course.price}</span>
                  <span>👥 {course.enrolledInterns?.length || 0} interns</span>
                </div>

                <div className="course-actions">
                  <button 
                    onClick={() => navigate(`/admin/courses/${course._id}`)}
                    className="btn-view"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => navigate(`/admin/courses/${course._id}/edit`)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleCourseStatus(course._id, course.isActive)}
                    className={`btn-toggle ${course.isActive ? 'deactivate' : 'activate'}`}
                  >
                    {course.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => deleteCourse(course._id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageCourses;