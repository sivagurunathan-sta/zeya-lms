// routes/payments.js - ENHANCED PAYMENT SYSTEM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { adminOnly, auth } = require('../middleware/auth');
const { generatePaymentQR } = require('../utils/helpers');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-proofs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPaymentProof = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed for payment proof'));
    }
  }
});

// ==========================
// INTERN PAYMENT ROUTES
// ==========================

// Get payment section for completed internship
router.get('/payment-section/:enrollmentId', auth, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { 
        id: enrollmentId,
        internId: userId 
      },
      include: {
        internship: {
          select: {
            title: true,
            certificatePrice: true
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

    if (!enrollment.isCompleted || !enrollment.certificateEligible) {
      return res.status(400).json({
        success: false,
        message: 'Complete all tasks to access payment section'
      });
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId: userId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE'
      }
    });

    if (existingPayment) {
      return res.json({
        success: true,
        data: {
          enrollment,
          payment: existingPayment,
          hasExistingPayment: true
        }
      });
    }

    // Generate QR code for new payment
    const paymentData = {
      amount: enrollment.internship.certificatePrice,
      internId: userId,
      internshipId: enrollment.internshipId,
      enrollmentId: enrollment.id,
      type: 'CERTIFICATE'
    };

    const qrCodeUrl = await generatePaymentQR(paymentData);

    const payment = await prisma.payment.create({
      data: {
        internId: userId,
        internshipId: enrollment.internshipId,
        amount: enrollment.internship.certificatePrice,
        paymentType: 'CERTIFICATE',
        qrCodeUrl,
        paymentStatus: 'PENDING'
      }
    });

    res.json({
      success: true,
      data: {
        enrollment,
        payment,
        hasExistingPayment: false
      }
    });

  } catch (error) {
    console.error('Get payment section error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Submit payment proof
router.post('/submit-proof/:paymentId', auth, uploadPaymentProof.single('paymentProof'), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, upiId, remarks } = req.body;
    const userId = req.user.id;

    if (!req.file || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof file and transaction ID are required'
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { 
        id: paymentId,
        internId: userId 
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

    // Update payment with proof details
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transactionId,
        upiId,
        paymentProofUrl: `/uploads/payment-proofs/${req.file.filename}`,
        paymentProofSubmittedAt: new Date(),
        remarks,
        paymentStatus: 'PENDING'
      }
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: userId,
        title: 'Payment Proof Submitted',
        message: `Payment proof submitted successfully. Transaction ID: ${transactionId}. Please wait for admin verification.`,
        type: 'INFO'
      }
    });

    // Create admin notification (to first admin found)
    const firstAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (firstAdmin) {
      await prisma.notification.create({
        data: {
          userId: firstAdmin.id,
          title: 'New Payment Verification Required',
          message: `Payment proof submitted by user ${req.user.name}. Transaction ID: ${transactionId}`,
          type: 'WARNING'
        }
      });
    }

    res.json({
      success: true,
      message: 'Payment proof submitted successfully',
      data: { payment: updatedPayment }
    });

  } catch (error) {
    console.error('Submit payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// ADMIN PAYMENT VERIFICATION
// ==========================

// Get all payments for verification
router.get('/admin/payments', adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.paymentStatus = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
          internship: {
            select: {
              title: true
            }
          },
          paidTask: {
            select: {
              title: true
            }
          },
          verifier: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get admin payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify payment
router.put('/admin/payments/:paymentId/verify', adminOnly, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, reviewMessage, verifiedTransactionId } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either VERIFIED or REJECTED'
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        intern: { select: { name: true } },
        internship: { select: { title: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: status,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        verificationMessage: reviewMessage,
        verifiedTransactionId: verifiedTransactionId || payment.transactionId
      }
    });

    if (status === 'VERIFIED') {
      // If certificate payment verified, enable certificate session
      if (payment.paymentType === 'CERTIFICATE') {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            internId: payment.internId,
            internshipId: payment.internshipId
          }
        });

        if (enrollment) {
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
              certificatePurchased: true,
              certificateSessionEnabled: true,
              certificateSessionEnabledAt: new Date()
            }
          });

          // Create certificate session
          await prisma.certificateSession.create({
            data: {
              enrollmentId: enrollment.id,
              internId: payment.internId,
              paymentId: payment.id,
              status: 'PENDING_UPLOAD',
              sessionStartedAt: new Date(),
              expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
          });
        }
      }

      // Send success notification to user
      await prisma.notification.create({
        data: {
          userId: payment.internId,
          title: 'Payment Verified Successfully',
          message: `Your payment of ₹${payment.amount} has been verified. ${payment.paymentType === 'CERTIFICATE' ? 'You will receive your certificate within 24 hours.' : ''}`,
          type: 'SUCCESS'
        }
      });
    } else {
      // Send rejection notification to user
      await prisma.notification.create({
        data: {
          userId: payment.internId,
          title: 'Payment Verification Failed',
          message: `Your payment verification was rejected. ${reviewMessage || 'Please check your payment details and resubmit.'}`,
          type: 'ERROR'
        }
      });
    }

    res.json({
      success: true,
      message: `Payment ${status.toLowerCase()} successfully`,
      data: { payment: updatedPayment }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// PAYMENT HISTORY & REPORTS
// ==========================

// Get payment analytics
router.get('/admin/payment-analytics', adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [
      totalPayments,
      verifiedPayments,
      pendingPayments,
      rejectedPayments,
      totalRevenue,
      certificatePayments,
      paidTaskPayments
    ] = await Promise.all([
      prisma.payment.count({ where: whereClause }),
      prisma.payment.count({ 
        where: { ...whereClause, paymentStatus: 'VERIFIED' } 
      }),
      prisma.payment.count({ 
        where: { ...whereClause, paymentStatus: 'PENDING' } 
      }),
      prisma.payment.count({ 
        where: { ...whereClause, paymentStatus: 'REJECTED' } 
      }),
      prisma.payment.aggregate({
        where: { ...whereClause, paymentStatus: 'VERIFIED' },
        _sum: { amount: true }
      }),
      prisma.payment.count({
        where: { ...whereClause, paymentType: 'CERTIFICATE' }
      }),
      prisma.payment.count({
        where: { ...whereClause, paymentType: 'PAID_TASK' }
      })
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        paymentStatus: 'VERIFIED',
        createdAt: {
          gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // Last 6 months
        }
      },
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalPayments,
          verifiedPayments,
          pendingPayments,
          rejectedPayments,
          totalRevenue: totalRevenue._sum.amount || 0,
          certificatePayments,
          paidTaskPayments
        },
        monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;