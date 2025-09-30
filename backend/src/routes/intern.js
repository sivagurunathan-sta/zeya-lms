// src/routes/intern.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeIntern } = require('../middleware/auth');

const prisma = new PrismaClient();

// Apply authentication to all intern routes
router.use(authenticateToken);
router.use(authorizeIntern);

// ===========================
// DASHBOARD
// ===========================

// Get intern dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const internId = req.user.id;

    const [enrollments, notifications, payments] = await Promise.all([
      prisma.enrollment.findMany({
        where: { internId },
        include: {
          internship: {
            include: {
              tasks: { orderBy: { taskNumber: 'asc' } }
            }
          },
          submissions: {
            include: {
              task: true
            }
          }
        }
      }),
      prisma.notification.findMany({
        where: { userId: internId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.payment.findMany({
        where: { internId },
        orderBy: { createdAt: 'desc' },
        include: {
          internship: { select: { title: true } },
          paidTask: { select: { title: true } }
        }
      })
    ]);

    // Calculate progress for each enrollment
    const enrichedEnrollments = enrollments.map(enrollment => {
      const totalTasks = enrollment.internship.tasks.length;
      const completedTasks = enrollment.submissions.filter(s => s.status === 'APPROVED').length;
      const pendingTasks = enrollment.submissions.filter(s => s.status === 'PENDING').length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        ...enrollment,
        stats: {
          totalTasks,
          completedTasks,
          pendingTasks,
          progress: Math.round(progress)
        }
      };
    });

    res.json({
      success: true,
      data: {
        enrollments: enrichedEnrollments,
        notifications,
        payments
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// ===========================
// INTERNSHIPS
// ===========================

// Get all available internships
router.get('/internships', async (req, res) => {
  try {
    const internId = req.user.id;

    const internships = await prisma.internship.findMany({
      where: { isActive: true },
      include: {
        tasks: {
          select: { id: true, taskNumber: true }
        },
        enrollments: {
          where: { internId },
          select: { id: true, enrollmentDate: true, finalScore: true }
        },
        _count: {
          select: { tasks: true, enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: internships
    });

  } catch (error) {
    console.error('Get internships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internships',
      error: error.message
    });
  }
});

// Get single internship details
router.get('/internships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const internId = req.user.id;

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { taskNumber: 'asc' } },
        enrollments: {
          where: { internId }
        }
      }
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.json({
      success: true,
      data: internship
    });

  } catch (error) {
    console.error('Get internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internship',
      error: error.message
    });
  }
});

// Enroll in internship
router.post('/enroll/:internshipId', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    // Check if internship exists and is active
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId }
    });

    if (!internship || !internship.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found or inactive'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this internship'
      });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        internId,
        internshipId
      },
      include: {
        internship: true
      }
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Enrollment Successful!',
        message: `You have successfully enrolled in ${internship.title}. Start your first task now!`,
        type: 'SUCCESS'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: enrollment
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll',
      error: error.message
    });
  }
});

// ===========================
// TASKS & SUBMISSIONS
// ===========================

// Get tasks for an internship
router.get('/internships/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const internId = req.user.id;

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId: id
        }
      },
      include: {
        submissions: true
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this internship'
      });
    }

    // Get all tasks
    const tasks = await prisma.task.findMany({
      where: { internshipId: id },
      orderBy: { taskNumber: 'asc' }
    });

    // Enrich tasks with submission status
    const enrichedTasks = tasks.map(task => {
      const submission = enrollment.submissions.find(s => s.taskId === task.id);
      return {
        ...task,
        submission: submission || null,
        isLocked: false // You can implement locking logic here
      };
    });

    res.json({
      success: true,
      data: enrichedTasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

// Submit task
router.post('/submissions', async (req, res) => {
  try {
    const { enrollmentId, taskId, githubRepoUrl } = req.body;
    const internId = req.user.id;

    // Validate enrollment ownership
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        internId
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Invalid enrollment'
      });
    }

    // Check if already submitted
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        enrollmentId_taskId: {
          enrollmentId,
          taskId
        }
      }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Task already submitted'
      });
    }

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        enrollmentId,
        taskId,
        internId,
        submissionDate: new Date(),
        isLate: false, // You can add deadline logic here
        status: 'PENDING'
      },
      include: {
        task: true
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Submission Received',
        message: `Your submission for "${task.title}" has been received and is under review.`,
        type: 'INFO'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Task submitted successfully',
      data: submission
    });

  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task',
      error: error.message
    });
  }
});

// Get submission history
router.get('/submissions', async (req, res) => {
  try {
    const internId = req.user.id;

    const submissions = await prisma.submission.findMany({
      where: { internId },
      include: {
        task: true,
        enrollment: {
          include: {
            internship: { select: { title: true } }
          }
        }
      },
      orderBy: { submissionDate: 'desc' }
    });

    res.json({
      success: true,
      data: submissions
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
});

// ===========================
// NOTIFICATIONS
// ===========================

// Get all notifications
router.get('/notifications', async (req, res) => {
  try {
    const internId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: internId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where: { userId: internId } }),
      prisma.notification.count({ 
        where: { 
          userId: internId,
          isRead: false 
        } 
      })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const internId = req.user.id;

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        userId: internId
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', async (req, res) => {
  try {
    const internId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId: internId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications',
      error: error.message
    });
  }
});

// ===========================
// PROFILE
// ===========================

// Get intern profile
router.get('/profile', async (req, res) => {
  try {
    const internId = req.user.id;

    const profile = await prisma.user.findUnique({
      where: { id: internId },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        enrollments: {
          include: {
            internship: true,
            submissions: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

module.exports = router;