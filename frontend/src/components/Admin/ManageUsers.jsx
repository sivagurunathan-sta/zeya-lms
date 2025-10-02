import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ManageUsers.css';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingIntern, setEditingIntern] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    password: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/interns/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterns(response.data.interns);
    } catch (error) {
      console.error('Error fetching interns:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openAddModal = () => {
    setEditingIntern(null);
    setFormData({
      name: '',
      userId: '',
      password: '',
      email: ''
    });
    setShowModal(true);
  };

  const openEditModal = (intern) => {
    setEditingIntern(intern);
    setFormData({
      name: intern.name,
      userId: intern.userId,
      password: '',
      email: intern.email
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIntern(null);
    setFormData({
      name: '',
      userId: '',
      password: '',
      email: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (editingIntern) {
        // Update existing intern
        await axios.put(
          `http://localhost:5000/api/admin/interns/${editingIntern._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Intern updated successfully!');
      } else {
        // Create new intern
        await axios.post(
          'http://localhost:5000/api/admin/interns/create',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Intern account created successfully!');
      }

      closeModal();
      fetchInterns();
    } catch (error) {
      console.error('Error saving intern:', error);
      alert('Failed to save intern: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteIntern = async (internId) => {
    if (!window.confirm('Are you sure you want to delete this intern account?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/interns/${internId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Intern deleted successfully!');
      fetchInterns();
    } catch (error) {
      console.error('Error deleting intern:', error);
      alert('Failed to delete intern');
    }
  };

  const toggleInternStatus = async (internId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/admin/interns/${internId}/status`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchInterns();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="manage-users">
      <div className="users-header">
        <h1>Manage Intern Accounts</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
            ← Back
          </button>
          <button onClick={openAddModal} className="btn-add">
            + Add New Intern
          </button>
        </div>
      </div>

      <div className="users-stats">
        <div className="stat-box">
          <h3>{interns.length}</h3>
          <p>Total Interns</p>
        </div>
        <div className="stat-box">
          <h3>{interns.filter(i => i.isActive).length}</h3>
          <p>Active Accounts</p>
        </div>
        <div className="stat-box">
          <h3>{interns.filter(i => !i.isActive).length}</h3>
          <p>Inactive Accounts</p>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>User ID</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {interns.map(intern => (
              <tr key={intern._id}>
                <td>{intern.name}</td>
                <td><code>{intern.userId}</code></td>
                <td>{intern.email}</td>
                <td>
                  <button
                    onClick={() => toggleInternStatus(intern._id, intern.isActive)}
                    className={`status-badge ${intern.isActive ? 'active' : 'inactive'}`}
                  >
                    {intern.isActive ? '✓ Active' : '✗ Inactive'}
                  </button>
                </td>
                <td>{new Date(intern.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => openEditModal(intern)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => deleteIntern(intern._id)} className="btn-delete">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingIntern ? 'Edit Intern Account' : 'Create New Intern Account'}</h2>
              <button onClick={closeModal} className="btn-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter intern name"
                  required
                />
              </div>

              <div className="form-group">
                <label>User ID * (For Login)</label>
                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  placeholder="e.g., INTERN001"
                  required
                  disabled={editingIntern !== null}
                />
                {editingIntern && (
                  <small>User ID cannot be changed</small>
                )}
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="intern@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password * {editingIntern && '(Leave blank to keep current)'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required={!editingIntern}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? 'Saving...' : editingIntern ? 'Update Intern' : 'Create Intern'}
                </button>
                <button type="button" onClick={closeModal} className="btn-cancel">
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

export default ManageUsers;