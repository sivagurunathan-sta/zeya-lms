// routes/admin.js - COMPLETE ADMIN MANAGEMENT SYSTEM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');
const { generatePaymentQR, generateUserId, createAuditLog } = require('../utils/helpers');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(auth);
router.use(adminOnly);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/task-files/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ==========================
// DASHBOARD & ANALYTICS
// ==========================

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalInterns,
      activeInterns,
      totalInternships,
      activeInternships,
      totalEnrollments,
      completedEnrollments,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      pendingPayments,
      verifiedPayments,
      totalRevenue,
      pendingCertificates,
      issuedCertificates,
      pendingValidations,
      activeChatRooms,
      totalPrivateTasks
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'INTERN' } }),
      prisma.user.count({ where: { role: 'INTERN', isActive: true } }),
      prisma.internship.count(),
      prisma.internship.count({ where: { isActive: true } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { isCompleted: true } }),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.submission.count({ where: { status: 'APPROVED' } }),
      prisma.submission.count({ where: { status: 'REJECTED' } }),
      prisma.payment.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.payment.count({ where: { paymentStatus: 'VERIFIED' } }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      }),
      prisma.certificateSession.count({ where: { status: 'PENDING_UPLOAD' } }),
      prisma.enrollment.count({ where: { certificatePurchased: true } }),
      prisma.certificateValidation.count({ where: { status: 'PENDING' } }),
      prisma.chatRoom.count({ where: { isActive: true } }),
      prisma.privateTask.count()
    ]);

    // Recent activity
    const recentSubmissions = await prisma.submission.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        intern: { select: { name: true, userId: true } },
        task: { select: { title: true, taskNumber: true } }
      }
    });

    const recentPayments = await prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        intern: { select: { name: true, userId: true } }
      }
    });

    // Statistics trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEnrollments = await prisma.enrollment.count({
      where: { enrollmentDate: { gte: sevenDaysAgo } }
    });

    const recentCompletions = await prisma.enrollment.count({
      where: { 
        completionDate: { gte: sevenDaysAgo },
        isCompleted: true
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          users: {
            totalInterns,
            activeInterns,
            inactiveInterns: totalInterns - activeInterns
          },
          internships: {
            total: totalInternships,
            active: activeInternships
          },
          enrollments: {
            total: totalEnrollments,
            completed: completedEnrollments,
            inProgress: totalEnrollments - completedEnrollments,
            recentEnrollments,
            recentCompletions
          },
          submissions: {
            pending: pendingSubmissions,
            approved: approvedSubmissions,
            rejected: rejectedSubmissions,
            total: pendingSubmissions + approvedSubmissions + rejectedSubmissions
          },
          payments: {
            pending: pendingPayments,
            verified: verifiedPayments,
            totalRevenue: totalRevenue._sum.amount || 0
          },
          certificates: {
            pendingSessions: pendingCertificates,
            issued: issuedCertificates,
            pendingValidations
          },
          chat: {
            activeRooms: activeChatRooms,
            totalPrivateTasks
          }
        },
        recentActivity: {
          submissions: recentSubmissions,
          payments: recentPayments
        }
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// USER MANAGEMENT
// ==========================

// Get all users with filtering
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } }
      ];
    }

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
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              payments: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user full profile
router.get('/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            internship: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                durationDays: true,
                certificatePrice: true
              }
            },
            submissions: {
              include: {
                task: {
                  select: {
                    id: true,
                    taskNumber: true,
                    title: true,
                    points: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        payments: {
          include: {
            internship: { select: { title: true } },
            paidTask: { select: { title: true } },
            verifier: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        chatPermission: true,
        certificateValidations: {
          orderBy: { submittedAt: 'desc' }
        },
        assignedPrivateTasks: {
          include: {
            assignedBy: { select: { name: true } },
            submission: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate statistics
    const totalEnrollments = user.enrollments.length;
    const completedCourses = user.enrollments.filter(e => e.isCompleted).length;
    const certificates = user.enrollments.filter(e => e.certificatePurchased).length;
    const totalSpent = user.payments
      .filter(p => p.paymentStatus === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount, 0);

    // Task statistics
    const taskStats = {
      total: 0,
      completed: 0,
      pending: 0,
      rejected: 0
    };

    user.enrollments.forEach(enrollment => {
      enrollment.submissions.forEach(submission => {
        taskStats.total++;
        if (submission.status === 'APPROVED') taskStats.completed++;
        else if (submission.status === 'REJECTED') taskStats.rejected++;
        else taskStats.pending++;
      });
    });

    // Calculate average score
    const totalScore = user.enrollments.reduce((sum, enrollment) => {
      const enrollmentScore = enrollment.submissions.reduce((s, sub) => s + (sub.score || 0), 0);
      return sum + enrollmentScore;
    }, 0);
    const averageScore = taskStats.total > 0 ? Math.round(totalScore / taskStats.total) : 0;

    const profileData = {
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        chatEnabled: user.chatPermission?.isEnabled || false
      },
      statistics: {
        totalEnrollments,
        completedCourses,
        inProgressCourses: totalEnrollments - completedCourses,
        certificates,
        totalSpent,
        taskStats,
        averageScore,
        privateTasks: {
          total: user.assignedPrivateTasks.length,
          completed: user.assignedPrivateTasks.filter(t => t.status === 'COMPLETED').length,
          pending: user.assignedPrivateTasks.filter(t => t.status === 'ASSIGNED').length
        }
      },
      enrollments: user.enrollments,
      payments: user.payments,
      notifications: user.notifications,
      certificateValidations: user.certificateValidations,
      privateTasks: user.assignedPrivateTasks
    };

    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add single user
router.post('/users/add', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate user ID and temporary password
    const userId = await generateUserId();
    const tempPassword = userId.toLowerCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        userId,
        name,
        email: email.toLowerCase(),
        role: 'INTERN',
        passwordHash: hashedPassword,
        isActive: true
      }
    });

    // Send welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to LMS',
        message: `Your account has been created. Login ID: ${userId}, Password: ${tempPassword}. Please change your password after first login.`,
        type: 'INFO'
      }
    });

    // Audit log
    await createAuditLog('USER_CREATED', req.user.id, {
      targetUserId: user.id,
      userName: name,
      email
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          email: user.email
        },
        credentials: {
          userId: userId,
          temporaryPassword: tempPassword
        }
      }
    });

  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk add users
