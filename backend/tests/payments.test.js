const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const PaymentService = require('../services/paymentService');

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

// Mock database
let mongoServer;
let mongoClient;
let db;

jest.mock('../config/database', () => ({
  getDB: () => db,
  connectDB: jest.fn()
}));

// Mock services
jest.mock('../services/emailService', () => ({
  sendPaymentConfirmation: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../services/notificationService', () => ({
  createPaymentNotification: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('PaymentService', () => {
  let testUserId;
  let testInternshipId;
  let testEnrollmentId;
  let testPaymentId;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db();

    // Set up environment variables
    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    await setupTestData();
  });

  afterAll(async () => {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear payment collections
    await db.collection('payments').deleteMany({});
    await db.collection('refunds').deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  async function setupTestData() {
    // Create test user
    const userResult = await db.collection('users').insertOne({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      role: 'STUDENT',
      isActive: true,
      createdAt: new Date()
    });
    testUserId = userResult.insertedId.toString();

    // Create test internship
    const internshipResult = await db.collection('internships').insertOne({
      title: 'Test Internship',
      description: 'Test description',
      price: 4999,
      category: 'Web Development',
      isActive: true,
      createdAt: new Date()
    });
    testInternshipId = internshipResult.insertedId.toString();

    // Create test enrollment
    const enrollmentResult = await db.collection('enrollments').insertOne({
      studentId: new ObjectId(testUserId),
      internshipId: new ObjectId(testInternshipId),
      status: 'ACTIVE',
      paymentStatus: 'PENDING',
      paymentAmount: 4999,
      enrolledAt: new Date()
    });
    testEnrollmentId = enrollmentResult.insertedId.toString();
  }

  describe('createPaymentOrder', () => {
    it('should create payment order successfully', async () => {
      const mockOrder = {
        id: 'order_test123',
        amount: 499900,
        currency: 'INR',
        receipt: `enrollment_${testEnrollmentId}`,
        status: 'created'
      };

      mockRazorpay.orders.create.mockResolvedValue(mockOrder);

      const result = await PaymentService.createPaymentOrder(testEnrollmentId, testUserId);

      expect(result.orderId).toBe(mockOrder.id);
      expect(result.amount).toBe(mockOrder.amount);
      expect(result.currency).toBe('INR');
      expect(result.key).toBe(process.env.RAZORPAY_KEY_ID);
      expect(result.prefill.name).toBe('John Doe');
      expect(result.prefill.email).toBe('test@example.com');

      // Verify payment record created
      const payment = await db.collection('payments').findOne({
        enrollmentId: new ObjectId(testEnrollmentId)
      });
      expect(payment).toBeTruthy();
      expect(payment.status).toBe('PENDING');
      expect(payment.amount).toBe(4999);

      expect(mockRazorpay.orders.create).toHaveBeenCalledWith({
        amount: 499900,
        currency: 'INR',
        receipt: expect.stringContaining('enrollment_'),
        payment_capture: 1
      });
    });

    it('should throw error for non-existent enrollment', async () => {
      const fakeEnrollmentId = new ObjectId().toString();

      await expect(
        PaymentService.createPaymentOrder(fakeEnrollmentId, testUserId)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error for unauthorized access', async () => {
      const anotherUserId = new ObjectId().toString();

      await expect(
        PaymentService.createPaymentOrder(testEnrollmentId, anotherUserId)
      ).rejects.toThrow('Unauthorized access to enrollment');
    });

    it('should throw error for already completed payment', async () => {
      await db.collection('enrollments').updateOne(
        { _id: new ObjectId(testEnrollmentId) },
        { $set: { paymentStatus: 'COMPLETED' } }
      );

      await expect(
        PaymentService.createPaymentOrder(testEnrollmentId, testUserId)
      ).rejects.toThrow('Payment already completed');
    });

    it('should handle Razorpay API failure', async () => {
      mockRazorpay.orders.create.mockRejectedValue(new Error('Razorpay API error'));

      await expect(
        PaymentService.createPaymentOrder(testEnrollmentId, testUserId)
      ).rejects.toThrow('Failed to create payment order');
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify valid signature correctly', () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test123';
      const body = orderId + '|' + paymentId;
      const validSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const result = PaymentService.verifyPaymentSignature(orderId, paymentId, validSignature);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test123';
      const invalidSignature = 'invalid_signature';

      const result = PaymentService.verifyPaymentSignature(orderId, paymentId, invalidSignature);
      expect(result).toBe(false);
    });
  });

  describe('verifyPayment', () => {
    let paymentRecord;

    beforeEach(async () => {
      const paymentResult = await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(testEnrollmentId),
        studentId: new ObjectId(testUserId),
        amount: 4999,
        currency: 'INR',
        razorpayOrderId: 'order_test123',
        status: 'PENDING',
        createdAt: new Date()
      });
      paymentRecord = paymentResult.insertedId;
    });

    it('should verify payment successfully', async () => {
      const verificationData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: generateValidSignature('order_test123', 'pay_test123'),
        enrollmentId: testEnrollmentId
      };

      const mockPaymentDetails = {
        id: 'pay_test123',
        status: 'captured',
        amount: 499900,
        currency: 'INR',
        method: 'card',
        bank: 'HDFC'
      };

      mockRazorpay.payments.fetch.mockResolvedValue(mockPaymentDetails);

      // Mock transaction session
      const mockSession = {
        withTransaction: jest.fn().mockImplementation(async (callback) => {
          return await callback();
        }),
        endSession: jest.fn()
      };
      db.client = { startSession: jest.fn().mockResolvedValue(mockSession) };

      const result = await PaymentService.verifyPayment(verificationData, testUserId);

      expect(result.paymentId).toBe('pay_test123');
      expect(result.status).toBe('COMPLETED');
      expect(result.amount).toBe(4999);

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        enrollmentId: new ObjectId(testEnrollmentId)
      });
      expect(updatedPayment.status).toBe('COMPLETED');
      expect(updatedPayment.razorpayPaymentId).toBe('pay_test123');

      // Verify enrollment updated
      const updatedEnrollment = await db.collection('enrollments').findOne({
        _id: new ObjectId(testEnrollmentId)
      });
      expect(updatedEnrollment.paymentStatus).toBe('COMPLETED');
    });

    it('should reject invalid signature', async () => {
      const verificationData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: 'invalid_signature',
        enrollmentId: testEnrollmentId
      };

      await expect(
        PaymentService.verifyPayment(verificationData, testUserId)
      ).rejects.toThrow('Payment signature verification failed');
    });

    it('should reject uncaptured payment', async () => {
      const verificationData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: generateValidSignature('order_test123', 'pay_test123'),
        enrollmentId: testEnrollmentId
      };

      const mockPaymentDetails = {
        id: 'pay_test123',
        status: 'failed',
        amount: 499900,
        currency: 'INR'
      };

      mockRazorpay.payments.fetch.mockResolvedValue(mockPaymentDetails);

      await expect(
        PaymentService.verifyPayment(verificationData, testUserId)
      ).rejects.toThrow('Payment verification failed');

      // Verify payment marked as failed
      const failedPayment = await db.collection('payments').findOne({
        enrollmentId: new ObjectId(testEnrollmentId)
      });
      expect(failedPayment.status).toBe('FAILED');
    });

    it('should handle Razorpay fetch failure', async () => {
      const verificationData = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test123',
        razorpay_signature: generateValidSignature('order_test123', 'pay_test123'),
        enrollmentId: testEnrollmentId
      };

      mockRazorpay.payments.fetch.mockRejectedValue(new Error('Payment not found'));

      await expect(
        PaymentService.verifyPayment(verificationData, testUserId)
      ).rejects.toThrow('Payment verification failed');
    });
  });

  describe('getPaymentHistory', () => {
    beforeEach(async () => {
      // Create test payments
      await db.collection('payments').insertMany([
        {
          enrollmentId: new ObjectId(testEnrollmentId),
          studentId: new ObjectId(testUserId),
          amount: 4999,
          currency: 'INR',
          status: 'COMPLETED',
          razorpayPaymentId: 'pay_1',
          createdAt: new Date('2023-01-01')
        },
        {
          enrollmentId: new ObjectId(testEnrollmentId),
          studentId: new ObjectId(testUserId),
          amount: 2999,
          currency: 'INR',
          status: 'FAILED',
          createdAt: new Date('2023-01-02')
        }
      ]);

      // Create internship data for lookup
      await db.collection('internships').insertOne({
        _id: new ObjectId(testInternshipId),
        title: 'Test Internship',
        category: 'Web Development'
      });
    });

    it('should get payment history for user', async () => {
      const result = await PaymentService.getPaymentHistory(testUserId);

      expect(result.payments).toHaveLength(2);
      expect(result.payments[0].status).toBe('FAILED'); // Most recent first
      expect(result.payments[1].status).toBe('COMPLETED');
      expect(result.payments[0].internship.title).toBe('Test Internship');
      expect(result.pagination.total).toBe(2);
    });

    it('should paginate payment history', async () => {
      // Create more payments
      const morePayments = [];
      for (let i = 3; i <= 12; i++) {
        morePayments.push({
          enrollmentId: new ObjectId(testEnrollmentId),
          studentId: new ObjectId(testUserId),
          amount: 1999,
          currency: 'INR',
          status: 'COMPLETED',
          createdAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`)
        });
      }
      await db.collection('payments').insertMany(morePayments);

      const result = await PaymentService.getPaymentHistory(testUserId, { page: 2, limit: 5 });

      expect(result.payments).toHaveLength(5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total).toBe(12);
    });

    it('should return empty array for user with no payments', async () => {
      await db.collection('payments').deleteMany({});

      const result = await PaymentService.getPaymentHistory(testUserId);

      expect(result.payments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('processRefund', () => {
    let completedPaymentId;

    beforeEach(async () => {
      const paymentResult = await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(testEnrollmentId),
        studentId: new ObjectId(testUserId),
        amount: 4999,
        currency: 'INR',
        razorpayPaymentId: 'pay_completed123',
        status: 'COMPLETED',
        createdAt: new Date(),
        paidAt: new Date()
      });
      completedPaymentId = paymentResult.insertedId.toString();
    });

    it('should process refund successfully', async () => {
      const mockRefund = {
        id: 'rfnd_test123',
        status: 'processed',
        amount: 499900,
        payment_id: 'pay_completed123'
      };

      mockRazorpay.payments.refund.mockResolvedValue(mockRefund);

      const adminId = new ObjectId().toString();
      const result = await PaymentService.processRefund(
        completedPaymentId,
        4999,
        'Course cancellation',
        adminId
      );

      expect(result.refundId).toBe(mockRefund.id);
      expect(result.amount).toBe(4999);
      expect(result.status).toBe('processed');

      // Verify refund record created
      const refund = await db.collection('refunds').findOne({
        paymentId: new ObjectId(completedPaymentId)
      });
      expect(refund).toBeTruthy();
      expect(refund.razorpayRefundId).toBe(mockRefund.id);
      expect(refund.reason).toBe('Course cancellation');

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        _id: new ObjectId(completedPaymentId)
      });
      expect(updatedPayment.refundStatus).toBe('processed');
      expect(updatedPayment.refundAmount).toBe(4999);
    });

    it('should reject refund for non-existent payment', async () => {
      const fakePaymentId = new ObjectId().toString();

      await expect(
        PaymentService.processRefund(fakePaymentId, 1000, 'Test', new ObjectId().toString())
      ).rejects.toThrow('Payment not found or not eligible for refund');
    });

    it('should reject refund amount exceeding payment amount', async () => {
      await expect(
        PaymentService.processRefund(
          completedPaymentId,
          5999, // More than payment amount
          'Test',
          new ObjectId().toString()
        )
      ).rejects.toThrow('Refund amount cannot exceed payment amount');
    });

    it('should reject refund for already refunded payment', async () => {
      // Create existing refund
      await db.collection('refunds').insertOne({
        paymentId: new ObjectId(completedPaymentId),
        refundAmount: 1000,
        status: 'processed'
      });

      await expect(
        PaymentService.processRefund(
          completedPaymentId,
          1000,
          'Test',
          new ObjectId().toString()
        )
      ).rejects.toThrow('Payment already refunded');
    });

    it('should handle Razorpay refund failure', async () => {
      mockRazorpay.payments.refund.mockRejectedValue(new Error('Refund failed'));

      await expect(
        PaymentService.processRefund(
          completedPaymentId,
          1000,
          'Test',
          new ObjectId().toString()
        )
      ).rejects.toThrow('Failed to process refund');
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment.captured webhook', async () => {
      const paymentEntity = {
        id: 'pay_webhook123',
        amount: 499900,
        status: 'captured',
        created_at: Math.floor(Date.now() / 1000)
      };

      // Create payment record
      await db.collection('payments').insertOne({
        razorpayPaymentId: 'pay_webhook123',
        status: 'PENDING',
        createdAt: new Date()
      });

      await PaymentService.handleWebhook('payment.captured', { payment: { entity: paymentEntity } });

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        razorpayPaymentId: 'pay_webhook123'
      });
      expect(updatedPayment.status).toBe('COMPLETED');
      expect(updatedPayment.webhookProcessedAt).toBeTruthy();
    });

    it('should handle payment.failed webhook', async () => {
      const paymentEntity = {
        id: 'pay_failed123',
        status: 'failed',
        error_description: 'Card declined',
        created_at: Math.floor(Date.now() / 1000)
      };

      // Create payment record
      await db.collection('payments').insertOne({
        razorpayPaymentId: 'pay_failed123',
        status: 'PENDING',
        createdAt: new Date()
      });

      await PaymentService.handleWebhook('payment.failed', { payment: { entity: paymentEntity } });

      // Verify payment updated
      const updatedPayment = await db.collection('payments').findOne({
        razorpayPaymentId: 'pay_failed123'
      });
      expect(updatedPayment.status).toBe('FAILED');
      expect(updatedPayment.failureReason).toBe('Card declined');
    });

    it('should handle refund.processed webhook', async () => {
      const refundEntity = {
        id: 'rfnd_processed123',
        status: 'processed',
        created_at: Math.floor(Date.now() / 1000)
      };

      // Create refund record
      await db.collection('refunds').insertOne({
        razorpayRefundId: 'rfnd_processed123',
        status: 'created',
        createdAt: new Date()
      });

      await PaymentService.handleWebhook('refund.processed', { refund: { entity: refundEntity } });

      // Verify refund updated
      const updatedRefund = await db.collection('refunds').findOne({
        razorpayRefundId: 'rfnd_processed123'
      });
      expect(updatedRefund.status).toBe('processed');
      expect(updatedRefund.webhookProcessedAt).toBeTruthy();
    });

    it('should handle unknown webhook events gracefully', async () => {
      await expect(
        PaymentService.handleWebhook('unknown.event', {})
      ).resolves.not.toThrow();
    });
  });

  describe('getPaymentAnalytics', () => {
    beforeEach(async () => {
      await db.collection('payments').insertMany([
        {
          amount: 4999,
          currency: 'INR',
          status: 'COMPLETED',
          paymentDetails: { method: 'card' },
          paidAt: new Date('2023-01-15')
        },
        {
          amount: 2999,
          currency: 'INR',
          status: 'COMPLETED',
          paymentDetails: { method: 'netbanking' },
          paidAt: new Date('2023-02-15')
        },
        {
          amount: 1999,
          currency: 'INR',
          status: 'FAILED',
          createdAt: new Date('2023-01-20')
        }
      ]);
    });

    it('should get payment analytics', async () => {
      const result = await PaymentService.getPaymentAnalytics();

      expect(result.overview.totalRevenue).toBe(7998); // 4999 + 2999
      expect(result.overview.totalTransactions).toBe(2); // Only completed
      expect(result.overview.averageTransactionValue).toBe(3999);
      expect(result.monthlyRevenue).toBeDefined();
      expect(result.paymentMethods).toBeDefined();
    });

    it('should filter analytics by date range', async () => {
      const result = await PaymentService.getPaymentAnalytics({
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      });

      expect(result.overview.totalRevenue).toBe(4999); // Only January payment
      expect(result.overview.totalTransactions).toBe(1);
    });
  });

  describe('generatePaymentReport', () => {
    beforeEach(async () => {
      // Create test users and payments for report
      const studentResult = await db.collection('users').insertOne({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com'
      });

      await db.collection('payments').insertMany([
        {
          enrollmentId: new ObjectId(testEnrollmentId),
          studentId: studentResult.insertedId,
          amount: 3999,
          currency: 'INR',
          status: 'COMPLETED',
          razorpayPaymentId: 'pay_report1',
          createdAt: new Date('2023-01-15')
        },
        {
          enrollmentId: new ObjectId(testEnrollmentId),
          studentId: new ObjectId(testUserId),
          amount: 2999,
          currency: 'INR',
          status: 'FAILED',
          createdAt: new Date('2023-01-20')
        }
      ]);
    });

    it('should generate payment report', async () => {
      const result = await PaymentService.generatePaymentReport();

      expect(result).toHaveLength(2);
      expect(result[0].studentName).toBeDefined();
      expect(result[0].amount).toBeDefined();
      expect(result[0].status).toBeDefined();
    });

    it('should filter report by status', async () => {
      const result = await PaymentService.generatePaymentReport({ status: 'COMPLETED' });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('COMPLETED');
    });

    it('should filter report by date range', async () => {
      const result = await PaymentService.generatePaymentReport({
        startDate: '2023-01-01',
        endDate: '2023-01-16'
      });

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(3999);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing environment variables', () => {
      const originalKeyId = process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_ID;

      expect(() => {
        new PaymentService.constructor();
      }).toThrow();

      process.env.RAZORPAY_KEY_ID = originalKeyId;
    });

    it('should handle database connection errors', async () => {
      // Close database connection
      await mongoClient.close();

      await expect(
        PaymentService.getPaymentHistory(testUserId)
      ).rejects.toThrow();

      // Reconnect for other tests
      mongoClient = new MongoClient(mongoServer.getUri());
      await mongoClient.connect();
      db = mongoClient.db();
    });

    it('should handle concurrent payment processing', async () => {
      const verificationData = {
        razorpay_order_id: 'order_concurrent123',
        razorpay_payment_id: 'pay_concurrent123',
        razorpay_signature: generateValidSignature('order_concurrent123', 'pay_concurrent123'),
        enrollmentId: testEnrollmentId
      };

      // Create payment record
      await db.collection('payments').insertOne({
        enrollmentId: new ObjectId(testEnrollmentId),
        studentId: new ObjectId(testUserId),
        amount: 4999,
        razorpayOrderId: 'order_concurrent123',
        status: 'PENDING',
        createdAt: new Date()
      });

      const mockPaymentDetails = {
        id: 'pay_concurrent123',
        status: 'captured',
        amount: 499900,
        currency: 'INR'
      };

      mockRazorpay.payments.fetch.mockResolvedValue(mockPaymentDetails);

      // Mock transaction session
      const mockSession = {
        withTransaction: jest.fn().mockImplementation(async (callback) => {
          return await callback();
        }),
        endSession: jest.fn()
      };
      db.client = { startSession: jest.fn().mockResolvedValue(mockSession) };

      // Process payment twice concurrently
      const promises = [
        PaymentService.verifyPayment(verificationData, testUserId),
        PaymentService.verifyPayment(verificationData, testUserId)
      ];

      // At least one should succeed
      const results = await Promise.allSettled(promises);
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    it('should validate payment amounts', async () => {
      await expect(
        PaymentService.processRefund(
          new ObjectId().toString(),
          -100, // Negative amount
          'Test',
          new ObjectId().toString()
        )
      ).rejects.toThrow();
    });

    it('should handle malformed webhook data', async () => {
      const malformedPayload = {
        payment: {
          entity: {
            id: null,
            status: undefined
          }
        }
      };

      await expect(
        PaymentService.handleWebhook('payment.captured', malformedPayload)
      ).resolves.not.toThrow();
    });
  });

  // Helper function to generate valid signature
  function generateValidSignature(orderId, paymentId) {
    const body = orderId + '|' + paymentId;
    return crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
  }
});