const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const {
  getDashboardStats,
  getAllStudents,
  getAllInternships,
  updateStudentStatus,
  getRevenueAnalytics,
  exportData
} = require('../controllers/adminController');

const router = express.Router();

// Dashboard stats
router.get('/dashboard', [auth, adminAuth], getDashboardStats);

// Student management
router.get('/students', [auth, adminAuth], getAllStudents);
router.put('/students/:id/status', [auth, adminAuth], updateStudentStatus);

// Internship management
router.get('/internships', [auth, adminAuth], getAllInternships);

// Analytics
router.get('/analytics/revenue', [auth, adminAuth], getRevenueAnalytics);

// Export data
router.get('/export/:type', [auth, adminAuth], exportData);

module.exports = router;