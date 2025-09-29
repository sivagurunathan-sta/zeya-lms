// routes/intern.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { internOnly } = require('../middleware/auth');
const { generatePaymentQR, calculateProgress } = require('../utils/helpers');

const router = express.Router();
const prisma = new PrismaClient();

// Apply intern-only middleware to all routes
router.use(internOnly);

// ==========================
// DASHBOARD
// ==========================

router.get('/dashboard', async (req, res) => {
  try {
    const internId = req.user.id;

    // Get intern's enrollments with progress
    const enrollments = await prisma.enrollment.findMany({
      where: { internId },
      include: {
        internship: {
          select: {
            id: true,
            title: true,
            description: true,
            coverImage: true,
            durationDays: true,
            passPercentage: true,
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
          }
        }
      }
    });

    // Calculate progress for each enrollment
    const dashboardData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalTasks = await prisma.task.count({
          where: { internshipId: enrollment.internshipId }
        });

        const completedTasks = enrollment.submissions.length;
        const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Calculate score
        const totalScore = enrollment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
        const averageScore = completedTasks > 0 ? totalScore / completedTasks : 0;

        // Check if certificate eligible
        const isEligible = progressPercentage >= 100 && averageScore >= enrollment.internship.passPercentage;

        return {
          enrollment: {
            ...enrollment,
            progressPercentage: Math.round(progressPercentage),
            averageScore: Math.round(averageScore),
            isEligible,
            totalTasks,
            completedTasks
          }
        };
      })
    );

    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      where: { userId: internId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: {
        internId,
        paymentStatus: 'PENDING'
      },
      include: {
        internship: { select: { title: true } },
        paidTask: { select: { title: true } }
      }
    });

    res.json({
      success: true,
      data: {
        enrollments: dashboardData,
        notifications,
        pendingPayments,
        stats: {
          totalEnrollments: enrollments.length,
          completedInternships: enrollments.filter(e => e.isCompleted).length,
          certificatesEarned: enrollments.filter(e => e.certificatePurchased).length
        }
      }
    });

  } catch (error) {
    console.error('Intern dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// INTERNSHIP ENROLLMENT
// ==========================

router.post('/enroll/:internshipId', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    // Check if internship exists and is active
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId, isActive: true }
    });

    if (!internship) {
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
        internship: {
          select: {
            title: true,
            description: true,
            durationDays: true
          }
        }
      }
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Enrollment Successful',
        message: `You have successfully enrolled in "${internship.title}"`,
        type: 'SUCCESS'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: { enrollment }
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// TASK MANAGEMENT
// ==========================

