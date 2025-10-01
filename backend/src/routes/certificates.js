// ============================================
// BACKEND - src/routes/admin/certificates.js
// ============================================

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

// Multer configuration for certificate uploads
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

router.use(authenticateToken);
router.use(authorizeAdmin);

// ============================================
// 1. GET ALL PAYMENT VERIFICATIONS PENDING
// ============================================
router.get('/payments/pending', async (req, res) => {
  try {
    const pendingPayments = await prisma.payment.findMany({
      where: {
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING'
      },
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: pendingPayments
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending payments',
      error: error.message
    });
  }
});

// ============================================
// 2. VERIFY PAYMENT & CREATE CERTIFICATE SESSION
// ============================================
router.post('/payments/:paymentId/verify', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verifiedTransactionId, remarks } = req.body;

    // Verify payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        intern: true,
        internship: true
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

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'VERIFIED',
          verifiedBy: req.user.id,
          verifiedAt: new Date(),
          verifiedTransactionId,
          verificationMessage: remarks || 'Payment verified successfully'
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

      // Create certificate session
      const sessionStartedAt = new Date();
      const expectedDeliveryAt = new Date(sessionStartedAt.getTime() + 24 * 60 * 60 * 1000);

      const certificateSession = await tx.certificateSession.create({
        data: {
          enrollmentId: enrollment.id,
          internId: payment.internId,
          paymentId: payment.id,
          status: 'PENDING_UPLOAD',
          sessionStartedAt,
          expectedDeliveryAt
        }
      });

      // Create notification for intern
      await tx.notification.create({
        data: {
          userId: payment.internId,
          title: '🎉 Payment Verified!',
          message: `Your certificate payment has been verified. Your certificate will be ready within 24 hours (by ${expectedDeliveryAt.toLocaleString('en-IN')})`,
          type: 'SUCCESS'
        }
      });

      // Create notification for admin
      await tx.notification.create({
        data: {
          userId: req.user.id,
          title: '📜 Certificate Upload Required',
          message: `Please upload certificate for ${payment.intern.name} within 24 hours`,
          type: 'WARNING'
        }
      });

      return { updatedPayment, certificateSession };
    });

    res.json({
      success: true,
      message: 'Payment verified and certificate session created',
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

// ============================================
// 3. GET ALL CERTIFICATE SESSIONS
// ============================================
router.get('/certificate-sessions', async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const sessions = await prisma.certificateSession.findMany({
      where,
      include: {
        intern: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        },
        enrollment: {
          include: {
            internship: {
              select: {
                title: true
              }
            }
          }
        },
        payment: {
          select: {
            amount: true,
            transactionId: true
          }
        }
      },
      orderBy: {
        sessionStartedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Get certificate sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate sessions',
      error: error.message
    });
  }
});

