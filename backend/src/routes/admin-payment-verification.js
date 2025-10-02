// backend/src/routes/admin-payment-verification.js - COMPLETE VERSION
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { generateCertificateNumber } = require('../utils/helpers');

const prisma = new PrismaClient();

// Apply authentication and authorization middleware to all routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// ==================== GET ALL PAYMENTS ====================
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    // Filter by status
    if (status && status !== 'ALL') {
      where.paymentStatus = status;
    }

    // Search filter
    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { upiId: { contains: search, mode: 'insensitive' } },
        { intern: { name: { contains: search, mode: 'insensitive' } } },
        { intern: { userId: { contains: search, mode: 'insensitive' } } },
        { intern: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          intern: {
            select: {
              id: true,
              userId: true,
              name: true,
              email: true
            }
          },
          internship: {
            select: {
              id: true,
              title: true
            }
          },
          verifier: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Payments fetched successfully',
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

// ==================== GET PAYMENT STATISTICS ====================
router.get('/stats', async (req, res) => {
  try {
    const [pending, verified, rejected, totalRevenue] = await Promise.all([
      prisma.payment.count({ 
        where: { paymentStatus: 'PENDING' } 
      }),
      prisma.payment.count({ 
        where: { paymentStatus: 'VERIFIED' } 
      }),
      prisma.payment.count({ 
        where: { paymentStatus: 'REJECTED' } 
      }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      })
    ]);

    const total = pending + verified + rejected;

    res.json({
      success: true,
      message: 'Statistics fetched successfully',
      data: {
        pending,
        verified,
        rejected,
        total,
        totalRevenue: totalRevenue._sum.amount || 0
      }
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
});

// ==================== GET SINGLE PAYMENT DETAILS ====================
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        intern: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true
          }
        },
        internship: {
          select: {
            id: true,
            title: true,
            certificatePrice: true
          }
        },
        verifier: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get enrollment details for certificate eligibility
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        internId: payment.internId,
        internshipId: payment.internshipId
      },
      include: {
        internship: {
          select: {
            title: true,
            durationDays: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Payment details fetched successfully',
      data: {
        payment,
        enrollment
      }
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
});

// ==================== VERIFY PAYMENT ====================
router.post('/verify/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verifiedTransactionId, adminNotes } = req.body;
    const adminId = req.user.id;

    // Validate verified transaction ID
    if (!verifiedTransactionId || !/^\d{12}$/.test(verifiedTransactionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 12-digit verified transaction ID is required'
      });
    }

    // Get payment details
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        intern: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        internship: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.paymentStatus === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Payment already verified'
      });
    }

    // Get enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        internId: payment.internId,
        internshipId: payment.internshipId
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Start transaction for payment verification and certificate session creation
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'VERIFIED',
          verifiedBy: adminId,
          verifiedAt: new Date(),
          verifiedTransactionId: verifiedTransactionId,
          verificationMessage: adminNotes || 'Payment verified successfully'
        }
      });

      // Update enrollment
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          certificatePurchased: true,
          certificateSessionEnabled: true,
          certificateSessionEnabledAt: new Date()
        }
      });

      // Generate certificate number
      const certificateNumber = generateCertificateNumber();
      
      // Create certificate session
      const certificateSession = await tx.certificateSession.create({
        data: {
          enrollmentId: enrollment.id,
          internId: payment.internId,
          paymentId: payment.id,
          status: 'PENDING_UPLOAD',
          sessionStartedAt: new Date(),
          expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          certificateNumber: certificateNumber
        }
      });

      // Notify intern
      await tx.notification.create({
        data: {
          userId: payment.internId,
          title: '🎉 Payment Verified!',
          message: `Your payment of ₹${payment.amount} has been verified. Your certificate (${certificateNumber}) will be ready within 24 hours.`,
          type: 'SUCCESS'
        }
      });

      // Notify admin about certificate upload requirement
      await tx.notification.create({
        data: {
          userId: adminId,
          title: '📜 Certificate Upload Required',
          message: `Certificate needs to be uploaded for ${payment.intern.name} - ${payment.internship.title}. Certificate Number: ${certificateNumber}`,
          type: 'WARNING'
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_VERIFIED',
          userId: adminId,
          details: `Payment ${paymentId} verified. Transaction ID: ${verifiedTransactionId}. Certificate session created with number: ${certificateNumber}.`,
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      return { updatedPayment, certificateSession };
    });

    res.json({
      success: true,
      message: 'Payment verified successfully. Certificate session created.',
      data: result
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

// ==================== REJECT PAYMENT ====================
router.post('/reject/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    const adminId = req.user.id;

    if (!rejectionReason || rejectionReason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be at least 10 characters'
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        intern: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        internship: {
          select: {
            title: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.paymentStatus === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject verified payment'
      });
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        verificationMessage: rejectionReason,
        remarks: adminNotes || payment.remarks
      }
    });

    // Notify intern with rejection reason
    await prisma.notification.create({
      data: {
        userId: payment.internId,
        title: '❌ Payment Rejected',
        message: `Your payment proof was rejected.\n\nReason: ${rejectionReason}\n\nPlease correct the issue and resubmit your payment proof from your dashboard.`,
        type: 'ERROR'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_REJECTED',
        userId: adminId,
        details: `Payment ${paymentId} rejected. Reason: ${rejectionReason}`,
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    res.json({
      success: true,
      message: 'Payment rejected. Intern has been notified.',
      data: updatedPayment
    });

  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject payment',
      error: error.message
    });
  }
});

