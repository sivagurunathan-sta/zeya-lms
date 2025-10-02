// backend/src/routes/admin-users.js - COMPLETE USER MANAGEMENT API
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

let prisma;
try {
  prisma = require('../config/database').prisma;
} catch (e) {
  prisma = null;
}

const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '../../data');
const usersFile = path.join(dataDir, 'users.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

const readUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf-8') || '[]'); } catch { return []; }
};

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(authorizeAdmin);

// Configure multer for certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/certificates');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// ==================== GET ALL USERS WITH COMPLETE DETAILS ====================
router.get('/users', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!prisma) {
      // file fallback
      const allUsers = readUsers().filter(u => u.role === 'INTERN');
      let filtered = allUsers;
      if (status && status !== 'all') filtered = filtered.filter(u => u.isActive === (status === 'active'));
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.userId || '').toLowerCase().includes(q));
      }
      const total = filtered.length;
      const usersPage = filtered.slice(skip, skip + parseInt(limit));

      const enriched = usersPage.map(u => ({
        id: u.id,
        userId: u.userId,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        enrollments: [],
        payments: [],
        chatPermission: null,
        _count: { enrollments: 0, submissions: 0, payments: 0, notifications: 0 }
      }));

      return res.json({ success: true, data: { users: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } } });
    }

    const where = {
      role: 'INTERN',
      ...(status && status !== 'all' && {
        isActive: status === 'active'
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { userId: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          enrollments: {
            include: {
              internship: {
                select: { title: true, coverImage: true }
              },
              submissions: {
                where: { status: 'APPROVED' }
              }
            }
          },
          payments: {
            select: {
              amount: true,
              paymentStatus: true,
              paymentType: true,
              createdAt: true,
              transactionId: true
            }
          },
          chatPermission: true,
          _count: {
            select: {
              enrollments: true,
              submissions: true,
              payments: true,
              notifications: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Enrich user data with computed fields
    const enrichedUsers = users.map(user => {
      const completedCourses = user.enrollments.filter(e => e.isCompleted).length;
      const totalSpent = user.payments
        .filter(p => p.paymentStatus === 'VERIFIED')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        ...user,
        status: user.isActive ? 'active' : 'revoked',
        lastActive: user.updatedAt,
        chatEnabled: user.chatPermission?.isEnabled || false,
        certificateSubmitted: user.chatPermission?.isEnabled || false,
        stats: {
          totalEnrollments: user._count.enrollments,
          coursesCompleted: completedCourses,
          certificatesEarned: user.enrollments.filter(e => e.certificatePurchased).length,
          totalSpent,
          averageScore: user.enrollments.length > 0
            ? user.enrollments.reduce((sum, e) => sum + (e.finalScore || 0), 0) / user.enrollments.length
            : 0,
          currentStreak: 0 // Calculate based on daily activity
        }
      };
    });

    res.json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// ==================== GET SINGLE USER COMPLETE PROFILE ====================
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: {
            internship: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                durationDays: true
              }
            },
            submissions: {
              include: {
                task: {
                  select: {
                    taskNumber: true,
                    title: true,
                    points: true
                  }
                }
              },
              orderBy: { submissionDate: 'desc' }
            }
          }
        },
        payments: {
          include: {
            internship: {
              select: { title: true }
            },
            paidTask: {
              select: { title: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        chatPermission: true,
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format response with all details
    const formattedUser = {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone || 'Not provided',
      location: 'Mumbai, Maharashtra', // Add to schema if needed
      status: user.isActive ? 'active' : 'revoked',
      isActive: user.isActive,
      joinedDate: user.createdAt,
      lastActive: user.updatedAt,
      chatEnabled: user.chatPermission?.isEnabled || false,
      certificateSubmitted: user.chatPermission?.isEnabled || false,
      
      enrollments: user.enrollments.map(enrollment => ({
        id: enrollment.id,
        courseName: enrollment.internship.title,
        status: enrollment.isCompleted ? 'completed' : 'in_progress',
        progress: enrollment.finalScore || 0,
        startDate: enrollment.enrollmentDate,
        completedDate: enrollment.completionDate,
        tasksCompleted: enrollment.submissions.filter(s => s.status === 'APPROVED').length,
        totalTasks: enrollment.internship.durationDays,
        currentDay: enrollment.submissions.length
      })),
      
      completedCourses: user.enrollments
        .filter(e => e.isCompleted)
        .map(e => ({
          id: e.id,
          name: e.internship.title,
          completedDate: e.completionDate,
          score: e.finalScore || 0,
          certificateIssued: e.certificatePurchased
        })),
      
      certificates: user.enrollments
        .filter(e => e.certificatePurchased)
        .map(e => ({
          id: e.id,
          courseName: e.internship.title,
          issueDate: e.certificateIssuedAt,
          certificateNumber: e.certificateNumber,
          downloadUrl: e.certificateUrl
        })),
      
      payments: user.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        type: p.paymentType,
        status: p.paymentStatus.toLowerCase(),
        date: p.createdAt,
        transactionId: p.transactionId || p.verifiedTransactionId
      })),
      
      submissions: user.enrollments.flatMap(e =>
        e.submissions.slice(0, 5).map(s => ({
          id: s.id,
          taskNumber: s.task.taskNumber,
          taskName: s.task.title,
          status: s.status.toLowerCase(),
          submittedDate: s.submissionDate,
          score: s.score,
          feedback: s.adminFeedback
        }))
      ),
      
      stats: {
        totalEnrollments: user.enrollments.length,
        coursesCompleted: user.enrollments.filter(e => e.isCompleted).length,
        certificatesEarned: user.enrollments.filter(e => e.certificatePurchased).length,
        totalSpent: user.payments
          .filter(p => p.paymentStatus === 'VERIFIED')
          .reduce((sum, p) => sum + p.amount, 0),
        averageScore: user.enrollments.length > 0
          ? user.enrollments.reduce((sum, e) => sum + (e.finalScore || 0), 0) / user.enrollments.length
          : 0,
        currentStreak: 0
      }
    };

    res.json({
      success: true,
      data: formattedUser
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

// ==================== BULK ADD USERS ====================

// ==================== BULK GENERATE USERS (auto-generate IDs + passwords) ====================
router.post('/users/bulk-generate', async (req, res) => {
  try {
    const { count = 10, prefix = 'INT', role = 'INTERN', passwordLength = 8 } = req.body;

    const created = [];
    const errors = [];

    const generatePassword = (len) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
      let pass = '';
      for (let i = 0; i < len; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
    };

    const padNumber = (num, size) => {
      let s = String(num);
      while (s.length < size) s = '0' + s;
      return s;
    };

    let attempts = 0;
    let createdCount = 0;
    // We will generate sequential numeric suffixes to avoid infinite loops
    let sequence = 1;

    while (createdCount < count && attempts < count * 10) {
      attempts++;
      const candidateId = `${prefix}${padNumber(sequence, 6)}`;
      sequence++;

      // Ensure uniqueness
      const exists = await prisma.user.findUnique({ where: { userId: candidateId } });
      if (exists) continue;

      const plainPassword = generatePassword(passwordLength);
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      try {
        const user = await prisma.user.create({
          data: {
            userId: candidateId,
            name: `User ${candidateId}`,
            email: `${candidateId.toLowerCase()}@lms.com`,
            role: role || 'INTERN',
            passwordHash: hashedPassword,
            isActive: true
          }
        });

        // Create welcome notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to LMS!',
            message: `Your account has been created. Use User ID: ${candidateId} and password: ${plainPassword} to login.`,
            type: 'INFO'
          }
        });

        created.push({ userId: candidateId, email: `${candidateId.toLowerCase()}@lms.com`, name: `User ${candidateId}`, password: plainPassword });
        createdCount++;

      } catch (err) {
        errors.push({ userId: candidateId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Created ${created.length} users`,
      data: created,
      errors
    });

  } catch (error) {
    console.error('Bulk generate users error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate users', error: error.message });
  }
});
router.post('/users/bulk-add', async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    const createdUsers = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const trimmedId = userId.trim();
        if (!trimmedId) continue;

        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { userId: trimmedId }
        });

        if (existing) {
          errors.push({ userId: trimmedId, error: 'User already exists' });
          continue;
        }

        // Generate email from userId
        const email = `${trimmedId.toLowerCase()}@lms.com`;
        const name = `User ${trimmedId}`;

        // Hash default password
        const hashedPassword = await bcrypt.hash(trimmedId.toLowerCase(), 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            userId: trimmedId,
            name,
            email,
            role: 'INTERN',
            passwordHash: hashedPassword,
            isActive: true
          }
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to LMS!',
            message: `Your account has been created. Use User ID: ${trimmedId} and password: ${trimmedId.toLowerCase()} to login.`,
            type: 'INFO'
          }
        });

        createdUsers.push(user);

      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Created ${createdUsers.length} users successfully`,
      data: {
        created: createdUsers.map(u => ({
          id: u.id,
          userId: u.userId,
          email: u.email,
          name: u.name
        })),
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

// ==================== UPDATE USER (EDIT) ====================
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, location } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        // Add phone and location fields to your schema if needed
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        userId: req.user.id,
        details: `Updated user ${user.userId}: ${user.name}`,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// ==================== REVOKE USER ACCESS ====================
router.post('/users/:userId/revoke', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account Access Revoked',
        message: 'Your LMS access has been revoked. Please contact admin for more information.',
        type: 'ERROR'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_REVOKED',
        userId: req.user.id,
        details: `Revoked access for user ${user.userId}: ${user.name}`,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'User access revoked successfully',
      data: user
    });

  } catch (error) {
    console.error('Revoke user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke user access',
      error: error.message
    });
  }
});

// ==================== RESTORE USER ACCESS ====================
router.post('/users/:userId/restore', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account Access Restored',
        message: 'Your LMS access has been restored. You can now login and continue your courses.',
        type: 'SUCCESS'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_RESTORED',
        userId: req.user.id,
        details: `Restored access for user ${user.userId}: ${user.name}`,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'User access restored successfully',
      data: user
    });

  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore user access',
      error: error.message
    });
  }
});

