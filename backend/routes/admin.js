// routes/admin.js - ENHANCED VERSION
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { adminOnly } = require('../middleware/auth');
const { generateCertificate, generatePaymentQR } = require('../utils/helpers');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Apply admin-only middleware to all routes
router.use(adminOnly);

// ==========================
// ENHANCED USER MANAGEMENT
// ==========================

// Bulk add users
router.post('/users/bulk-add', async (req, res) => {
  try {
    const { users } = req.body; // Array of {name, email, userId}
    
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
        const { name, email, userId } = userData;
        
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ email }, { userId }]
          }
        });

        if (existingUser) {
          errors.push({ userData, error: 'User already exists' });
          continue;
        }

        // Generate temporary password (userId in lowercase)
        const tempPassword = userId.toLowerCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = await prisma.user.create({
          data: {
            userId,
            name,
            email,
            role: 'INTERN',
            passwordHash: hashedPassword,
            isActive: true
          }
        });

        results.push({
          user: newUser,
          temporaryPassword: tempPassword
        });

        // Create welcome notification
        await prisma.notification.create({
          data: {
            userId: newUser.id,
            title: 'Welcome to LMS',
            message: `Your account has been created. Login with ID: ${userId} and password: ${tempPassword}`,
            type: 'INFO'
          }
        });

      } catch (error) {
        errors.push({ userData, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.length} users successfully`,
      data: { results, errors }
    });

  } catch (error) {
    console.error('Bulk add users error:', error);
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
                description: true,
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
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate additional metrics
    const completedCourses = user.enrollments.filter(e => e.isCompleted).length;
    const certificates = user.enrollments.filter(e => e.certificatePurchased).length;
    const totalPayments = user.payments.reduce((sum, p) => p.paymentStatus === 'VERIFIED' ? sum + p.amount : sum, 0);
    
    // Task statistics
    const taskStats = {
      completed: 0,
      pending: 0,
      rejected: 0,
      total: 0
    };

    user.enrollments.forEach(enrollment => {
      enrollment.submissions.forEach(submission => {
        taskStats.total++;
        if (submission.status === 'APPROVED') taskStats.completed++;
        else if (submission.status === 'REJECTED') taskStats.rejected++;
        else taskStats.pending++;
      });
    });

    const profileData = {
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      enrollments: user.enrollments,
      payments: user.payments,
      notifications: user.notifications,
      statistics: {
        totalEnrollments: user.enrollments.length,
        completedCourses,
        certificates,
        totalPayments,
        taskStats
      }
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

// Edit user details
router.put('/users/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this route
    delete updateData.passwordHash;
    delete updateData.id;
    delete updateData.createdAt;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    // Log admin action
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Profile Updated',
        message: `Your profile has been updated by admin`,
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

    // Send notification to user
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

// Enable chat for user (after certificate verification)
router.put('/users/:id/enable-chat', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has valid certificates
    const certificates = await prisma.enrollment.count({
      where: {
        internId: id,
        certificatePurchased: true
      }
    });

    if (certificates === 0) {
      return res.status(400).json({
        success: false,
        message: 'User must have at least one certificate to enable chat'
      });
    }

    // Create or update chat permission
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

// ==========================
// ENHANCED TASK MANAGEMENT
// ==========================

// Create task with enhanced features
router.post('/internships/:internshipId/tasks/enhanced', upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
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

    // Process uploaded files
    const files = [];
    if (req.files?.files) {
      req.files.files.forEach(file => {
        files.push({
          name: file.originalname,
          url: `/uploads/${file.filename}`,
          type: path.extname(file.originalname).substring(1),
          size: file.size
        });
      });
    }

    const task = await prisma.task.create({
      data: {
        internshipId,
        taskNumber: parseInt(taskNumber),
        title,
        description,
        videoUrl,
        files: files.length > 0 ? files : null,
        isRequired,
        points: parseInt(points),
        waitTimeHours: parseInt(waitTimeHours),
        maxAttempts: parseInt(maxAttempts)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Enhanced task created successfully',
      data: { task }
    });

  } catch (error) {
    console.error('Create enhanced task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// SUBMISSION REVIEW SYSTEM
// ==========================

// Get all submissions with filtering
router.get('/submissions/review', async (req, res) => {
  try {
    const { status, internshipId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
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
        orderBy: { createdAt: 'desc' },
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
              waitTimeHours: true
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
    console.error('Get submissions for review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Review submission with enhanced features
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
            internshipId: true
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

    // If approved, check if next task should be unlocked
    if (status === 'APPROVED') {
      const nextTask = await prisma.task.findFirst({
        where: {
          internshipId: submission.task.internshipId,
          taskNumber: submission.task.taskNumber + 1
        }
      });

      if (nextTask) {
        // Calculate unlock time (current time + wait time)
        const unlockTime = new Date(Date.now() + (submission.task.waitTimeHours * 60 * 60 * 1000));
        
        // Create task unlock record
        await prisma.taskUnlock.create({
          data: {
            enrollmentId: submission.enrollmentId,
            taskId: nextTask.id,
            unlocksAt: unlockTime
          }
        });

        // Notify user about next task unlock
        await prisma.notification.create({
          data: {
            userId: submission.internId,
            title: 'Task Approved - Next Task Unlocking',
            message: `Your submission for "${submission.task.title}" has been approved! Next task will unlock at ${unlockTime.toLocaleString()}`,
            type: 'SUCCESS'
          }
        });
      } else {
        // Check if this was the final task
        const allTasks = await prisma.task.count({
          where: { internshipId: submission.task.internshipId }
        });

        const completedTasks = await prisma.submission.count({
          where: {
            enrollmentId: submission.enrollmentId,
            status: 'APPROVED'
          }
        });

        if (completedTasks >= allTasks) {
          // Mark enrollment as completed and eligible for payment
          await prisma.enrollment.update({
            where: { id: submission.enrollmentId },
            data: {
              isCompleted: true,
              completionDate: new Date(),
              certificateEligible: true
            }
          });

          // Notify user about completion
          await prisma.notification.create({
            data: {
              userId: submission.internId,
              title: 'Internship Completed!',
              message: 'Congratulations! You have completed all tasks. You can now proceed to payment for your certificate.',
              type: 'SUCCESS'
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
          message: `Your submission for "${submission.task.title}" has been rejected. ${adminFeedback || 'Please review and resubmit.'}`,
          type: 'ERROR'
        }
      });

      // If resubmission allowed, create resubmission opportunity
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

module.exports = router;