// ============================================
// 4. UPLOAD CERTIFICATE TO INTERN
// ============================================
router.post('/certificate-sessions/:sessionId/upload', upload.single('certificate'), async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Certificate file is required'
      });
    }

    const session = await prisma.certificateSession.findUnique({
      where: { id: sessionId },
      include: {
        intern: true,
        enrollment: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Certificate session not found'
      });
    }

    if (session.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Certificate already uploaded'
      });
    }

    // Generate certificate number
    const count = await prisma.certificateSession.count({
      where: { status: 'COMPLETED' }
    });
    const certificateNumber = `CERT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const certificateUrl = `/uploads/certificates/${req.file.filename}`;

    // Update session and enrollment
    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.certificateSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          certificateUrl,
          certificateNumber,
          issuedAt: new Date(),
          uploadedBy: req.user.id,
          uploadedAt: new Date()
        }
      });

      await tx.enrollment.update({
        where: { id: session.enrollmentId },
        data: {
          certificateUrl,
          certificateNumber,
          certificateIssuedAt: new Date()
        }
      });

      // Notify intern
      await tx.notification.create({
        data: {
          userId: session.internId,
          title: '🎓 Certificate Ready!',
          message: `Congratulations! Your certificate is now available for download. Certificate Number: ${certificateNumber}`,
          type: 'SUCCESS'
        }
      });

      return updatedSession;
    });

    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: result
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

// ============================================
// 5. GET PAID TASK CERTIFICATE VALIDATIONS
// ============================================
router.get('/certificate-validations', async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const validations = await prisma.certificateValidation.findMany({
      where,
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: validations
    });

  } catch (error) {
    console.error('Get certificate validations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate validations',
      error: error.message
    });
  }
});

// ============================================
// 6. VALIDATE/REJECT CERTIFICATE FOR PAID TASKS
// ============================================
router.post('/certificate-validations/:validationId/review', async (req, res) => {
  try {
    const { validationId } = req.params;
    const { isValid, reviewMessage } = req.body;

    const validation = await prisma.certificateValidation.findUnique({
      where: { id: validationId },
      include: {
        user: true
      }
    });

    if (!validation) {
      return res.status(404).json({
        success: false,
        message: 'Validation not found'
      });
    }

    if (validation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Validation already reviewed'
      });
    }

    // Verify certificate number exists in our system
    let certificateExists = false;
    if (isValid) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          certificateNumber: validation.certificateNumber,
          internId: validation.userId
        }
      });
      certificateExists = !!enrollment;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedValidation = await tx.certificateValidation.update({
        where: { id: validationId },
        data: {
          status: isValid && certificateExists ? 'APPROVED' : 'REJECTED',
          isValid: isValid && certificateExists,
          reviewMessage: isValid && certificateExists 
            ? reviewMessage || 'Certificate verified successfully. You now have access to paid tasks!'
            : reviewMessage || 'Certificate verification failed. Please ensure you upload the correct certificate issued by our system.',
          reviewedAt: new Date(),
          reviewedBy: req.user.id
        }
      });

      // Update chat permission if approved
      if (isValid && certificateExists) {
        await tx.chatPermission.upsert({
          where: { userId: validation.userId },
          update: {
            isEnabled: true,
            enabledAt: new Date(),
            enabledBy: req.user.id
          },
          create: {
            userId: validation.userId,
            isEnabled: true,
            enabledAt: new Date(),
            enabledBy: req.user.id
          }
        });
      }

      // Notify intern
      await tx.notification.create({
        data: {
          userId: validation.userId,
          title: isValid && certificateExists ? '✅ Certificate Verified!' : '❌ Certificate Rejected',
          message: isValid && certificateExists
            ? `Your certificate has been verified! You can now access paid tasks (₹1000 each).`
            : `Certificate validation failed: ${reviewMessage || 'Please upload the correct certificate.'}`,
          type: isValid && certificateExists ? 'SUCCESS' : 'ERROR'
        }
      });

      return updatedValidation;
    });

    res.json({
      success: true,
      message: isValid && certificateExists ? 'Certificate approved' : 'Certificate rejected',
      data: result
    });

  } catch (error) {
    console.error('Review certificate validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review certificate',
      error: error.message
    });
  }
});

// ============================================
// 7. GET CERTIFICATE STATISTICS
// ============================================
router.get('/statistics', async (req, res) => {
  try {
    const [
      totalIssued,
      pendingUpload,
      issuedToday,
      pendingValidations,
      approvedValidations,
      rejectedValidations
    ] = await Promise.all([
      prisma.certificateSession.count({ where: { status: 'COMPLETED' } }),
      prisma.certificateSession.count({ where: { status: 'PENDING_UPLOAD' } }),
      prisma.certificateSession.count({
        where: {
          status: 'COMPLETED',
          issuedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.certificateValidation.count({ where: { status: 'PENDING' } }),
      prisma.certificateValidation.count({ where: { status: 'APPROVED' } }),
      prisma.certificateValidation.count({ where: { status: 'REJECTED' } })
    ]);

    res.json({
      success: true,
      data: {
        certificates: {
          totalIssued,
          pendingUpload,
          issuedToday
        },
        validations: {
          pending: pendingValidations,
          approved: approvedValidations,
          rejected: rejectedValidations
        }
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;