// ==================== VERIFY CERTIFICATE & ENABLE CHAT ====================
router.post('/users/:userId/verify-certificate', upload.single('certificate'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved } = req.body;

    if (approved === 'true') {
      // Enable chat permission
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
          title: '🎉 Chat Access Enabled!',
          message: 'Your internship certificate has been verified. You now have access to private chat with admin.',
          type: 'SUCCESS'
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'CERTIFICATE_VERIFIED',
          userId: req.user.id,
          details: `Verified certificate and enabled chat for user ${userId}`,
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Certificate verified and chat enabled',
        data: permission
      });
    } else {
      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          title: 'Certificate Verification Failed',
          message: 'Your certificate verification failed. Please resubmit a valid internship certificate.',
          type: 'WARNING'
        }
      });

      res.json({
        success: true,
        message: 'Certificate rejected'
      });
    }

  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
});

// ==================== GET USER DASHBOARD STATS ====================
router.get('/dashboard/stats', async (req, res) => {
  try {
    if (!prisma) {
      const users = readUsers().filter(u => u.role === 'INTERN');
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.isActive).length;
      const revokedUsers = users.filter(u => !u.isActive).length;
      const chatEnabledUsers = 0;
      const totalEnrollments = 0;
      const completedCourses = 0;
      const totalRevenue = 0;

      return res.json({ success: true, data: { totalUsers, activeUsers, revokedUsers, chatEnabledUsers, totalEnrollments, completedCourses, totalRevenue } });
    }

    const [
      totalUsers,
      activeUsers,
      revokedUsers,
      chatEnabledUsers,
      totalEnrollments,
      completedCourses,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'INTERN' } }),
      prisma.user.count({ where: { role: 'INTERN', isActive: true } }),
      prisma.user.count({ where: { role: 'INTERN', isActive: false } }),
      prisma.chatPermission.count({ where: { isEnabled: true } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { isCompleted: true } }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        revokedUsers,
        chatEnabledUsers,
        totalEnrollments,
        completedCourses,
        totalRevenue: totalRevenue._sum.amount || 0
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

module.exports = router;