// ==================== BULK VERIFY PAYMENTS ====================
router.post('/bulk-verify', async (req, res) => {
  try {
    const { paymentIds, verifiedTransactionIds, adminNotes } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment IDs array is required'
      });
    }

    const results = {
      verified: [],
      failed: []
    };

    for (let i = 0; i < paymentIds.length; i++) {
      try {
        const paymentId = paymentIds[i];
        const verifiedTxnId = verifiedTransactionIds[i];

        if (!verifiedTxnId || !/^\d{12}$/.test(verifiedTxnId)) {
          results.failed.push({ 
            paymentId, 
            reason: 'Invalid transaction ID format' 
          });
          continue;
        }

        // Verify each payment
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: {
            intern: true,
            internship: true
          }
        });

        if (!payment) {
          results.failed.push({ 
            paymentId, 
            reason: 'Payment not found' 
          });
          continue;
        }

        if (payment.paymentStatus !== 'PENDING') {
          results.failed.push({ 
            paymentId, 
            reason: 'Payment already processed' 
          });
          continue;
        }

        // Get enrollment
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            internId: payment.internId,
            internshipId: payment.internshipId
          }
        });

        if (!enrollment) {
          results.failed.push({ 
            paymentId, 
            reason: 'Enrollment not found' 
          });
          continue;
        }

        // Perform verification in transaction
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: paymentId },
            data: {
              paymentStatus: 'VERIFIED',
              verifiedBy: adminId,
              verifiedAt: new Date(),
              verifiedTransactionId: verifiedTxnId,
              verificationMessage: adminNotes || 'Bulk verified'
            }
          });

          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: {
              certificatePurchased: true,
              certificateSessionEnabled: true,
              certificateSessionEnabledAt: new Date()
            }
          });

          const certificateNumber = generateCertificateNumber();
          
          await tx.certificateSession.create({
            data: {
              enrollmentId: enrollment.id,
              internId: payment.internId,
              paymentId: payment.id,
              status: 'PENDING_UPLOAD',
              sessionStartedAt: new Date(),
              expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              certificateNumber: certificateNumber
            }
          });

          await tx.notification.create({
            data: {
              userId: payment.internId,
              title: '🎉 Payment Verified!',
              message: `Your payment has been verified. Certificate (${certificateNumber}) will be ready within 24 hours.`,
              type: 'SUCCESS'
            }
          });
        });

        results.verified.push(paymentId);

      } catch (error) {
        results.failed.push({ 
          paymentId: paymentIds[i], 
          reason: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk verification completed. ${results.verified.length} verified, ${results.failed.length} failed.`,
      data: results
    });

  } catch (error) {
    console.error('Bulk verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk verify payments',
      error: error.message
    });
  }
});

// ==================== GET PAYMENT ANALYTICS ====================
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereClause = dateFilter.gte || dateFilter.lte 
      ? { createdAt: dateFilter } 
      : {};

    const [
      totalPayments,
      pendingPayments,
      verifiedPayments,
      rejectedPayments,
      totalRevenue,
      averageVerificationTime,
      recentPayments,
      dailyRevenue
    ] = await Promise.all([
      prisma.payment.count({ where: whereClause }),
      prisma.payment.count({ 
        where: { ...whereClause, paymentStatus: 'PENDING' } 
      }),
      prisma.payment.count({ 
        where: { ...whereClause, paymentStatus: 'VERIFIED' } 
      }),
      prisma.payment.count({ 
        where: { ...whereClause, paymentStatus: 'REJECTED' } 
      }),
      prisma.payment.aggregate({
        where: { ...whereClause, paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      }),
      prisma.payment.findMany({
        where: { 
          ...whereClause, 
          paymentStatus: 'VERIFIED', 
          verifiedAt: { not: null },
          paymentProofSubmittedAt: { not: null }
        },
        select: {
          paymentProofSubmittedAt: true,
          verifiedAt: true
        }
      }),
      prisma.payment.findMany({
        where: whereClause,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          intern: {
            select: { name: true, userId: true }
          },
          internship: {
            select: { title: true }
          }
        }
      }),
      prisma.payment.groupBy({
        by: ['createdAt'],
        where: { 
          ...whereClause, 
          paymentStatus: 'VERIFIED' 
        },
        _sum: {
          amount: true
        },
        _count: true
      })
    ]);

    // Calculate average verification time in hours
    let avgVerificationHours = 0;
    if (averageVerificationTime.length > 0) {
      const totalTime = averageVerificationTime.reduce((sum, payment) => {
        const diff = new Date(payment.verifiedAt) - new Date(payment.paymentProofSubmittedAt);
        return sum + diff;
      }, 0);
      avgVerificationHours = Math.round(totalTime / averageVerificationTime.length / (1000 * 60 * 60));
    }

    res.json({
      success: true,
      message: 'Analytics fetched successfully',
      data: {
        summary: {
          total: totalPayments,
          pending: pendingPayments,
          verified: verifiedPayments,
          rejected: rejectedPayments,
          totalRevenue: totalRevenue._sum.amount || 0,
          averageVerificationTime: avgVerificationHours,
          verificationRate: totalPayments > 0 
            ? Math.round((verifiedPayments / totalPayments) * 100) 
            : 0,
          rejectionRate: totalPayments > 0 
            ? Math.round((rejectedPayments / totalPayments) * 100) 
            : 0
        },
        recentPayments,
        dailyRevenue: dailyRevenue.map(day => ({
          date: day.createdAt,
          revenue: day._sum.amount,
          count: day._count
        }))
      }
    });

  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment analytics',
      error: error.message
    });
  }
});

// ==================== EXPORT PAYMENTS TO CSV ====================
router.get('/export/csv', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.paymentStatus = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        intern: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        },
        internship: {
          select: {
            title: true
          }
        },
        verifier: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Create CSV content
    const csvHeaders = [
      'Payment ID',
      'Intern ID',
      'Intern Name',
      'Intern Email',
      'Internship',
      'Amount',
      'Transaction ID',
      'UPI ID',
      'Status',
      'Submitted At',
      'Verified/Rejected At',
      'Verified By'
    ].join(',');

    const csvRows = payments.map(payment => [
      payment.id,
      payment.intern?.userId || '',
      payment.intern?.name || '',
      payment.intern?.email || '',
      payment.internship?.title || '',
      payment.amount,
      payment.transactionId || '',
      payment.upiId || '',
      payment.paymentStatus,
      payment.paymentProofSubmittedAt || '',
      payment.verifiedAt || '',
      payment.verifier?.name || ''
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export payments',
      error: error.message
    });
  }
});

module.exports = router;