// src/routes/payments.js
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
    cb(null, 'uploads/payments');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
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
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

router.use(authenticateToken);

// ===========================
// PAYMENT INITIATION
// ===========================

// Initiate certificate payment
router.post('/initiate-certificate', async (req, res) => {
  try {
    const { enrollmentId } = req.body;
    const internId = req.user.id;

    // Check enrollment and eligibility
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        internId,
        certificateEligible: true,
        certificatePurchased: false
      },
      include: {
        internship: true
      }
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Not eligible for certificate or already purchased'
      });
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE',
        paymentStatus: { in: ['PENDING', 'VERIFIED'] }
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this certificate'
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        internId,
        internshipId: enrollment.internshipId,
        amount: enrollment.internship.certificatePrice,
        paymentType: 'CERTIFICATE',
        qrCodeUrl: '/uploads/qr-codes/payment-qr.png', // Your UPI QR code
        paymentStatus: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated',
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

// Initiate paid task payment
router.post('/initiate-paid-task', async (req, res) => {
  try {
    const { paidTaskId } = req.body;
    const internId = req.user.id;

    // Get paid task
    const paidTask = await prisma.paidTask.findUnique({
      where: { id: paidTaskId }
    });

    if (!paidTask || !paidTask.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Paid task not found or inactive'
      });
    }

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: {
        internId,
        paidTaskId,
        paymentType: 'PAID_TASK',
        paymentStatus: 'VERIFIED'
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Already purchased this task'
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        internId,
        paidTaskId,
        amount: paidTask.price,
        paymentType: 'PAID_TASK',
        qrCodeUrl: '/uploads/qr-codes/payment-qr.png', // Your UPI QR code
        paymentStatus: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated',
      data: payment
    });

  } catch (error) {
    console.error('Initiate paid task payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// ===========================
// PAYMENT PROOF SUBMISSION
// ===========================

// Submit payment proof
router.post('/submit-proof/:paymentId', upload.single('paymentProof'), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, upiId } = req.body;
    const internId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof file is required'
      });
    }

    // Verify payment ownership
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        internId,
        paymentStatus: 'PENDING'
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed'
      });
    }

    // Update payment with proof
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transactionId,
        upiId,
        paymentProofUrl: `/uploads/payments/${req.file.filename}`,
        paymentProofSubmittedAt: new Date()
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: internId,
        title: 'Payment Proof Submitted',
        message: 'Your payment proof has been submitted and is under review.',
        type: 'INFO'
      }
    });

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

// ===========================
// PAYMENT STATUS
// ===========================

// Get payment status
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const internId = req.user.id;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        internId
      },
      include: {
        internship: { select: { title: true } },
        paidTask: { select: { title: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message
    });
  }
});

// Get all payments for current user
router.get('/', async (req, res) => {
  try {
    const internId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { internId },
      include: {
        internship: { select: { title: true } },
        paidTask: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
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

// ===========================
// PAID TASKS
// ===========================

// Get all paid tasks
router.get('/paid-tasks/list', async (req, res) => {
  try {
    const internId = req.user.id;

    const paidTasks = await prisma.paidTask.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // Check which tasks user has purchased
    const userPayments = await prisma.payment.findMany({
      where: {
        internId,
        paymentType: 'PAID_TASK',
        paymentStatus: 'VERIFIED'
      },
      select: { paidTaskId: true }
    });

    const purchasedTaskIds = userPayments.map(p => p.paidTaskId);

    const enrichedTasks = paidTasks.map(task => ({
      ...task,
      isPurchased: purchasedTaskIds.includes(task.id)
    }));

    res.json({
      success: true,
      data: enrichedTasks
    });

  } catch (error) {
    console.error('Get paid tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid tasks',
      error: error.message
    });
  }
});

// Get purchased paid tasks
router.get('/paid-tasks/purchased', async (req, res) => {
  try {
    const internId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: {
        internId,
        paymentType: 'PAID_TASK',
        paymentStatus: 'VERIFIED'
      },
      include: {
        paidTask: true
      }
    });

    const purchasedTasks = payments.map(p => p.paidTask);

    res.json({
      success: true,
      data: purchasedTasks
    });

  } catch (error) {
    console.error('Get purchased tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchased tasks',
      error: error.message
    });
  }
});

module.exports = router;