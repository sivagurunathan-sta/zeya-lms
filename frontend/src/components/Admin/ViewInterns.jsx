import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ViewInterns.css';

const ViewInterns = () => {
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [filteredInterns, setFilteredInterns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterInterns();
  }, [searchTerm, filterCourse, interns]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [internsRes, coursesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/interns', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/admin/courses', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setInterns(internsRes.data.interns);
      setCourses(coursesRes.data.courses);
      setFilteredInterns(internsRes.data.interns);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInterns = () => {
    let filtered = interns;

    if (searchTerm) {
      filtered = filtered.filter(intern =>
        intern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intern.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCourse !== 'all') {
      filtered = filtered.filter(intern =>
        intern.enrolledCourses?.some(course => course._id === filterCourse)
      );
    }

    setFilteredInterns(filtered);
  };

  if (loading) {
    return <div className="loading">Loading interns...</div>;
  }

  return (
    <div className="view-interns">
      <div className="interns-header">
        <h1>All Interns</h1>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Courses</option>
          {courses.map(course => (
            <option key={course._id} value={course._id}>{course.name}</option>
          ))}
        </select>
      </div>

      <div className="interns-stats">
        <div className="stat-box">
          <h3>{filteredInterns.length}</h3>
          <p>Total Interns</p>
        </div>
        <div className="stat-box">
          <h3>{filteredInterns.filter(i => i.hasCertificate).length}</h3>
          <p>With Certificate</p>
        </div>
        <div className="stat-box">
          <h3>{filteredInterns.filter(i => i.enrolledCourses?.length > 0).length}</h3>
          <p>Enrolled</p>
        </div>
      </div>

      {filteredInterns.length === 0 ? (
        <div className="no-interns">
          <p>No interns found</p>
        </div>
      ) : (
        <div className="interns-table-container">
          <table className="interns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Enrolled Courses</th>
                <th>Progress</th>
                <th>Certificate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterns.map(intern => (
                <tr key={intern._id}>
                  <td>
                    <div className="intern-name">
                      {intern.profilePicture && (
                        <img src={intern.profilePicture} alt={intern.name} className="intern-avatar" />
                      )}
                      {intern.name}
                    </div>
                  </td>
                  <td>{intern.email}</td>
                  <td>
                    {intern.enrolledCourses?.length || 0} course(s)
                  </td>
                  <td>
                    <div className="progress-cell">
                      {intern.enrolledCourses?.map(course => (
                        <div key={course._id} className="course-progress">
                          <small>{course.name}</small>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${course.progress || 0}%` }}
                            ></div>
                          </div>
                          <span>{course.progress || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`certificate-badge ${intern.hasCertificate ? 'yes' : 'no'}`}>
                      {intern.hasCertificate ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/interns/${intern._id}`)}
                      className="btn-view-details"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewInterns;