// src/routes/admin-enhanced.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(authorizeAdmin);

// ===========================
// BULK USER OPERATIONS
// ===========================

// Bulk add users
router.post('/users/bulk-add', async (req, res) => {
  try {
    const { users } = req.body; // Array of user objects

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Users array is required'
      });
    }

    const createdUsers = [];
    const errors = [];

    for (const userData of users) {
      try {
        const { userId, name, email, password } = userData;

        // Check if user already exists
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { userId }
            ]
          }
        });

        if (existing) {
          errors.push({ email, error: 'User already exists' });
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password || userId.toLowerCase(), 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            userId,
            name,
            email,
            role: 'INTERN',
            passwordHash: hashedPassword,
            isActive: true
          }
        });

        createdUsers.push(user);

      } catch (error) {
        errors.push({ email: userData.email, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Created ${createdUsers.length} users`,
      data: {
        created: createdUsers,
        errors
      }
    });

  } catch (error) {
    console.error('Bulk add users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk add users',
      error: error.message
    });
  }
});

// ===========================
// CERTIFICATE MANAGEMENT
// ===========================

// Enable certificate session for intern
router.post('/certificates/enable-session/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        intern: { select: { name: true, email: true } },
        internship: { select: { title: true } }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (!enrollment.certificateEligible) {
      return res.status(400).json({
        success: false,
        message: 'Intern is not eligible for certificate'
      });
    }

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        certificateSessionEnabled: true,
        certificateSessionEnabledAt: new Date()
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: enrollment.internId,
        title: 'Certificate Session Enabled',
        message: 'Your certificate is being prepared. You will be notified when it is ready.',
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Certificate session enabled'
    });

  } catch (error) {
    console.error('Enable certificate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable certificate session',
      error: error.message
    });
  }
});

// Upload certificate
router.post('/certificates/upload', async (req, res) => {
  try {
    const { enrollmentId, certificateUrl, certificateNumber } = req.body;

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        certificateUrl,
        certificateNumber,
        certificatePurchased: true,
        certificateIssuedAt: new Date()
      },
      include: {
        intern: { select: { name: true } },
        internship: { select: { title: true } }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: enrollment.internId,
        title: 'Certificate Ready!',
        message: `Your certificate for "${enrollment.internship.title}" is now available for download.`,
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: enrollment
    });

  } catch (error) {
    console.error('Upload certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload certificate',
      error: error.message
    });
  }
});

// ===========================
// CHAT PERMISSIONS
// ===========================

// Enable chat for user
router.post('/chat/enable/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const permission = await prisma.chatPermission.upsert({
      where: { userId },
      update: {
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      },
      create: {
        userId,
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Chat Access Enabled',
        message: 'You now have access to the chat feature. Connect with admins and other interns.',
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Chat enabled for user',
      data: permission
    });

  } catch (error) {
    console.error('Enable chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable chat',
      error: error.message
    });
  }
});

// Disable chat for user
router.post('/chat/disable/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    await prisma.chatPermission.update({
      where: { userId },
      data: {
        isEnabled: false
      }
    });

    res.json({
      success: true,
      message: 'Chat disabled for user'
    });

  } catch (error) {
    console.error('Disable chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable chat',
      error: error.message
    });
  }
});

// ===========================
// ANALYTICS & REPORTS
// ===========================

// Get comprehensive analytics
router.get('/analytics/comprehensive', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [
      totalUsers,
      activeEnrollments,
      completedInternships,
      totalRevenue,
      pendingReviews
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'INTERN' } }),
      prisma.enrollment.count({ where: { isCompleted: false } }),
      prisma.enrollment.count({ where: { isCompleted: true } }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      }),
      prisma.submission.count({ where: { status: 'PENDING' } })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers
        },
        enrollments: {
          active: activeEnrollments,
          completed: completedInternships
        },
        revenue: {
          total: totalRevenue._sum.amount || 0
        },
        pending: {
          reviews: pendingReviews
        }
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// ===========================
// AUDIT LOGS
// ===========================

// Create audit log
router.post('/audit-log', async (req, res) => {
  try {
    const { action, details, ipAddress } = req.body;

    const log = await prisma.auditLog.create({
      data: {
        action,
        userId: req.user.id,
        details,
        ipAddress
      }
    });

    res.status(201).json({
      success: true,
      data: log
    });

  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create audit log',
      error: error.message
    });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

module.exports = router;