// src/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// Apply authentication and authorization middleware to all admin routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// ===========================
// SUBMISSION REVIEW ROUTES
// ===========================

// Review and approve/reject submission
router.put('/submissions/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score, adminFeedback } = req.body;

    // Validate status
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be APPROVED or REJECTED'
      });
    }

    // Update submission
    const submission = await prisma.submission.update({
      where: { id },
      data: {
        status,
        score: status === 'APPROVED' ? score : 0,
        adminFeedback,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      },
      include: {
        task: true,
        intern: { select: { name: true, email: true } }
      }
    });

    // Create notification for intern
    await prisma.notification.create({
      data: {
        userId: submission.internId,
        title: status === 'APPROVED' ? 'Task Approved!' : 'Task Rejected',
        message: adminFeedback || `Your submission for "${submission.task.title}" has been ${status.toLowerCase()}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR'
      }
    });

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: submission
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review submission',
      error: error.message
    });
  }
});

// Get all submissions for review
router.get('/submissions/review', async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { status },
        skip,
        take: parseInt(limit),
        orderBy: { submissionDate: 'desc' },
        include: {
          task: { select: { title: true, taskNumber: true, points: true } },
          intern: { select: { name: true, email: true, userId: true } },
          enrollment: {
            include: {
              internship: { select: { title: true } }
            }
          }
        }
      }),
      prisma.submission.count({ where: { status } })
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
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
// DASHBOARD & ANALYTICS
// ===========================

// Get admin dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalInterns,
      activeInterns,
      totalInternships,
      pendingSubmissions,
      pendingPayments,
      recentEnrollments,
      recentSubmissions
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'INTERN' } }),
      prisma.user.count({ where: { role: 'INTERN', isActive: true } }),
      prisma.internship.count({ where: { isActive: true } }),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { enrollmentDate: 'desc' },
        include: {
          intern: { select: { name: true, email: true } },
          internship: { select: { title: true } }
        }
      }),
      prisma.submission.findMany({
        take: 10,
        orderBy: { submissionDate: 'desc' },
        include: {
          intern: { select: { name: true } },
          task: { select: { title: true } }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          totalInterns,
          activeInterns,
          totalInternships,
          pendingSubmissions,
          pendingPayments
        },
        recentEnrollments,
        recentSubmissions
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
// USER MANAGEMENT
// ===========================

// Get all users (interns)
router.get('/users', async (req, res) => {
  try {
    const { role = 'INTERN', page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      role,
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
          role: true,
          isActive: true,
          createdAt: true,
          enrollments: {
            include: {
              internship: { select: { title: true } }
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

// Toggle user active status
router.patch('/users/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    });

    res.json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status',
      error: error.message
    });
  }
});

// ===========================
// INTERNSHIP MANAGEMENT
// ===========================

// Get all internships
router.get('/internships', async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: { orderBy: { taskNumber: 'asc' } },
        enrollments: {
          include: {
            intern: { select: { name: true, email: true } }
          }
        },
        _count: {
          select: {
            tasks: true,
            enrollments: true
          }
        }
      }
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

// Create new internship
router.post('/internships', async (req, res) => {
  try {
    const {
      title,
      description,
      coverImage,
      durationDays,
      passPercentage,
      certificatePrice
    } = req.body;

    const internship = await prisma.internship.create({
      data: {
        title,
        description,
        coverImage,
        durationDays: parseInt(durationDays) || 35,
        passPercentage: parseFloat(passPercentage) || 75.0,
        certificatePrice: parseInt(certificatePrice) || 499,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: internship
    });

  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create internship',
      error: error.message
    });
  }
});

// Update internship
router.put('/internships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const internship = await prisma.internship.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Internship updated successfully',
      data: internship
    });

  } catch (error) {
    console.error('Update internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update internship',
      error: error.message
    });
  }
});

// Delete internship
router.delete('/internships/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.internship.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Internship deleted successfully'
    });

  } catch (error) {
    console.error('Delete internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete internship',
      error: error.message
    });
  }
});

// ===========================
// TASK MANAGEMENT
// ===========================

// Create new task for internship
router.post('/internships/:internshipId/tasks', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const {
      taskNumber,
      title,
      description,
      videoUrl,
      files,
      isRequired,
      points,
      waitTimeHours,
      maxAttempts
    } = req.body;

    const task = await prisma.task.create({
      data: {
        internshipId,
        taskNumber: parseInt(taskNumber),
        title,
        description,
        videoUrl,
        files: files || [],
        isRequired: isRequired !== false,
        points: parseInt(points) || 100,
        waitTimeHours: parseInt(waitTimeHours) || 12,
        maxAttempts: parseInt(maxAttempts) || 3
      }
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
});

// Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
});

// Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

// ===========================
// PAYMENT MANAGEMENT
// ===========================

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { paymentStatus: status } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          intern: { select: { name: true, email: true, userId: true } },
          internship: { select: { title: true } },
          paidTask: { select: { title: true } }
        }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

// Verify payment
router.put('/payments/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, verificationMessage, verifiedTransactionId } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        paymentStatus,
        verificationMessage,
        verifiedTransactionId,
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      },
      include: {
        intern: { select: { name: true, email: true } }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: payment.internId,
        title: paymentStatus === 'VERIFIED' ? 'Payment Verified!' : 'Payment Rejected',
        message: verificationMessage || `Your payment has been ${paymentStatus.toLowerCase()}.`,
        type: paymentStatus === 'VERIFIED' ? 'SUCCESS' : 'ERROR'
      }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: payment
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

// ===========================
// REPORTS & ANALYTICS
// ===========================

// Get analytics report
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [
      enrollmentStats,
      submissionStats,
      paymentStats,
      internshipStats
    ] = await Promise.all([
      prisma.enrollment.groupBy({
        by: ['internshipId'],
        _count: true,
        ...(Object.keys(dateFilter).length && {
          where: { enrollmentDate: dateFilter }
        })
      }),
      prisma.submission.groupBy({
        by: ['status'],
        _count: true,
        _avg: { score: true }
      }),
      prisma.payment.groupBy({
        by: ['paymentStatus', 'paymentType'],
        _count: true,
        _sum: { amount: true }
      }),
      prisma.internship.findMany({
        include: {
          _count: {
            select: {
              enrollments: true,
              tasks: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        enrollmentStats,
        submissionStats,
        paymentStats,
        internshipStats
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

module.exports = router;