router.post('/users/bulk-add', async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Users array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const userData of users) {
      try {
        const { name, email } = userData;

        if (!name || !email) {
          errors.push({ userData, error: 'Name and email required' });
          continue;
        }

        // Check if exists
        const existing = await prisma.user.findFirst({
          where: { email: email.toLowerCase() }
        });

        if (existing) {
          errors.push({ userData, error: 'Email already exists' });
          continue;
        }

        // Create user
        const userId = await generateUserId();
        const tempPassword = userId.toLowerCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = await prisma.user.create({
          data: {
            userId,
            name,
            email: email.toLowerCase(),
            role: 'INTERN',
            passwordHash: hashedPassword,
            isActive: true
          }
        });

        // Welcome notification
        await prisma.notification.create({
          data: {
            userId: newUser.id,
            title: 'Welcome to LMS',
            message: `Your account has been created. Login ID: ${userId}, Password: ${tempPassword}`,
            type: 'INFO'
          }
        });

        results.push({
          user: {
            id: newUser.id,
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email
          },
          credentials: {
            userId,
            temporaryPassword: tempPassword
          }
        });

      } catch (error) {
        errors.push({ userData, error: error.message });
      }
    }

    // Audit log
    await createAuditLog('BULK_USER_CREATED', req.user.id, {
      totalAttempted: users.length,
      successful: results.length,
      failed: errors.length
    });

    res.status(201).json({
      success: true,
      message: `Created ${results.length} users successfully`,
      data: {
        results,
        errors,
        summary: {
          total: users.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Bulk add users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Edit user
router.put('/users/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Audit log
    await createAuditLog('USER_UPDATED', req.user.id, {
      targetUserId: id,
      changes: updateData
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Profile Updated',
        message: 'Your profile has been updated by admin',
        type: 'INFO'
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Edit user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Revoke user access
router.put('/users/:id/revoke', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Audit log
    await createAuditLog('USER_ACCESS_REVOKED', req.user.id, {
      targetUserId: id,
      reason
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Access Revoked',
        message: reason || 'Your access has been revoked by admin',
        type: 'ERROR'
      }
    });

    res.json({
      success: true,
      message: 'User access revoked successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Revoke user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Restore user access
router.put('/users/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Audit log
    await createAuditLog('USER_ACCESS_RESTORED', req.user.id, {
      targetUserId: id
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Access Restored',
        message: 'Your access has been restored',
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'User access restored successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enable chat for user (after certificate validation)
router.put('/users/:id/enable-chat', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has valid certificates
    const validCertificate = await prisma.certificateValidation.findFirst({
      where: {
        userId: id,
        status: 'APPROVED',
        isValid: true
      }
    });

    if (!validCertificate) {
      return res.status(400).json({
        success: false,
        message: 'User must have at least one validated certificate to enable chat'
      });
    }

    // Enable chat permission
    await prisma.chatPermission.upsert({
      where: { userId: id },
      update: {
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      },
      create: {
        userId: id,
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      }
    });

    // Audit log
    await createAuditLog('CHAT_ENABLED', req.user.id, {
      targetUserId: id
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Chat Access Enabled',
        message: 'You now have access to private chat with admin for premium tasks',
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Chat access enabled for user'
    });

  } catch (error) {
    console.error('Enable chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Disable chat for user
router.put('/users/:id/disable-chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.chatPermission.update({
      where: { userId: id },
      data: {
        isEnabled: false
      }
    });

    // Audit log
    await createAuditLog('CHAT_DISABLED', req.user.id, {
      targetUserId: id,
      reason
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Chat Access Disabled',
        message: reason || 'Your chat access has been disabled',
        type: 'WARNING'
      }
    });

    res.json({
      success: true,
      message: 'Chat access disabled for user'
    });

  } catch (error) {
    console.error('Disable chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// INTERNSHIP/COURSE MANAGEMENT
// ==========================

// Get all internships
router.get('/internships', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [internships, total] = await Promise.all([
      prisma.internship.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              tasks: true,
              enrollments: true
            }
          }
        }
      }),
      prisma.internship.count()
    ]);

    res.json({
      success: true,
      data: {
        internships,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get internships error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create internship
router.post('/internships/create', upload.single('coverImage'), async (req, res) => {
  try {
    const {
      title,
      description,
      durationDays = 35,
      passPercentage = 75,
      certificatePrice = 499
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    const internshipData = {
      title,
      description,
      durationDays: parseInt(durationDays),
      passPercentage: parseFloat(passPercentage),
      certificatePrice: parseInt(certificatePrice),
      isActive: true
    };

    if (req.file) {
      internshipData.coverImage = `/uploads/task-files/${req.file.filename}`;
    }

    const internship = await prisma.internship.create({
      data: internshipData
    });

    // Audit log
    await createAuditLog('INTERNSHIP_CREATED', req.user.id, {
      internshipId: internship.id,
      title
    });

    res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: { internship }
    });

  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update internship
router.put('/internships/:id/update', upload.single('coverImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      durationDays,
      passPercentage,
      certificatePrice,
      isActive
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (durationDays) updateData.durationDays = parseInt(durationDays);
    if (passPercentage) updateData.passPercentage = parseFloat(passPercentage);
    if (certificatePrice) updateData.certificatePrice = parseInt(certificatePrice);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (req.file) updateData.coverImage = `/uploads/task-files/${req.file.filename}`;

    const internship = await prisma.internship.update({
      where: { id },
      data: updateData
    });

    // Audit log
    await createAuditLog('INTERNSHIP_UPDATED', req.user.id, {
      internshipId: id,
      changes: updateData
    });

    res.json({
      success: true,
      message: 'Internship updated successfully',
      data: { internship }
    });

  } catch (error) {
    console.error('Update internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// TASK MANAGEMENT
// ==========================

// Get tasks for internship
router.get('/internships/:internshipId/tasks', async (req, res) => {
  try {
    const { internshipId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { internshipId },
      orderBy: { taskNumber: 'asc' },
      include: {
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { tasks }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create task
router.post('/internships/:internshipId/tasks/create', upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { internshipId } = req.params;
    const {
      taskNumber,
      title,
      description,
      videoUrl,
      isRequired = true,
      points = 100,
      waitTimeHours = 12,
      maxAttempts = 3
    } = req.body;

    if (!taskNumber || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Task number, title, and description are required'
      });
    }

    // Process uploaded files
    const files = [];
    if (req.files?.files) {
      req.files.files.forEach(file => {
        files.push({
          name: file.originalname,
          url: `/uploads/task-files/${file.filename}`,
          type: path.extname(file.originalname).substring(1),
          size: file.size
        });
      });
    }

    let finalVideoUrl = videoUrl;
    if (req.files?.video && req.files.video[0]) {
      finalVideoUrl = `/uploads/task-files/${req.files.video[0].filename}`;
    }

    const task = await prisma.task.create({
      data: {
        internshipId,
        taskNumber: parseInt(taskNumber),
        title,
        description,
        videoUrl: finalVideoUrl,
        files: files.length > 0 ? files : null,
        isRequired,
        points: parseInt(points),
        waitTimeHours: parseInt(waitTimeHours),
        maxAttempts: parseInt(maxAttempts)
      }
    });

    // Audit log
    await createAuditLog('TASK_CREATED', req.user.id, {
      taskId: task.id,
      internshipId,
      taskNumber,
      title
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update task
router.put('/tasks/:taskId/update', upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      videoUrl,
      isRequired,
      points,
      waitTimeHours,
      maxAttempts
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (videoUrl) updateData.videoUrl = videoUrl;
    if (typeof isRequired === 'boolean') updateData.isRequired = isRequired;
    if (points) updateData.points = parseInt(points);
    if (waitTimeHours) updateData.waitTimeHours = parseInt(waitTimeHours);
    if (maxAttempts) updateData.maxAttempts = parseInt(maxAttempts);

    // Process uploaded files
    if (req.files?.files) {
      const files = [];
      req.files.files.forEach(file => {
        files.push({
          name: file.originalname,
          url: `/uploads/task-files/${file.filename}`,
          type: path.extname(file.originalname).substring(1),
          size: file.size
        });
      });
      updateData.files = files;
    }

    if (req.files?.video && req.files.video[0]) {
      updateData.videoUrl = `/uploads/task-files/${req.files.video[0].filename}`;
    }

    updateData.updatedAt = new Date();

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    // Audit log
    await createAuditLog('TASK_UPDATED', req.user.id, {
      taskId,
      changes: updateData
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete task
router.delete('/tasks/:taskId/delete', async (req, res) => {
  try {
    const { taskId } = req.params;

    await prisma.task.delete({
      where: { id: taskId }
    });

    // Audit log
    await createAuditLog('TASK_DELETED', req.user.id, {
      taskId
    });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// SUBMISSION REVIEW SYSTEM
// ==========================

// Get all submissions for review
router.get('/submissions/review', async (req, res) => {
  try {
    const { status, internshipId, internId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (internId) where.internId = internId;
    if (internshipId) {
      where.task = {
        internshipId: internshipId
      };
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { submissionDate: 'desc' },
        include: {
          intern: {
            select: {
              id: true,
              name: true,
              userId: true,
              email: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              taskNumber: true,
              points: true,
              waitTimeHours: true,
              maxAttempts: true
            }
          },
          enrollment: {
            include: {
              internship: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.submission.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Review submission (Approve/Reject)
router.put('/submissions/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score, adminFeedback, allowResubmission = true } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either APPROVED or REJECTED'
      });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        intern: { select: { name: true } },
        task: {
          select: {
            title: true,
            taskNumber: true,
            waitTimeHours: true,
            internshipId: true,
            points: true
          }
        },
        enrollment: true
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        status,
        score: score ? parseFloat(score) : null,
        adminFeedback,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    if (status === 'APPROVED') {
      // Find next task
      const nextTask = await prisma.task.findFirst({
        where: {
          internshipId: submission.task.internshipId,
          taskNumber: submission.task.taskNumber + 1
        }
      });

      if (nextTask) {
        // Calculate unlock time
        const unlockTime = new Date(Date.now() + (submission.task.waitTimeHours * 60 * 60 * 1000));

        // Create task unlock record
        await prisma.taskUnlock.create({
          data: {
            enrollmentId: submission.enrollmentId,
            taskId: nextTask.id,
            unlocksAt: unlockTime,
            isUnlocked: false
          }
        });

        // Notify user
        await prisma.notification.create({
          data: {
            userId: submission.internId,
            title: 'Task Approved - Next Task Unlocking',
            message: `Your submission for "${submission.task.title}" has been approved with score ${score || 'N/A'}! Next task will unlock at ${unlockTime.toLocaleString()}`,
            type: 'SUCCESS'
          }
        });
      } else {
        // Check if all tasks completed
        const totalTasks = await prisma.task.count({
          where: { internshipId: submission.task.internshipId }
        });

        const completedTasks = await prisma.submission.count({
          where: {
            enrollmentId: submission.enrollmentId,
            status: 'APPROVED'
          }
        });

        if (completedTasks >= totalTasks) {
          // Calculate final score
          const allSubmissions = await prisma.submission.findMany({
            where: {
              enrollmentId: submission.enrollmentId,
              status: 'APPROVED'
            }
          });

          const totalScore = allSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
          const finalScore = totalScore / allSubmissions.length;

          // Update enrollment
          const enrollment = await prisma.enrollment.update({
            where: { id: submission.enrollmentId },
            data: {
              isCompleted: true,
              completionDate: new Date(),
              finalScore: finalScore,
              certificateEligible: finalScore >= submission.enrollment.internship.passPercentage
            }
          });

          // Notify user about completion
          await prisma.notification.create({
            data: {
              userId: submission.internId,
              title: 'Internship Completed!',
              message: enrollment.certificateEligible 
                ? `Congratulations! You have completed the internship with ${finalScore.toFixed(2)}% score. You can now proceed to payment for your certificate.`
                : `You have completed all tasks with ${finalScore.toFixed(2)}% score, but you need ${submission.enrollment.internship.passPercentage}% to be eligible for certificate.`,
              type: enrollment.certificateEligible ? 'SUCCESS' : 'WARNING'
            }
          });
        }
      }
    } else if (status === 'REJECTED') {
      // Notify user about rejection
      await prisma.notification.create({
        data: {
          userId: submission.internId,
          title: 'Submission Rejected',
          message: `Your submission for "${submission.task.title}" has been rejected. ${adminFeedback || 'Please review feedback and resubmit.'}`,
          type: 'ERROR'
        }
      });

      // Create resubmission opportunity if allowed
      if (allowResubmission) {
        await prisma.resubmissionOpportunity.create({
          data: {
            originalSubmissionId: id,
            enrollmentId: submission.enrollmentId,
            taskId: submission.taskId,
            allowedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isUsed: false
          }
        });
      }
    }

    // Audit log
    await createAuditLog('SUBMISSION_REVIEWED', req.user.id, {
      submissionId: id,
      internId: submission.internId,
      taskId: submission.taskId,
      status,
      score
    });

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: { submission: updatedSubmission }
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk review submissions
router.post('/submissions/bulk-review', async (req, res) => {
  try {
    const { submissionIds, status, score, adminFeedback } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Submission IDs array is required'
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either APPROVED or REJECTED'
      });
    }

    const results = [];
    const errors = [];

    for (const submissionId of submissionIds) {
      try {
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status,
            score: score ? parseFloat(score) : null,
            adminFeedback,
            reviewedAt: new Date(),
            reviewedBy: req.user.id
          }
        });
        results.push(submissionId);
      } catch (error) {
        errors.push({ submissionId, error: error.message });
      }
    }

    // Audit log
    await createAuditLog('BULK_SUBMISSION_REVIEW', req.user.id, {
      total: submissionIds.length,
      successful: results.length,
      failed: errors.length,
      status
    });

    res.json({
      success: true,
      message: `Reviewed ${results.length} submissions`,
      data: { results, errors }
    });

  } catch (error) {
    console.error('Bulk review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// ANALYTICS & REPORTS
// ==========================

// Get comprehensive analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // User statistics
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
      where: dateFilter
    });

    // Enrollment statistics
    const enrollmentStats = await prisma.enrollment.findMany({
      where: dateFilter,
      select: {
        isCompleted: true,
        finalScore: true,
        certificateEligible: true,
        certificatePurchased: true
      }
    });

    // Submission statistics
    const submissionStats = await prisma.submission.groupBy({
      by: ['status'],
      _count: true,
      where: dateFilter
    });

    // Payment statistics
    const paymentStats = await prisma.payment.groupBy({
      by: ['paymentStatus', 'paymentType'],
      _sum: { amount: true },
      _count: true,
      where: dateFilter
    });

    // Task completion rate
    const totalTasks = await prisma.task.count();
    const completedSubmissions = await prisma.submission.count({
      where: { ...dateFilter, status: 'APPROVED' }
    });

    // Average scores
    const avgScore = await prisma.submission.aggregate({
      _avg: { score: true },
      where: { ...dateFilter, status: 'APPROVED' }
    });

    // Top performers
    const topPerformers = await prisma.enrollment.findMany({
      where: {
        ...dateFilter,
        finalScore: { not: null }
      },
      orderBy: { finalScore: 'desc' },
      take: 10,
      include: {
        intern: {
          select: {
            name: true,
            userId: true
          }
        },
        internship: {
          select: {
            title: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        users: userStats,
        enrollments: {
          total: enrollmentStats.length,
          completed: enrollmentStats.filter(e => e.isCompleted).length,
          certificateEligible: enrollmentStats.filter(e => e.certificateEligible).length,
          certificatePurchased: enrollmentStats.filter(e => e.certificatePurchased).length
        },
        submissions: submissionStats,
        payments: paymentStats,
        performance: {
          totalTasks,
          completedSubmissions,
          completionRate: totalTasks > 0 ? Math.round((completedSubmissions / totalTasks) * 100) : 0,
          averageScore: avgScore._avg.score ? avgScore._avg.score.toFixed(2) : 0
        },
        topPerformers
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Export data (CSV format)
router.get('/export/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'INTERN' },
      select: {
        userId: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    });

    // Convert to CSV
    const csvHeader = 'User ID,Name,Email,Status,Created At\n';
    const csvRows = users.map(u => 
      `${u.userId},${u.name},${u.email},${u.isActive ? 'Active' : 'Inactive'},${u.createdAt.toISOString()}`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);

  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
              userId: true,
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
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;