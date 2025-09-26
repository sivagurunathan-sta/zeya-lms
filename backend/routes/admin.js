// routes/admin.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { adminOnly } = require('../middleware/auth');
const { generateCertificate, generatePaymentQR } = require('../utils/helpers');

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin-only middleware to all routes
router.use(adminOnly);

// ==========================
// DASHBOARD & ANALYTICS
// ==========================

router.get('/dashboard', async (req, res) => {
  try {
    // Get dashboard statistics
    const [
      totalInterns,
      activeInternships,
      totalEnrollments,
      completedInternships,
      pendingSubmissions,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'INTERN' } }),
      prisma.internship.count({ where: { isActive: true } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { isCompleted: true } }),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      })
    ]);

    // Recent activities
    const recentSubmissions = await prisma.submission.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        intern: { select: { name: true, userId: true } },
        task: { select: { title: true, taskNumber: true } }
      }
    });

    // Monthly enrollment stats
    const monthlyStats = await prisma.enrollment.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
        }
      }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalInterns,
          activeInternships,
          totalEnrollments,
          completedInternships,
          pendingSubmissions,
          totalRevenue: totalRevenue._sum.amount || 0
        },
        recentSubmissions,
        monthlyStats
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// INTERN MANAGEMENT
// ==========================

router.get('/interns', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = {
      role: 'INTERN',
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { userId: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [interns, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              submissions: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        interns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get interns error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const intern = await prisma.user.findUnique({
      where: { id, role: 'INTERN' },
      include: {
        enrollments: {
          include: {
            internship: { select: { title: true, durationDays: true } },
            submissions: {
              include: {
                task: { select: { title: true, taskNumber: true } }
              }
            }
          }
        },
        payments: {
          include: {
            internship: { select: { title: true } },
            paidTask: { select: { title: true } }
          }
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.json({
      success: true,
      data: { intern }
    });

  } catch (error) {
    console.error('Get intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    const updatedIntern = await prisma.user.update({
      where: { id, role: 'INTERN' },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Intern updated successfully',
      data: { intern: updatedIntern }
    });

  } catch (error) {
    console.error('Update intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.delete('/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id, role: 'INTERN' }
    });

    res.json({
      success: true,
      message: 'Intern deleted successfully'
    });

  } catch (error) {
    console.error('Delete intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// INTERNSHIP MANAGEMENT
// ==========================

router.post('/internships', async (req, res) => {
  try {
    const {
      title,
      description,
      coverImage,
      durationDays = 35,
      passPercentage = 75.0,
      certificatePrice = 499
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    const internship = await prisma.internship.create({
      data: {
        title,
        description,
        coverImage,
        durationDays,
        passPercentage,
        certificatePrice
      }
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

router.get('/internships', async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
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
      data: { internships }
    });

  } catch (error) {
    console.error('Get internships error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/internships/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { taskNumber: 'asc' }
        },
        enrollments: {
          include: {
            intern: { select: { name: true, userId: true } }
          }
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
      data: { internship }
    });

  } catch (error) {
    console.error('Get internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

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

router.post('/internships/:internshipId/tasks', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const {
      taskNumber,
      title,
      description,
      videoUrl,
      files,
      isRequired = true,
      points = 100
    } = req.body;

    if (!taskNumber || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Task number, title, and description are required'
      });
    }

    const task = await prisma.task.create({
      data: {
        internshipId,
        taskNumber,
        title,
        description,
        videoUrl,
        files,
        isRequired,
        points
      }
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

router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id }
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
// SUBMISSION MANAGEMENT
// ==========================

router.get('/submissions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status })
    };

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          intern: { select: { name: true, userId: true } },
          task: { select: { title: true, taskNumber: true } },
          enrollment: {
            include: {
              internship: { select: { title: true } }
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
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
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

router.put('/submissions/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, adminFeedback, status } = req.body;

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        score,
        adminFeedback,
        status
      },
      include: {
        intern: { select: { name: true, userId: true } },
        task: { select: { title: true } }
      }
    });

    // Create notification for intern
    await prisma.notification.create({
      data: {
        userId: submission.internId,
        title: 'Submission Evaluated',
        message: `Your submission for "${submission.task.title}" has been ${status.toLowerCase()}`,
        type: status === 'APPROVED' ? 'SUCCESS' : status === 'REJECTED' ? 'ERROR' : 'INFO'
      }
    });

    res.json({
      success: true,
      message: 'Submission evaluated successfully',
      data: { submission }
    });

  } catch (error) {
    console.error('Evaluate submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// PAYMENT MANAGEMENT
// ==========================

router.get('/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        intern: { select: { name: true, userId: true } },
        internship: { select: { title: true } },
        paidTask: { select: { title: true } },
        verifier: { select: { name: true } }
      }
    });

    res.json({
      success: true,
      data: { payments }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/payments/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        paymentStatus: status,
        transactionId,
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      },
      include: {
        intern: { select: { name: true, userId: true } }
      }
    });

    // If certificate payment verified, generate certificate
    if (status === 'VERIFIED' && payment.paymentType === 'CERTIFICATE') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          internId: payment.internId,
          internshipId: payment.internshipId
        },
        include: {
          internship: true
        }
      });

      if (enrollment) {
        const certificateUrl = await generateCertificate(
          payment.intern,
          enrollment.internship
        );

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            certificatePurchased: true,
            certificateUrl
          }
        });
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: payment.internId,
        title: 'Payment Verified',
        message: `Your payment of ₹${payment.amount} has been verified`,
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { payment }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;