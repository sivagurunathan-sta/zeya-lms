// ============================================
// FILE: frontend/src/pages/admin/UserManagement.jsx
// COMPLETE VERSION - ALL STYLES AND FUNCTIONALITY
// ============================================

import React, { useState, useEffect } from 'react';
import { adminUserAPI } from '../../services/api';

const UserManagement = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    revokedUsers: 0,
    chatEnabledUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  // Modal states
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bulkUserIds, setBulkUserIds] = useState('');

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [search, statusFilter, pagination.page]);

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminUserAPI.getAllUsers({
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: pagination.page,
        limit: pagination.limit
      });

      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      setError(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminUserAPI.getDashboardStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleRevokeAccess = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${userName}?`)) {
      return;
    }

    try {
      const response = await adminUserAPI.revokeAccess(userId);
      if (response.data.success) {
        alert('✅ Access revoked successfully');
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      alert('❌ Failed to revoke access: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRestoreAccess = async (userId, userName) => {
    if (!window.confirm(`Restore access for ${userName}?`)) {
      return;
    }

    try {
      const response = await adminUserAPI.restoreAccess(userId);
      if (response.data.success) {
        alert('✅ Access restored successfully');
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      alert('❌ Failed to restore access: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkUserIds.trim()) {
      alert('Please enter user IDs');
      return;
    }

    const userIdArray = bulkUserIds
      .split(/[\n,]/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (userIdArray.length === 0) {
      alert('No valid user IDs found');
      return;
    }

    try {
      const response = await adminUserAPI.bulkAddUsers({ userIds: userIdArray });
      
      if (response.data.success) {
        const { created, errors } = response.data.data;
        
        let message = `✅ Successfully created ${created.length} users`;
        if (errors.length > 0) {
          message += `\n\n⚠️ ${errors.length} errors:\n`;
          errors.forEach(err => {
            message += `- ${err.userId}: ${err.error}\n`;
          });
        }
        
        alert(message);
        setShowBulkAddModal(false);
        setBulkUserIds('');
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      alert('❌ Failed to add users: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await adminUserAPI.getUserProfile(userId);
      if (response.data.success) {
        setSelectedUser(response.data.data);
        setShowUserDetailModal(true);
      }
    } catch (error) {
      alert('Failed to fetch user details: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>👥 User Management</h1>
        <button
          onClick={() => setShowBulkAddModal(true)}
          style={styles.primaryButton}
        >
          ➕ Add Multiple Users
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatsCard 
          title="Total Users" 
          value={stats.totalUsers} 
          color="#3b82f6"
          icon="👥"
        />
        <StatsCard 
          title="Active Users" 
          value={stats.activeUsers} 
          color="#10b981"
          icon="✅"
        />
        <StatsCard 
          title="Revoked Users" 
          value={stats.revokedUsers} 
          color="#ef4444"
          icon="🚫"
        />
        <StatsCard 
          title="Chat Enabled" 
          value={stats.chatEnabledUsers} 
          color="#8b5cf6"
          icon="💬"
        />
      </div>

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="🔍 Search by name, email, or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="revoked">Revoked Only</option>
        </select>

        <button onClick={fetchUsers} style={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorAlert}>
          ❌ {error}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '48px', margin: '0' }}>📭</p>
          <h3>No users found</h3>
          <p>Try adjusting your filters or add new users</p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>User Info</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Enrollments</th>
                  <th style={styles.tableHeader}>Certificates</th>
                  <th style={styles.tableHeader}>Total Spent</th>
                  <th style={styles.tableHeader}>Chat</th>
                  <th style={styles.tableHeader}>Joined</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div>
                        <div style={styles.userName}>{user.name}</div>
                        <div style={styles.userEmail}>{user.email}</div>
                        <div style={styles.userId}>{user.userId}</div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: user.isActive ? '#d1fae5' : '#fee2e2',
                        color: user.isActive ? '#065f46' : '#991b1b'
                      }}>
                        {user.isActive ? '✅ Active' : '🚫 Revoked'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div>
                        <div style={styles.statValue}>{user.stats.totalEnrollments} Total</div>
                        <div style={styles.statLabel}>
                          {user.stats.coursesCompleted} Completed
                        </div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.statValue}>
                        {user.stats.certificatesEarned}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.statValue}>
                        ₹{user.stats.totalSpent.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.chatBadge,
                        backgroundColor: user.chatEnabled ? '#dbeafe' : '#f3f4f6',
                        color: user.chatEnabled ? '#1e40af' : '#6b7280'
                      }}>
                        {user.chatEnabled ? '💬 Enabled' : '🔒 Disabled'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleViewUser(user.id)}
                          style={{ ...styles.actionButton, backgroundColor: '#3b82f6' }}
                        >
                          👁️ View
                        </button>
                        {user.isActive ? (
                          <button
                            onClick={() => handleRevokeAccess(user.id, user.name)}
                            style={{ ...styles.actionButton, backgroundColor: '#ef4444' }}
                          >
                            🚫 Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreAccess(user.id, user.name)}
                            style={{ ...styles.actionButton, backgroundColor: '#10b981' }}
                          >
                            ✅ Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              style={{
                ...styles.paginationButton,
                opacity: pagination.page === 1 ? 0.5 : 1,
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            
            <span style={styles.paginationInfo}>
              Page {pagination.page} of {pagination.totalPages} 
              <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                ({pagination.total} total users)
              </span>
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              style={{
                ...styles.paginationButton,
                opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Bulk Add Modal */}
      {showBulkAddModal && (
        <Modal onClose={() => setShowBulkAddModal(false)} title="➕ Bulk Add Users">
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>
              Enter User IDs (one per line or comma-separated):
            </label>
            <textarea
              value={bulkUserIds}
              onChange={(e) => setBulkUserIds(e.target.value)}
              placeholder="INT2025001&#10;INT2025002&#10;INT2025003"
              style={styles.textarea}
              rows={10}
            />
            <p style={styles.helpText}>
              💡 Default password for each user will be their User ID in lowercase.
              <br />
              📧 Email will be generated as: userid@lms.com
            </p>
          </div>
          <div style={styles.modalActions}>
            <button onClick={() => setShowBulkAddModal(false)} style={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={handleBulkAdd} style={styles.primaryButton}>
              Add Users
            </button>
          </div>
        </Modal>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <Modal 
          onClose={() => setShowUserDetailModal(false)} 
          title={`👤 ${selectedUser.name}`}
          large
        >
          <UserDetailView user={selectedUser} />
        </Modal>
      )}
    </div>
  );
};

// ============================================
// CHILD COMPONENTS
// ============================================

// Stats Card Component
const StatsCard = ({ title, value, color, icon }) => (
  <div style={{
    ...styles.statsCard,
    borderLeft: `4px solid ${color}`
  }}>
    <div style={styles.statsCardHeader}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span style={{ fontSize: '14px', color: '#6b7280' }}>{title}</span>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '700', color, marginTop: '8px' }}>
      {value}
    </div>
  </div>
);

// Modal Component
const Modal = ({ onClose, title, children, large = false }) => (
  <div style={styles.modalOverlay} onClick={onClose}>
    <div 
      style={{
        ...styles.modalContent,
        maxWidth: large ? '900px' : '600px'
      }} 
      onClick={(e) => e.stopPropagation()}
    >
      <div style={styles.modalHeader}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{title}</h2>
        <button onClick={onClose} style={styles.modalCloseButton}>✕</button>
      </div>
      <div style={styles.modalBody}>
        {children}
      </div>
    </div>
  </div>
);

// User Detail View Component
const UserDetailView = ({ user }) => (
  <div style={{ fontSize: '14px' }}>
    <div style={styles.detailSection}>
      <h3 style={styles.detailSectionTitle}>📋 Basic Information</h3>
      <div style={styles.detailGrid}>
        <DetailItem label="User ID" value={user.userId} />
        <DetailItem label="Email" value={user.email} />
        <DetailItem label="Phone" value={user.phone || 'Not provided'} />
        <DetailItem label="Status" value={user.isActive ? '✅ Active' : '🚫 Revoked'} />
        <DetailItem label="Joined" value={new Date(user.joinedDate).toLocaleDateString()} />
        <DetailItem label="Last Active" value={new Date(user.lastActive).toLocaleDateString()} />
      </div>
    </div>

    <div style={styles.detailSection}>
      <h3 style={styles.detailSectionTitle}>📊 Statistics</h3>
      <div style={styles.detailGrid}>
        <DetailItem label="Total Enrollments" value={user.stats.totalEnrollments} />
        <DetailItem label="Courses Completed" value={user.stats.coursesCompleted} />
        <DetailItem label="Certificates Earned" value={user.stats.certificatesEarned} />
        <DetailItem label="Total Spent" value={`₹${user.stats.totalSpent}`} />
        <DetailItem label="Average Score" value={`${user.stats.averageScore.toFixed(1)}%`} />
        <DetailItem label="Chat Enabled" value={user.chatEnabled ? 'Yes' : 'No'} />
      </div>
    </div>

    {user.enrollments && user.enrollments.length > 0 && (
      <div style={styles.detailSection}>
        <h3 style={styles.detailSectionTitle}>📚 Current Enrollments</h3>
        {user.enrollments.map((enrollment, index) => (
          <div key={index} style={styles.enrollmentCard}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{enrollment.courseName}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Progress: {enrollment.progress}% • Day {enrollment.currentDay}/{enrollment.totalTasks}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Detail Item Component
const DetailItem = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontWeight: '500' }}>{value}</div>
  </div>
);

// ============================================
// STYLES - COMPLETE
// ============================================

const styles = {
  container: {
    padding: '30px',
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: '#f9fafb',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0',
    color: '#111827'
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statsCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statsCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  filtersContainer: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    minWidth: '150px'
  },
  refreshButton: {
    padding: '12px 20px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  errorAlert: {
    padding: '16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fecaca'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeaderRow: {
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb'
  },
  tableHeader: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s'
  },
  tableCell: {
    padding: '16px',
    fontSize: '14px',
    color: '#111827'
  },
  userName: {
    fontWeight: '600',
    marginBottom: '4px',
    color: '#111827'
  },
  userEmail: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '2px'
  },
  userId: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  chatBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block'
  },
  statValue: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginTop: '24px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  paginationButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  paginationInfo: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalCloseButton: {
    fontSize: '24px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  modalBody: {
    padding: '24px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px'
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  helpText: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
    lineHeight: '1.6'
  },
  detailSection: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  detailSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  enrollmentCard: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb'
  }
};

export default UserManagement;