import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './InternDashboard.css';

const InternDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [userRes, coursesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/intern/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/intern/courses', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setUser(userRes.data.user);
      setEnrolledCourses(coursesRes.data.enrolledCourses);
      setAvailableCourses(coursesRes.data.availableCourses);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/intern/courses/${courseId}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Successfully enrolled in course!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert('Failed to enroll in course');
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="intern-dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome, {user?.name}! 👋</h1>
          <p>Track your progress and continue learning</p>
        </div>
        <div className="user-info">
          {user?.profilePicture && (
            <img src={user.profilePicture} alt={user.name} className="user-avatar" />
          )}
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-details">
            <h3>{enrolledCourses.length}</h3>
            <p>Enrolled Courses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-details">
            <h3>{enrolledCourses.reduce((acc, c) => acc + (c.completedTasks || 0), 0)}</h3>
            <p>Tasks Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-details">
            <h3>{user?.hasCertificate ? 'Yes' : 'No'}</h3>
            <p>Certificate</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-details">
            <h3>{user?.totalScore || 0}%</h3>
            <p>Overall Score</p>
          </div>
        </div>
      </div>

      <div className="courses-section">
        <h2>My Courses</h2>
        {enrolledCourses.length === 0 ? (
          <div className="no-courses">
            <p>You haven't enrolled in any courses yet</p>
          </div>
        ) : (
          <div className="courses-grid">
            {enrolledCourses.map(course => (
              <div key={course._id} className="course-card">
                <div className="course-image">
                  {course.image ? (
                    <img src={`http://localhost:5000${course.image}`} alt={course.name} />
                  ) : (
                    <div className="no-image">📚</div>
                  )}
                </div>
                <div className="course-content">
                  <h3>{course.name}</h3>
                  <p>{course.description}</p>
                  
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${course.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{course.progress || 0}% Complete</span>
                  </div>

                  <div className="course-meta">
                    <span>📅 {course.duration} days</span>
                    <span>✅ {course.completedTasks || 0}/{course.totalTasks || 0} tasks</span>
                  </div>

                  <button
                    onClick={() => navigate(`/intern/courses/${course._id}`)}
                    className="btn-continue"
                  >
                    Continue Learning →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="available-courses-section">
        <h2>Available Courses</h2>
        {availableCourses.length === 0 ? (
          <div className="no-courses">
            <p>No new courses available at the moment</p>
          </div>
        ) : (
          <div className="courses-grid">
            {availableCourses.map(course => (
              <div key={course._id} className="course-card available">
                <div className="course-image">
                  {course.image ? (
                    <img src={`http://localhost:5000${course.image}`} alt={course.name} />
                  ) : (
                    <div className="no-image">📚</div>
                  )}
                </div>
                <div className="course-content">
                  <h3>{course.name}</h3>
                  <p>{course.description}</p>
                  
                  <div className="course-meta">
                    <span>📅 {course.duration} days</span>
                    <span>💰 Certificate: ₹{course.price}</span>
                  </div>

                  <button
                    onClick={() => enrollInCourse(course._id)}
                    className="btn-enroll"
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternDashboard;