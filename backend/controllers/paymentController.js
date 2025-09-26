const Razorpay = require('razorpay');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Create payment order
const createPaymentOrder = async (req, res, next) => {
  try {
    const { enrollmentId } = req.body;
    const db = getDB();

    // Get enrollment details
    const enrollment = await db.collection('enrollments').aggregate([
      { $match: { _id: new ObjectId(enrollmentId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: '$internship' }
    ]).toArray();

    if (!enrollment.length) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const enrollmentData = enrollment[0];

    if (enrollmentData.student._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (enrollmentData.paymentStatus === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Payment already completed' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, message: 'Payment is not configured' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(enrollmentData.paymentAmount * 100),
      currency: 'INR',
      receipt: `enrollment_${enrollmentId}`,
      payment_capture: 1
    });

    // Store payment record
    const paymentDoc = {
      enrollmentId: new ObjectId(enrollmentId),
      amount: enrollmentData.paymentAmount,
      currency: 'INR',
      paymentMethod: 'razorpay',
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      status: 'PENDING',
      paidAt: null,
      createdAt: new Date()
    };

    await db.collection('payments').insertOne(paymentDoc);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        name: 'Student LMS',
        description: `Payment for ${enrollmentData.internship.title}`,
        prefill: {
          name: `${enrollmentData.student.firstName} ${enrollmentData.student.lastName}`,
          email: enrollmentData.student.email,
          contact: enrollmentData.student.phone
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify payment
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, enrollmentId } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, message: 'Payment is not configured' });
    }

    const db = getDB();

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update payment and enrollment in transaction
    const session = db.client.startSession();

    try {
      await session.withTransaction(async () => {
        await db.collection('payments').updateOne(
          { enrollmentId: new ObjectId(enrollmentId), razorpayOrderId: razorpay_order_id },
          { $set: { razorpayPaymentId: razorpay_payment_id, status: 'COMPLETED', paidAt: new Date() } },
          { session }
        );

        await db.collection('enrollments').updateOne(
          { _id: new ObjectId(enrollmentId) },
          { $set: { paymentStatus: 'COMPLETED', paymentId: razorpay_payment_id, updatedAt: new Date() } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    const enrollment = await db.collection('enrollments').aggregate([
      { $match: { _id: new ObjectId(enrollmentId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: '$internship' }
    ]).toArray();

    const enrollmentData = enrollment[0];

    try {
      await sendEmail(
        enrollmentData.student.email,
        'Payment Successful - Student LMS',
        `Dear ${enrollmentData.student.firstName},

Your payment for ${enrollmentData.internship.title} has been processed successfully.

Payment ID: ${razorpay_payment_id}
Amount: ₹${enrollmentData.paymentAmount}

You can now access all course materials and start your learning journey!

Best regards,
Student LMS Team`
      );
    } catch (emailError) {
      logger.error('Failed to send payment confirmation email:', emailError);
    }

    res.json({ success: true, message: 'Payment verified successfully', data: { paymentId: razorpay_payment_id, status: 'COMPLETED' } });
  } catch (error) {
    next(error);
  }
};

// Get payment history
const getPaymentHistory = async (req, res, next) => {
  try {
    const db = getDB();

    const payments = await db.collection('payments').aggregate([
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      { $match: { 'enrollment.studentId': new ObjectId(req.user.id) } },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [{ $project: { title: 1 } }]
        }
      },
      { $unwind: '$internship' },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    res.json({ success: true, data: payments.map(payment => ({ ...payment, id: payment._id.toString() })) });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPaymentOrder, verifyPayment, getPaymentHistory };
