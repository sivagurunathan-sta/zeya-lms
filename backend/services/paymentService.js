const Razorpay = require('razorpay');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const emailService = require('../utils/email');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  // Create payment order
  async createPaymentOrder(enrollmentId, userId) {
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
      throw new Error('Enrollment not found');
    }

    const enrollmentData = enrollment[0];

    // Verify ownership
    if (enrollmentData.student._id.toString() !== userId) {
      throw new Error('Unauthorized access to enrollment');
    }

    // Check payment status
    if (enrollmentData.paymentStatus === 'COMPLETED') {
      throw new Error('Payment already completed');
    }

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(enrollmentData.paymentAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `enrollment_${enrollmentId}_${Date.now()}`,
      payment_capture: 1
    };

    try {
      const order = await this.razorpay.orders.create(orderOptions);

      // Store payment record
      const paymentDoc = {
        enrollmentId: new ObjectId(enrollmentId),
        studentId: new ObjectId(userId),
        amount: enrollmentData.paymentAmount,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: order.id,
        razorpayPaymentId: null,
        status: 'PENDING',
        metadata: {
          internshipTitle: enrollmentData.internship.title,
          studentName: `${enrollmentData.student.firstName} ${enrollmentData.student.lastName}`,
          studentEmail: enrollmentData.student.email
        },
        createdAt: new Date(),
        paidAt: null,
        failedAt: null,
        failureReason: null
      };

      const result = await db.collection('payments').insertOne(paymentDoc);

      logger.info(`Payment order created: ${order.id} for enrollment ${enrollmentId}`);

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        name: 'Student LMS',
        description: `Payment for ${enrollmentData.internship.title}`,
        prefill: {
          name: `${enrollmentData.student.firstName} ${enrollmentData.student.lastName}`,
          email: enrollmentData.student.email,
          contact: enrollmentData.student.phone || ''
        },
        theme: {
          color: '#2563eb'
        },
        paymentId: result.insertedId.toString()
      };
    } catch (error) {
      logger.error('Razorpay order creation failed:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  // Process payment verification
  async verifyPayment(verificationData, userId) {
    const db = getDB();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      enrollmentId
    } = verificationData;

    // Verify signature
    if (!this.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      throw new Error('Payment signature verification failed');
    }

    // Get payment details from Razorpay
    try {
      const paymentDetails = await this.razorpay.payments.fetch(razorpay_payment_id);

      if (paymentDetails.status !== 'captured') {
        throw new Error('Payment not captured');
      }

      // Update payment and enrollment in transaction
      const session = await db.client.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Update payment record
          const paymentUpdate = await db.collection('payments').findOneAndUpdate(
            {
              enrollmentId: new ObjectId(enrollmentId),
              razorpayOrderId: razorpay_order_id
            },
            {
              $set: {
                razorpayPaymentId: razorpay_payment_id,
                status: 'COMPLETED',
                paidAt: new Date(),
                paymentDetails: {
                  method: paymentDetails.method,
                  bank: paymentDetails.bank,
                  wallet: paymentDetails.wallet,
                  vpa: paymentDetails.vpa,
                  cardId: paymentDetails.card_id
                },
                updatedAt: new Date()
              }
            },
            { 
              session,
              returnDocument: 'after'
            }
          );

          if (!paymentUpdate.value) {
            throw new Error('Payment record not found');
          }

          // Update enrollment
          const enrollmentUpdate = await db.collection('enrollments').findOneAndUpdate(
            { _id: new ObjectId(enrollmentId) },
            {
              $set: {
                paymentStatus: 'COMPLETED',
                paymentId: razorpay_payment_id,
                updatedAt: new Date()
              }
            },
            { 
              session,
              returnDocument: 'after'
            }
          );

          if (!enrollmentUpdate.value) {
            throw new Error('Enrollment not found');
          }

          return { payment: paymentUpdate.value, enrollment: enrollmentUpdate.value };
        });
      } finally {
        await session.endSession();
      }

      // Get enrollment details for notifications
      const enrollmentDetails = await db.collection('enrollments').aggregate([
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

      const enrollment = enrollmentDetails[0];

      // Send notifications
      try {
        // Email notification
        await emailService.sendPaymentConfirmation(
          enrollment.student,
          enrollment.internship,
          {
            paymentId: razorpay_payment_id,
            amount: enrollment.paymentAmount
          }
        );

        // In-app notification
        await notificationService.createPaymentNotification(
          userId,
          enrollment.internship.title,
          enrollment.paymentAmount
        );
      } catch (notificationError) {
        logger.error('Failed to send payment notifications:', notificationError);
      }

      logger.info(`Payment verified successfully: ${razorpay_payment_id} for enrollment ${enrollmentId}`);

      return {
        paymentId: razorpay_payment_id,
        status: 'COMPLETED',
        amount: enrollment.paymentAmount,
        currency: 'INR',
        paidAt: new Date()
      };
    } catch (error) {
      // Update payment status to failed
      await db.collection('payments').updateOne(
        {
          enrollmentId: new ObjectId(enrollmentId),
          razorpayOrderId: razorpay_order_id
        },
        {
          $set: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: error.message,
            updatedAt: new Date()
          }
        }
      );

      logger.error('Payment verification failed:', error);
      throw new Error('Payment verification failed');
    }
  }

  // Get payment history for user
  async getPaymentHistory(userId, pagination = {}) {
    const db = getDB();
    const { page = 1, limit = 10 } = pagination;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await db.collection('payments').aggregate([
      { $match: { studentId: new ObjectId(userId) } },
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1, thumbnail: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('payments').countDocuments({
      studentId: new ObjectId(userId)
    });

    return {
      payments: payments.map(payment => ({
        ...payment,
        id: payment._id.toString()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  // Process refund (Admin only)
  async processRefund(paymentId, refundAmount, reason, processedBy) {
    const db = getDB();

    // Get payment details
    const payment = await db.collection('payments').findOne({
      _id: new ObjectId(paymentId),
      status: 'COMPLETED'
    });

    if (!payment) {
      throw new Error('Payment not found or not eligible for refund');
    }

    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    // Check if already refunded
    const existingRefund = await db.collection('refunds').findOne({
      paymentId: new ObjectId(paymentId)
    });

    if (existingRefund) {
      throw new Error('Payment already refunded');
    }

    try {
      // Process refund through Razorpay
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100), // Convert to paise
        notes: {
          reason,
          processedBy
        }
      });

      // Create refund record
      const refundDoc = {
        paymentId: new ObjectId(paymentId),
        enrollmentId: payment.enrollmentId,
        studentId: payment.studentId,
        refundAmount: refundAmount,
        reason,
        razorpayRefundId: refund.id,
        status: refund.status,
        processedBy: new ObjectId(processedBy),
        processedAt: new Date(),
        createdAt: new Date()
      };

      const refundResult = await db.collection('refunds').insertOne(refundDoc);

      // Update payment record
      await db.collection('payments').updateOne(
        { _id: new ObjectId(paymentId) },
        {
          $set: {
            refundStatus: refund.status,
            refundAmount: refundAmount,
            refundId: refundResult.insertedId,
            updatedAt: new Date()
          }
        }
      );

      // Update enrollment if full refund
      if (refundAmount === payment.amount) {
        await db.collection('enrollments').updateOne(
          { _id: payment.enrollmentId },
          {
            $set: {
              paymentStatus: 'REFUNDED',
              status: 'CANCELLED',
              updatedAt: new Date()
            }
          }
        );
      }

      logger.info(`Refund processed: ${refund.id} for payment ${paymentId}`);

      return {
        refundId: refund.id,
        amount: refundAmount,
        status: refund.status,
        processedAt: new Date()
      };
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw new Error('Failed to process refund');
    }
  }

  // Handle webhook events
  async handleWebhook(event, payload) {
    const db = getDB();

    try {
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
        case 'refund.processed':
          await this.handleRefundProcessed(payload.refund.entity);
          break;
        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      logger.error(`Webhook processing failed for event ${event}:`, error);
      throw error;
    }
  }

  // Handle payment captured webhook
  async handlePaymentCaptured(paymentEntity) {
    const db = getDB();

    await db.collection('payments').updateOne(
      { razorpayPaymentId: paymentEntity.id },
      {
        $set: {
          status: 'COMPLETED',
          paidAt: new Date(paymentEntity.created_at * 1000),
          webhookProcessedAt: new Date()
        }
      }
    );

    logger.info(`Payment captured webhook processed: ${paymentEntity.id}`);
  }

  // Handle payment failed webhook
  async handlePaymentFailed(paymentEntity) {
    const db = getDB();

    await db.collection('payments').updateOne(
      { razorpayPaymentId: paymentEntity.id },
      {
        $set: {
          status: 'FAILED',
          failedAt: new Date(paymentEntity.created_at * 1000),
          failureReason: paymentEntity.error_description || 'Payment failed',
          webhookProcessedAt: new Date()
        }
      }
    );

    logger.info(`Payment failed webhook processed: ${paymentEntity.id}`);
  }

  // Handle refund processed webhook
  async handleRefundProcessed(refundEntity) {
    const db = getDB();

    await db.collection('refunds').updateOne(
      { razorpayRefundId: refundEntity.id },
      {
        $set: {
          status: 'processed',
          processedAt: new Date(refundEntity.created_at * 1000),
          webhookProcessedAt: new Date()
        }
      }
    );

    logger.info(`Refund processed webhook handled: ${refundEntity.id}`);
  }

  // Get payment analytics
  async getPaymentAnalytics(dateRange = {}) {
    const db = getDB();
    const { startDate, endDate } = dateRange;

    const matchStage = { status: 'COMPLETED' };
    if (startDate && endDate) {
      matchStage.paidAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await db.collection('payments').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransactionValue: { $avg: '$amount' }
        }
      }
    ]).toArray();

    // Revenue by month
    const monthlyRevenue = await db.collection('payments').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]).toArray();

    // Payment methods distribution
    const paymentMethods = await db.collection('payments').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentDetails.method',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    return {
      overview: analytics[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0
      },
      monthlyRevenue,
      paymentMethods
    };
  }

  // Generate payment report
  async generatePaymentReport(filters = {}) {
    const db = getDB();
    const { startDate, endDate, status, studentId } = filters;

    const matchStage = {};
    if (status) matchStage.status = status;
    if (studentId) matchStage.studentId = new ObjectId(studentId);
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await db.collection('payments').aggregate([
      { $match: matchStage },
      {
$lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          paymentId: '$razorpayPaymentId',
          orderId: '$razorpayOrderId',
          amount: 1,
          currency: 1,
          status: 1,
          studentName: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
          studentEmail: '$student.email',
          internshipTitle: '$internship.title',
          internshipCategory: '$internship.category',
          paymentMethod: '$paymentDetails.method',
          createdAt: 1,
          paidAt: 1
        }
      }
    ]).toArray();

    return payments;
  }
}

module.exports = new PaymentService();