router.get('/internships/:internshipId/tasks', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this internship'
      });
    }

    // Get all tasks with submission status
    const tasks = await prisma.task.findMany({
      where: { internshipId },
      orderBy: { taskNumber: 'asc' },
      include: {
        submissions: {
          where: { internId },
          select: {
            id: true,
            githubRepoUrl: true,
            submissionDate: true,
            isLate: true,
            score: true,
            adminFeedback: true,
            status: true
          }
        }
      }
    });

    // Determine which tasks are unlocked
    const tasksWithStatus = tasks.map((task, index) => {
      const submission = task.submissions[0] || null;
      const isSubmitted = !!submission;
      
      // First task is always unlocked, subsequent tasks unlock after previous submission
      const isUnlocked = index === 0 || (tasks[index - 1].submissions.length > 0);
      
      return {
        ...task,
        submissions: undefined, // Remove from response
        submission,
        isSubmitted,
        isUnlocked
      };
    });

    res.json({
      success: true,
      data: { tasks: tasksWithStatus }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const internId = req.user.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        internship: {
          select: { title: true }
        },
        submissions: {
          where: { internId },
          select: {
            id: true,
            githubRepoUrl: true,
            submissionDate: true,
            isLate: true,
            score: true,
            adminFeedback: true,
            status: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if intern is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId: task.internshipId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this internship'
      });
    }

    // Check if task is unlocked
    const previousTask = await prisma.task.findFirst({
      where: {
        internshipId: task.internshipId,
        taskNumber: task.taskNumber - 1
      }
    });

    let isUnlocked = true;
    if (previousTask) {
      const previousSubmission = await prisma.submission.findFirst({
        where: {
          taskId: previousTask.id,
          internId
        }
      });
      isUnlocked = !!previousSubmission;
    }

    const submission = task.submissions[0] || null;

    res.json({
      success: true,
      data: {
        task: {
          ...task,
          submissions: undefined,
          submission,
          isUnlocked
        }
      }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/tasks/:taskId/submit', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { githubRepoUrl } = req.body;
    const internId = req.user.id;

    if (!githubRepoUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub repository URL is required'
      });
    }

    // Validate GitHub URL format
    const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    if (!githubUrlRegex.test(githubRepoUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub repository URL format'
      });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        internship: { select: { title: true } }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId: task.internshipId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this internship'
      });
    }

    // Check if already submitted
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        enrollmentId_taskId: {
          enrollmentId: enrollment.id,
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

    // Check if task is unlocked
    const previousTask = await prisma.task.findFirst({
      where: {
        internshipId: task.internshipId,
        taskNumber: task.taskNumber - 1
      }
    });

    if (previousTask) {
      const previousSubmission = await prisma.submission.findFirst({
        where: {
          taskId: previousTask.id,
          internId
        }
      });

      if (!previousSubmission) {
        return res.status(403).json({
          success: false,
          message: 'Previous task must be completed first'
        });
      }
    }

    // Calculate if submission is late (within 24 hours of enrollment or previous submission)
    let deadlineTime;
    if (task.taskNumber === 1) {
      deadlineTime = new Date(enrollment.enrollmentDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      const previousSubmission = await prisma.submission.findFirst({
        where: {
          enrollmentId: enrollment.id,
          task: {
            taskNumber: task.taskNumber - 1,
            internshipId: task.internshipId
          }
        },
        orderBy: { submissionDate: 'desc' }
      });

      if (previousSubmission) {
        deadlineTime = new Date(previousSubmission.submissionDate.getTime() + 24 * 60 * 60 * 1000);
      } else {
        deadlineTime = new Date(enrollment.enrollmentDate.getTime() + (task.taskNumber * 24 * 60 * 60 * 1000));
      }
    }

    const isLate = new Date() > deadlineTime;

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        enrollmentId: enrollment.id,
        taskId,
        internId,
        githubRepoUrl,
        isLate
      },
      include: {
        task: {
          select: {
            title: true,
            taskNumber: true
          }
        }
      }
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Submission Successful',
        message: `Your submission for "${task.title}" has been received and is under review`,
        type: 'SUCCESS'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Submission successful',
      data: { submission }
    });

  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// PROGRESS TRACKING
// ==========================

