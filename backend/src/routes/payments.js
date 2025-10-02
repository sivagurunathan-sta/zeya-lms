const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { adminAuth, internAuth } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Certificate = require('../models/Certificate');
const Intern = require('../models/Intern');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const Task = require('../models/Task');

// Configure multer for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Intern: Check eligibility for certificate payment
router.get('/eligibility/:courseId', internAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const intern = await Intern.findById(req.intern._id);

    if (!intern.enrolledCourses.includes(courseId)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Check if all tasks are completed
    const totalTasks = await Task.countDocuments({ course: courseId });
    const completedTasks = await Submission.countDocuments({
      intern: intern._id,
      course: courseId,
      status: 'approved'
    });

    if (completedTasks < totalTasks) {
      return res.json({
        eligible: false,
        message: `Complete all ${totalTasks} tasks to be eligible for certificate`,
        completedTasks,
        totalTasks
      });
    }

    // Calculate final score
    const finalScore = intern.totalScore || 0;

    if (finalScore < 75) {
      return res.json({
        eligible: false,
        message: 'You need at least 75% score to purchase certificate',
        finalScore
      });
    }

    // Check if already purchased
    const existingPayment = await Payment.findOne({
      intern: intern._id,
      course: courseId,
      status: 'verified'
    });

    if (existingPayment) {
      return res.json({
        eligible: false,
        message: 'Certificate already purchased',
        alreadyPurchased: true
      });
    }

    const course = await Course.findById(courseId);

    res.json({
      eligible: true,
      finalScore,
      amount: course.price,
      completedTasks,
      totalTasks
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Intern: Submit payment for certificate
router.post('/submit', internAuth, upload.single('screenshot'), async (req, res) => {
  try {
    const { courseId, transactionId, amount } = req.body;

    const intern = await Intern.findById(req.intern._id);

    if (!intern.enrolledCourses.includes(courseId)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Check if already submitted payment
    const existingPayment = await Payment.findOne({
      intern: intern._id,
      course: courseId,
      status: { $in: ['pending', 'verified'] }
    });

    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already submitted or verified' });
    }

    const screenshot = req.file ? `/uploads/payments/${req.file.filename}` : '';

    const payment = new Payment({
      intern: intern._id,
      course: courseId,
      amount: parseFloat(amount),
      transactionId,
      screenshot,
      status: 'pending'
    });

    await payment.save();

    res.status(201).json({
      message: 'Payment submitted successfully! Admin will verify soon.',
      payment
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all payments
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('intern', 'name email userId')
      .populate('course', 'name price')
      .sort({ submittedAt: -1 });

    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Verify payment and issue certificate
router.post('/:id/verify', adminAuth, async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'rejected'

    const payment = await Payment.findById(req.params.id)
      .populate('intern')
      .populate('course');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment already processed' });
    }

    payment.status = status;
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.admin._id;
    await payment.save();

    if (status === 'verified') {
      // Generate certificate
      const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const certificate = new Certificate({
        intern: payment.intern._id,
        course: payment.course._id,
        certificateId,
        finalScore: payment.intern.totalScore || 0,
        issuedBy: req.admin._id
      });

      await certificate.save();

      // Update intern
      const intern = await Intern.findById(payment.intern._id);
      intern.hasCertificate = true;
      intern.certificatePurchased = true;
      await intern.save();

      res.json({
        message: 'Payment verified and certificate issued successfully!',
        payment,
        certificate
      });
    } else {
      res.json({
        message: 'Payment rejected',
        payment
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Intern: Get own payment status
router.get('/my/:courseId', internAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      intern: req.intern._id,
      course: req.params.courseId
    }).populate('course', 'name price');

    res.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;