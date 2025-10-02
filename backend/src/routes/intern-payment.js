// backend/src/routes/intern-payment.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-proofs');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG) and PDF files are allowed'));
    }
  }
});

router.use(authenticateToken);

// ==================== GET PAYMENT STATUS ====================
router.get('/status/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const internId = req.user.id;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        internId
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

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        enrollment,
        payment: existingPayment,
        canPurchase: enrollment.certificateEligible && !enrollment.certificatePurchased
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
});

// ==================== INITIATE PAYMENT ====================
router.post('/initiate', async (req, res) => {
  try {
    const { enrollmentId } = req.body;
    const internId = req.user.id;

    // Verify enrollment and eligibility
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        internId,
        certificateEligible: true
      },
      include: {
        internship: true
      }
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Not eligible for certificate or enrollment not found'
      });
    }

    if (enrollment.certificatePurchased) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already purchased'
      });
    }

    // Check if pending payment exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING'
      }
    });

    if (existingPayment) {
      return res.json({
        success: true,
        message: 'Payment already initiated',
        data: existingPayment
      });
    }

    // Create new payment record
    const payment = await prisma.payment.create({
      data: {
        internId,
        internshipId: enrollment.internshipId,
        amount: enrollment.internship.certificatePrice,
        paymentType: 'CERTIFICATE',
        qrCodeUrl: '/uploads/qr-codes/payment-qr.png',
        paymentStatus: 'PENDING'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Payment Initiated',
        message: `Certificate payment of ₹${enrollment.internship.certificatePrice} initiated. Please complete the payment and submit proof.`,
        type: 'INFO'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: payment
    });

  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// ==================== SUBMIT PAYMENT PROOF ====================
router.post('/submit-proof', upload.single('paymentProof'), async (req, res) => {
  try {
    const {
      paymentId,
      upiTransactionId,
      upiId,
      paymentDate,
      paymentTime,
      remarks
    } = req.body;
    const internId = req.user.id;

    // Validate required fields
    if (!upiTransactionId || !upiId || !paymentDate || !paymentTime) {
      return res.status(400).json({
        success: false,
        message: 'All payment details are required'
      });
    }

    // Validate UPI Transaction ID (12 digits)
    if (!/^\d{12}$/.test(upiTransactionId)) {
      return res.status(400).json({
        success: false,
        message: 'UPI Transaction ID must be exactly 12 digits'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof screenshot is required'
      });
    }

    // Verify payment exists and belongs to user
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        internId
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
        transactionId: upiTransactionId,
        upiId: upiId,
        paymentProofUrl: `/uploads/payment-proofs/${req.file.filename}`,
        paymentProofSubmittedAt: new Date(),
        remarks: remarks || null,
        paymentStatus: 'PENDING' // Keep as pending for admin verification
      }
    });

    // Create notification for intern
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Payment Proof Submitted',
        message: 'Your payment proof has been submitted successfully. Our team will verify it within 24 hours.',
        type: 'SUCCESS'
      }
    });

    // Notify admin about new payment submission
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Payment Proof Submitted',
          message: `Payment proof submitted by intern. Transaction ID: ${upiTransactionId}`,
          type: 'WARNING'
        }
      });
    }

    res.json({
      success: true,
      message: 'Payment proof submitted successfully',
      data: updatedPayment
    });

  } catch (error) {
    console.error('Submit payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit payment proof',
      error: error.message
    });
  }
});

// ==================== GET MY PAYMENTS ====================
router.get('/my-payments', async (req, res) => {
  try {
    const internId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { internId },
      include: {
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

    res.json({
      success: true,
      data: payments
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

// ==================== RESUBMIT PAYMENT PROOF (After Rejection) ====================
router.post('/resubmit-proof', upload.single('paymentProof'), async (req, res) => {
  try {
    const {
      paymentId,
      upiTransactionId,
      upiId,
      paymentDate,
      paymentTime,
      remarks
    } = req.body;
    const internId = req.user.id;

    // Validate required fields
    if (!upiTransactionId || !upiId || !paymentDate || !paymentTime) {
      return res.status(400).json({
        success: false,
        message: 'All payment details are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof screenshot is required'
      });
    }

    // Verify payment exists and was rejected
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        internId,
        paymentStatus: 'REJECTED'
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not rejected'
      });
    }

    // Update payment with new proof
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transactionId: upiTransactionId,
        upiId: upiId,
        paymentProofUrl: `/uploads/payment-proofs/${req.file.filename}`,
        paymentProofSubmittedAt: new Date(),
        remarks: remarks || null,
        paymentStatus: 'PENDING',
        verificationMessage: null, // Clear previous rejection message
        verifiedBy: null,
        verifiedAt: null
      }
    });

    // Notify intern
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Payment Proof Resubmitted',
        message: 'Your updated payment proof has been submitted for verification.',
        type: 'INFO'
      }
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Payment Proof Resubmitted',
          message: `Payment proof resubmitted after rejection. Transaction ID: ${upiTransactionId}`,
          type: 'WARNING'
        }
      });
    }

    res.json({
      success: true,
      message: 'Payment proof resubmitted successfully',
      data: updatedPayment
    });

  } catch (error) {
    console.error('Resubmit payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubmit payment proof',
      error: error.message
    });
  }
});

module.exports = router;