router.get('/progress/:internshipId', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      },
      include: {
        internship: {
          select: {
            title: true,
            passPercentage: true,
            certificatePrice: true
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
          orderBy: {
            task: {
              taskNumber: 'asc'
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Get total tasks
    const totalTasks = await prisma.task.count({
      where: { internshipId }
    });

    const totalPoints = await prisma.task.aggregate({
      where: { internshipId },
      _sum: { points: true }
    });

    // Calculate progress
    const completedTasks = enrollment.submissions.length;
    const earnedPoints = enrollment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const scorePercentage = totalPoints._sum.points > 0 ? (earnedPoints / totalPoints._sum.points) * 100 : 0;

    // Check eligibility
    const isEligible = progressPercentage >= 100 && scorePercentage >= enrollment.internship.passPercentage;

    res.json({
      success: true,
      data: {
        progress: {
          totalTasks,
          completedTasks,
          progressPercentage: Math.round(progressPercentage),
          earnedPoints,
          totalPoints: totalPoints._sum.points || 0,
          scorePercentage: Math.round(scorePercentage),
          isEligible,
          certificateEligible: enrollment.certificateEligible,
          certificatePurchased: enrollment.certificatePurchased
        },
        submissions: enrollment.submissions,
        internship: enrollment.internship
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// PAYMENT SYSTEM
// ==========================

router.post('/payment/certificate/:internshipId', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    // Check enrollment and eligibility
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      },
      include: {
        internship: {
          select: {
            title: true,
            certificatePrice: true,
            passPercentage: true
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.certificatePurchased) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already purchased'
      });
    }

    // Check if eligible
    const totalTasks = await prisma.task.count({
      where: { internshipId }
    });

    const completedTasks = await prisma.submission.count({
      where: {
        internId,
        task: { internshipId }
      }
    });

    const avgScore = await prisma.submission.aggregate({
      where: {
        internId,
        task: { internshipId }
      },
      _avg: { score: true }
    });

    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const averageScore = avgScore._avg.score || 0;

    if (progressPercentage < 100 || averageScore < enrollment.internship.passPercentage) {
      return res.status(400).json({
        success: false,
        message: 'Not eligible for certificate. Complete all tasks with required score.'
      });
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId,
        internshipId,
        paymentType: 'CERTIFICATE'
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment request already exists',
        data: { payment: existingPayment }
      });
    }

    // Generate QR code for payment
    const paymentData = {
      amount: enrollment.internship.certificatePrice,
      internId,
      internshipId,
      type: 'CERTIFICATE'
    };

    const qrCodeUrl = await generatePaymentQR(paymentData);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        internId,
        internshipId,
        amount: enrollment.internship.certificatePrice,
        paymentType: 'CERTIFICATE',
        qrCodeUrl
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment QR generated. Please complete payment and upload screenshot.',
      data: { payment }
    });

  } catch (error) {
    console.error('Certificate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/paid-tasks', async (req, res) => {
  try {
    const internId = req.user.id;

    // Check if intern has any certificates
    const certificates = await prisma.enrollment.count({
      where: {
        internId,
        certificatePurchased: true
      }
    });

    if (certificates === 0) {
      return res.status(403).json({
        success: false,
        message: 'Certificate required to access paid tasks'
      });
    }

    const paidTasks = await prisma.paidTask.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { paidTasks }
    });

  } catch (error) {
    console.error('Get paid tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/payment/paid-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const internId = req.user.id;

    // Check if intern has certificates
    const certificates = await prisma.enrollment.count({
      where: {
        internId,
        certificatePurchased: true
      }
    });

    if (certificates === 0) {
      return res.status(403).json({
        success: false,
        message: 'Certificate required to purchase paid tasks'
      });
    }

    const paidTask = await prisma.paidTask.findUnique({
      where: { id: taskId, isActive: true }
    });

    if (!paidTask) {
      return res.status(404).json({
        success: false,
        message: 'Paid task not found'
      });
    }

    // Check if already purchased
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId,
        paidTaskId: taskId,
        paymentStatus: 'VERIFIED'
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Task already purchased'
      });
    }

    // Generate QR code
    const paymentData = {
      amount: paidTask.price,
      internId,
      paidTaskId: taskId,
      type: 'PAID_TASK'
    };

    const qrCodeUrl = await generatePaymentQR(paymentData);

    const payment = await prisma.payment.create({
      data: {
        internId,
        paidTaskId: taskId,
        amount: paidTask.price,
        paymentType: 'PAID_TASK',
        qrCodeUrl
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment QR generated',
      data: { payment }
    });

  } catch (error) {
    console.error('Paid task payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// NOTIFICATIONS
// ==========================

router.get('/notifications', async (req, res) => {
  try {
    const internId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: internId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where: { userId: internId } })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const internId = req.user.id;

    const notification = await prisma.notification.update({
      where: {
        id,
        userId: internId
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/notifications/mark-all-read', async (req, res) => {
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
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;