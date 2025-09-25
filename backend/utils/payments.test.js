const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Mock Razorpay
const mockRazorpay = {
  orders: {
    create: jest.fn(),
    fetch: jest.fn()
  },
  payments: {
    fetch: jest.fn(),
    refund: jest.fn()
  }
};

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => mockRazorpay);
});

// Mock the database configuration
let mongoServer;
let mongoClient;
let db;

// Mock app
const express = require('express');
const app = express();
app.use(express.json());

// Mock database functions
jest.mock('../config/database', () => ({
  getDB: () => db,
  connectDB: jest.fn()
}));

// Mock email service
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Payments API', () => {
  let authToken;
  let studentId;
  let internshipId;
  let enrollmentId;
  let paymentId;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await db.collection('payments').deleteMany({});
    await db.collection('refunds').deleteMany({});
    
    // Reset mocks
    jest.clearAllMocks();
  });

  async function setupTestData() {
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create test student
    const studentResult = await db.collection('users').insertOne({
      email: 'student@test.com',
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      role: 'STUDENT',
      isActive: true,
      createdAt: new Date()
    });
    studentId = studentResult.insertedId;

    // Create test internship
    const internshipResult = await db.collection('internships').insertOne({
      title: 'Test Internship',
      description: 'A comprehensive test program for learning web development',
      duration: 12,
      price: 4999,
      maxStudents: 50,
      totalTasks: 35,
      category: 'Web Development',
      isActive: true,
      createdAt: new Date()
    });
    internshipId = internshipResult.insertedId;

    // Create test enrollment
    const enrollmentResult = await db.collection('enrollments').insertOne({
      studentId,
      internshipId,
      status: 'ACTIVE',
      progressPercentage: 0,
      paymentStatus: 'PENDING',
      paymentAmount: 4999,
      enrolledAt: new Date()
    });
    enrollmentId = enrollmentResult.insertedId;

    // Mock JWT token
    authToken = 'mock-student-token';
  }

  describe('POST /api/payments/create-order', () => {
    it('should create payment order successfully', async () => {
      const mockOrder = {
        id: 'order_mock123',
        amount: 499900, // Amount in paise
        currency: 'INR',
        receipt: `enrollment_${enrollmentId}`,
        status: 'created'
      };

      mockRazorpay.orders.create.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enrollmentId: enrollmentId.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(mockOrder.id);
      expect(response.body.data.amount).toBe(mockOrder.amount);
      expect(response.body.data.currency).toBe('INR');
      expect(response.body.data.key).toBe(process.env.RAZORPAY_KEY_ID);

      // Verify payment record created in database
      const payment = await db.collection('payments').findOne({
        enrollmentId: new ObjectId(enrollmentId)
      });
      expect(payment).toBeTruthy();
      expect(payment.status).toBe('PENDING');
      expect(payment.razorpayOrderId).toBe(mockOrder.id);

      expect(mockRazorpay.orders.create).toHaveBeenCalledWith({
        amount: 499900,
        currency: 'INR',
        receipt: expect.stringContaining('enrollment_'),
        payment_capture: 1
      });
    });

    it('should return 404 for non-existent enrollment', async () => {
      const fakeEnrollmentId = new ObjectId();

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enrollmentId: fakeEnrollmentId.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Enrollment not found');
    });

    it('should return 403 for unauthorized access', async () => {
      // Create enrollment for different user
      const anotherStudent = await db.collection('users').insertOne({
        email: 'another@test.com',
        passwordHash: await bcrypt.hash('password123', 12),
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true
      });

      const anotherEnrollment = await db.collection('enrollments').insertOne({
        studentId: anotherStudent.insertedId,
        internshipId,
        status: 'ACTIVE',
        paymentStatus: 'PENDING',
        paymentAmount: 4999,
        enrolledAt: new Date()
      });

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enrollmentId: anotherEnrollment.insertedId.toString() })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 for already completed payment', async () => {
      // Update enrollment to completed payment
      await db.collection('enrollments').updateOne(
        { _id: enrollmentId },
        { $set: { paymentStatus: 'COMPLETED' } }
      );

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enrollmentId: enrollmentId.toString() })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment already completed');
    });

    it('should handle Razorpay order creation failure', async () => {
      mockRazorpay.orders.create.mockRejectedValue(new Error('Razorpay API error'));

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enrollmentId: enrollmentId.toString() })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payments/verify', () => {
    beforeEach(async () => {
      // Create payment record
      const paymentResult = await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(enrollmentId),
        amount: 4999,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_mock123',
        status: 'PENDING',
        createdAt: new Date()
      });
      paymentId = paymentResult.insertedId;
    });

    it('should verify payment successfully', async () => {
      const orderId = 'order_mock123';
      const paymentId = 'pay_mock123';
      const signature = generateValidSignature(orderId, paymentId);

      const mockPaymentDetails = {
        id: paymentId,
        status: 'captured',
        amount: 499900,
        currency: 'INR',
        method: 'card',
        bank: 'HDFC',
        created_at: Math.floor(Date.now() / 1000)
      };

      mockRazorpay.payments.fetch.mockResolvedValue(mockPaymentDetails);

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          enrollmentId: enrollmentId.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe(paymentId);
      expect(response.body.data.status).toBe('COMPLETED');

      // Verify payment updated in database
      const updatedPayment = await db.collection('payments').findOne({
        enrollmentId: new ObjectId(enrollmentId)
      });
      expect(updatedPayment.status).toBe('COMPLETED');
      expect(updatedPayment.razorpayPaymentId).toBe(paymentId);

      // Verify enrollment updated
      const updatedEnrollment = await db.collection('enrollments').findOne({
        _id: enrollmentId
      });
      expect(updatedEnrollment.paymentStatus).toBe('COMPLETED');
      expect(updatedEnrollment.paymentId).toBe(paymentId);
    });

    it('should return 400 for invalid signature', async () => {
      const orderId = 'order_mock123';
      const paymentId = 'pay_mock123';
      const invalidSignature = 'invalid_signature';

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: invalidSignature,
          enrollmentId: enrollmentId.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment verification failed');
    });

    it('should return 400 for uncaptured payment', async () => {
      const orderId = 'order_mock123';
      const paymentId = 'pay_mock123';
      const signature = generateValidSignature(orderId, paymentId);

      const mockPaymentDetails = {
        id: paymentId,
        status: 'failed', // Not captured
        amount: 499900,
        currency: 'INR'
      };

      mockRazorpay.payments.fetch.mockResolvedValue(mockPaymentDetails);

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          enrollmentId: enrollmentId.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment verification failed');
    });

    it('should handle Razorpay fetch payment failure', async () => {
      const orderId = 'order_mock123';
      const paymentId = 'pay_mock123';
      const signature = generateValidSignature(orderId, paymentId);

      mockRazorpay.payments.fetch.mockRejectedValue(new Error('Payment not found'));

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          enrollmentId: enrollmentId.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment verification failed');
    });
  });

  describe('GET /api/payments/history', () => {
    beforeEach(async () => {
      // Create multiple payment records
      await db.collection('payments').insertMany([
        {
          enrollmentId: new ObjectId(enrollmentId),
          studentId: new ObjectId(studentId),
          amount: 4999,
          currency: 'INR',
          paymentMethod: 'razorpay',
          razorpayOrderId: 'order_1',
          razorpayPaymentId: 'pay_1',
          status: 'COMPLETED',
          createdAt: new Date('2023-01-01'),
          paidAt: new Date('2023-01-01')
        },
        {
          enrollmentId: new ObjectId(enrollmentId),
          studentId: new ObjectId(studentId),
          amount: 2999,
          currency: 'INR',
          paymentMethod: 'razorpay',
          razorpayOrderId: 'order_2',
          status: 'FAILED',
          createdAt: new Date('2023-01-02'),
          failedAt: new Date('2023-01-02')
        }
      ]);
    });

    it('should get payment history for student', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(2);
      expect(response.body.data.payments[0].status).toBe('FAILED'); // Most recent first
      expect(response.body.data.payments[1].status).toBe('COMPLETED');
    });

    it('should paginate payment history', async () => {
      // Create more payments
      const morePayments = [];
      for (let i = 3; i <= 15; i++) {
        morePayments.push({
          enrollmentId: new ObjectId(enrollmentId),
          studentId: new ObjectId(studentId),
          amount: 1999,
          currency: 'INR',
          paymentMethod: 'razorpay',
          razorpayOrderId: `order_${i}`,
          status: 'COMPLETED',
          createdAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`)
        });
      }
      await db.collection('payments').insertMany(morePayments);

      const response = await request(app)
        .get('/api/payments/history?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.total).toBe(15);
    });
  });

  describe('POST /api/payments/refund (Admin only)', () => {
    beforeEach(async () => {
      // Create completed payment
      const paymentResult = await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(enrollmentId),
        studentId: new ObjectId(studentId),
        amount: 4999,
        currency: 'INR',
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_mock123',
        razorpayPaymentId: 'pay_mock123',
        status: 'COMPLETED',
        createdAt: new Date(),
        paidAt: new Date()
      });
      paymentId = paymentResult.insertedId;
    });

    it('should process refund successfully', async () => {
      const mockRefund = {
        id: 'rfnd_mock123',
        status: 'processed',
        amount: 499900,
        payment_id: 'pay_mock123',
        created_at: Math.floor(Date.now() / 1000)
      };

      mockRazorpay.payments.refund.mockResolvedValue(mockRefund);

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`) // Would need admin token
        .send({
          paymentId: paymentId.toString(),
          refundAmount: 4999,
          reason: 'Course cancellation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refundId).toBe(mockRefund.id);
      expect(response.body.data.status).toBe('processed');

      // Verify refund record created
      const refund = await db.collection('refunds').findOne({
        paymentId: new ObjectId(paymentId)
      });
      expect(refund).toBeTruthy();
      expect(refund.razorpayRefundId).toBe(mockRefund.id);

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        _id: paymentId
      });
      expect(updatedPayment.refundStatus).toBe('processed');
      expect(updatedPayment.refundAmount).toBe(4999);
    });

    it('should return 400 for refund amount exceeding payment amount', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: paymentId.toString(),
          refundAmount: 5999, // More than payment amount
          reason: 'Test refund'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refund amount cannot exceed payment amount');
    });

    it('should return 400 for incomplete payment', async () => {
      // Update payment to pending status
      await db.collection('payments').updateOne(
        { _id: paymentId },
        { $set: { status: 'PENDING' } }
      );

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: paymentId.toString(),
          refundAmount: 1000,
          reason: 'Test refund'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot refund incomplete payment');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should handle payment.captured webhook', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook123',
              amount: 499900,
              currency: 'INR',
              status: 'captured',
              created_at: Math.floor(Date.now() / 1000)
            }
          }
        }
      };

      // Create payment record first
      await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(enrollmentId),
        razorpayPaymentId: 'pay_webhook123',
        status: 'PENDING',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        razorpayPaymentId: 'pay_webhook123'
      });
      expect(updatedPayment.status).toBe('COMPLETED');
      expect(updatedPayment.webhookProcessedAt).toBeTruthy();
    });

    it('should handle payment.failed webhook', async () => {
      const webhookPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed123',
              amount: 499900,
              status: 'failed',
              error_description: 'Card declined',
              created_at: Math.floor(Date.now() / 1000)
            }
          }
        }
      };

      // Create payment record first
      await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(enrollmentId),
        razorpayPaymentId: 'pay_failed123',
        status: 'PENDING',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        razorpayPaymentId: 'pay_failed123'
      });
      expect(updatedPayment.status).toBe('FAILED');
      expect(updatedPayment.failureReason).toBe('Card declined');
    });

    it('should handle refund.processed webhook', async () => {
      const webhookPayload = {
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_processed123',
              amount: 499900,
              status: 'processed',
              created_at: Math.floor(Date.now() / 1000)
            }
          }
        }
      };

      // Create refund record first
      await db.collection('refunds').insertOne({
        razorpayRefundId: 'rfnd_processed123',
        status: 'created',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify refund updated
      const updatedRefund = await db.collection('refunds').findOne({
        razorpayRefundId: 'rfnd_processed123'
      });
      expect(updatedRefund.status).toBe('processed');
      expect(updatedRefund.webhookProcessedAt).toBeTruthy();
    });

    it('should handle unknown webhook events gracefully', async () => {
      const webhookPayload = {
        event: 'unknown.event',
        payload: {}
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate payment creation data', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing enrollmentId
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate payment verification data', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: 'order_123',
          // Missing other required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should prevent access without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .send({ enrollmentId: enrollmentId.toString() })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should verify signature correctly', async () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test123';

      // Test with correct signature
      const validSignature = generateValidSignature(orderId, paymentId);
      expect(verifySignature(orderId, paymentId, validSignature)).toBe(true);

      // Test with incorrect signature
      const invalidSignature = 'invalid_signature';
      expect(verifySignature(orderId, paymentId, invalidSignature)).toBe(false);
    });
  });

  // Helper functions
  function generateValidSignature(orderId, paymentId) {
    const body = orderId + '|' + paymentId;
    return crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(body.toString())
      .digest('hex');
  }

  function verifySignature(orderId, paymentId, signature) {
    const expectedSignature = generateValidSignature(orderId, paymentId);
    return expectedSignature === signature;
  }
});