import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInterns: 0,
    activeCourses: 0,
    pendingSubmissions: 0,
    certificatesIssued: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.stats);
      setRecentActivity(response.data.recentActivity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={() => navigate('/admin/courses/create')} className="btn-primary">
          Create New Course
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalInterns}</h3>
            <p>Total Interns</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{stats.activeCourses}</h3>
            <p>Active Courses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.pendingSubmissions}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <h3>{stats.certificatesIssued}</h3>
            <p>Certificates Issued</p>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={() => navigate('/admin/courses')} className="action-btn">
          Manage Courses
        </button>
        <button onClick={() => navigate('/admin/interns')} className="action-btn">
          View All Interns
        </button>
        <button onClick={() => navigate('/admin/submissions')} className="action-btn">
          Review Submissions
        </button>
        <button onClick={() => navigate('/admin/certificates')} className="action-btn">
          Manage Certificates
        </button>
      </div>

      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.length === 0 ? (
            <p className="no-activity">No recent activity</p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-time">{new Date(activity.timestamp).toLocaleString()}</span>
                <span className="activity-desc">{activity.description}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;