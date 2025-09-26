const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the app
const express = require('express');
const app = express();
app.use(express.json());

// Mock database functions
let mongoServer;
let mongoClient;
let db;

jest.mock('../config/database', () => ({
  getDB: () => db,
  connectDB: jest.fn()
}));

// Mock email service
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEnrollmentConfirmation: jest.fn().mockResolvedValue({ success: true })
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Load routes after mocking
const internshipRoutes = require('../routes/internships');
app.use('/api/internships', internshipRoutes);

describe('Internships API', () => {
  let adminToken;
  let studentToken;
  let adminId;
  let studentId;
  let internshipId;

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
    // Clean up collections before each test (except users)
    await db.collection('internships').deleteMany({});
    await db.collection('enrollments').deleteMany({});
    await db.collection('tasks').deleteMany({});
  });

  async function setupTestData() {
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create admin user
    const adminResult = await db.collection('users').insertOne({
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date()
    });
    adminId = adminResult.insertedId.toString();

    // Create student user
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
    studentId = studentResult.insertedId.toString();

    // Generate JWT tokens
    adminToken = jwt.sign({ userId: adminId }, process.env.JWT_SECRET || 'test_secret');
    studentToken = jwt.sign({ userId: studentId }, process.env.JWT_SECRET || 'test_secret');
  }

  async function createTestInternship() {
    const internshipData = {
      title: 'Full Stack Web Development',
      description: 'Learn modern web development with React, Node.js, and MongoDB',
      duration: 12,
      price: 4999,
      maxStudents: 50,
      totalTasks: 35,
      category: 'Web Development',
      difficulty: 'INTERMEDIATE',
      requirements: ['Basic HTML/CSS knowledge', 'JavaScript fundamentals'],
      outcomes: ['Build full-stack applications', 'Deploy to cloud platforms'],
      isActive: true,
      createdById: new ObjectId(adminId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('internships').insertOne(internshipData);
    internshipId = result.insertedId.toString();
    return { ...internshipData, _id: result.insertedId };
  }

  describe('GET /api/internships', () => {
    beforeEach(async () => {
      await createTestInternship();
    });

    it('should get all active internships', async () => {
      const response = await request(app)
        .get('/api/internships')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.internships).toHaveLength(1);
      expect(response.body.data.internships[0].title).toBe('Full Stack Web Development');
      expect(response.body.data.internships[0].enrolledCount).toBe(0);
      expect(response.body.data.pagination.total).toBe(1);
    });

    it('should filter internships by category', async () => {
      // Create another internship with different category
      await db.collection('internships').insertOne({
        title: 'Data Science Bootcamp',
        description: 'Learn data science with Python',
        price: 5999,
        category: 'Data Science',
        isActive: true,
        createdById: new ObjectId(adminId),
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/api/internships?category=Web Development')
        .expect(200);

      expect(response.body.data.internships).toHaveLength(1);
      expect(response.body.data.internships[0].category).toBe('Web Development');
    });

    it('should filter internships by difficulty', async () => {
      const response = await request(app)
        .get('/api/internships?difficulty=INTERMEDIATE')
        .expect(200);

      expect(response.body.data.internships).toHaveLength(1);
      expect(response.body.data.internships[0].difficulty).toBe('INTERMEDIATE');
    });

    it('should search internships by title', async () => {
      const response = await request(app)
        .get('/api/internships?search=Full Stack')
        .expect(200);

      expect(response.body.data.internships).toHaveLength(1);
      expect(response.body.data.internships[0].title).toBe('Full Stack Web Development');
    });

    it('should paginate results', async () => {
      // Create multiple internships
      for (let i = 0; i < 15; i++) {
        await db.collection('internships').insertOne({
          title: `Internship ${i + 1}`,
          description: `Description for internship ${i + 1}`,
          price: 1000 + i * 100,
          category: 'Test',
          isActive: true,
          createdById: new ObjectId(adminId),
          createdAt: new Date()
        });
      }

      const response = await request(app)
        .get('/api/internships?page=2&limit=5')
        .expect(200);

      expect(response.body.data.internships).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.total).toBe(16); // 1 original + 15 new
    });

    it('should not include inactive internships', async () => {
      // Create inactive internship
      await db.collection('internships').insertOne({
        title: 'Inactive Internship',
        description: 'This should not appear',
        price: 1000,
        category: 'Test',
        isActive: false,
        createdById: new ObjectId(adminId),
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/api/internships')
        .expect(200);

      expect(response.body.data.internships).toHaveLength(1);
      expect(response.body.data.internships[0].title).not.toBe('Inactive Internship');
    });
  });

  describe('GET /api/internships/:id', () => {
    beforeEach(async () => {
      await createTestInternship();
    });

    it('should get internship by ID with tasks', async () => {
      // Create a task for the internship
      await db.collection('tasks').insertOne({
        internshipId: new ObjectId(internshipId),
        title: 'Setup Development Environment',
        description: 'Install Node.js and set up the project',
        taskOrder: 1,
        estimatedHours: 4,
        isMandatory: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/internships/${internshipId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Full Stack Web Development');
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].title).toBe('Setup Development Environment');
      expect(response.body.data.enrolledCount).toBe(0);
    });

    it('should return 404 for non-existent internship', async () => {
      const fakeId = new ObjectId();
      
      const response = await request(app)
        .get(`/api/internships/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internship not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/internships/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/internships', () => {
    it('should create internship as admin', async () => {
      const internshipData = {
        title: 'Mobile App Development',
        description: 'Learn React Native development',
        duration: 10,
        price: 3999,
        maxStudents: 30,
        totalTasks: 25,
        category: 'Mobile Development',
        difficulty: 'INTERMEDIATE',
        requirements: ['React knowledge'],
        outcomes: ['Build mobile apps']
      };

      const response = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(internshipData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(internshipData.title);
      expect(response.body.data.price).toBe(internshipData.price);

      // Verify in database
      const created = await db.collection('internships').findOne({
        _id: new ObjectId(response.body.data.id)
      });
      expect(created).toBeTruthy();
      expect(created.title).toBe(internshipData.title);
    });

    it('should require admin role', async () => {
      const internshipData = {
        title: 'Test Internship',
        description: 'Test description',
        price: 1000,
        category: 'Test'
      };

      const response = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(internshipData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. Admin only.');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should set default values', async () => {
      const internshipData = {
        title: 'Basic Internship',
        description: 'Basic description',
        price: 1000,
        category: 'Test'
      };

      const response = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(internshipData)
        .expect(201);

      expect(response.body.data.duration).toBe(12); // Default
      expect(response.body.data.maxStudents).toBe(50); // Default
      expect(response.body.data.difficulty).toBe('BEGINNER'); // Default
    });
  });

  describe('POST /api/internships/:id/enroll', () => {
    beforeEach(async () => {
      await createTestInternship();
    });

    it('should enroll student in internship', async () => {
      const response = await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.studentId).toBe(studentId);
      expect(response.body.data.internshipId).toBe(internshipId);
      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.data.paymentStatus).toBe('PENDING');

      // Verify in database
      const enrollment = await db.collection('enrollments').findOne({
        studentId: new ObjectId(studentId),
        internshipId: new ObjectId(internshipId)
      });
      expect(enrollment).toBeTruthy();
    });

    it('should prevent duplicate enrollment', async () => {
      // First enrollment
      await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(201);

      // Second enrollment attempt
      const response = await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Already enrolled in this internship');
    });

    it('should prevent enrollment when internship is full', async () => {
      // Update internship to have max 1 student
      await db.collection('internships').updateOne(
        { _id: new ObjectId(internshipId) },
        { $set: { maxStudents: 1 } }
      );

      // Create another student
      const anotherStudent = await db.collection('users').insertOne({
        email: 'student2@test.com',
        passwordHash: await bcrypt.hash('password123', 12),
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true
      });

      const anotherStudentToken = jwt.sign(
        { userId: anotherStudent.insertedId.toString() },
        process.env.JWT_SECRET || 'test_secret'
      );

      // First student enrolls
      await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(201);

      // Second student tries to enroll
      const response = await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .set('Authorization', `Bearer ${anotherStudentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internship is full');
    });

    it('should prevent enrollment in inactive internship', async () => {
      // Deactivate internship
      await db.collection('internships').updateOne(
        { _id: new ObjectId(internshipId) },
        { $set: { isActive: false } }
      );

      const response = await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internship is not active');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/internships/${internshipId}/enroll`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/internships/my/enrollments', () => {
    beforeEach(async () => {
      await createTestInternship();
    });

    it('should get student enrollments with progress', async () => {
      // Enroll student
      const enrollmentResult = await db.collection('enrollments').insertOne({
        studentId: new ObjectId(studentId),
        internshipId: new ObjectId(internshipId),
        status: 'ACTIVE',
        progressPercentage: 0,
        paymentStatus: 'COMPLETED',
        paymentAmount: 4999,
        enrolledAt: new Date()
      });

      // Create tasks
      const task1 = await db.collection('tasks').insertOne({
        internshipId: new ObjectId(internshipId),
        title: 'Task 1',
        description: 'First task',
        taskOrder: 1,
        isMandatory: true
      });

      const task2 = await db.collection('tasks').insertOne({
        internshipId: new ObjectId(internshipId),
        title: 'Task 2',
        description: 'Second task',
        taskOrder: 2,
        isMandatory: true
      });

      // Create approved submission for first task
      await db.collection('taskSubmissions').insertOne({
        enrollmentId: enrollmentResult.insertedId,
        taskId: task1.insertedId,
        submissionText: 'My submission',
        status: 'APPROVED',
        submittedAt: new Date()
      });

      const response = await request(app)
        .get('/api/internships/my/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      
      const enrollment = response.body.data[0];
      expect(enrollment.internship.title).toBe('Full Stack Web Development');
      expect(enrollment.completedTasks).toBe(1);
      expect(enrollment.totalTasks).toBe(2);
      expect(enrollment.progressPercentage).toBe(50);
    });

    it('should return empty array for student with no enrollments', async () => {
      const response = await request(app)
        .get('/api/internships/my/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should filter enrollments by status', async () => {
      // Create multiple enrollments with different statuses
      await db.collection('enrollments').insertMany([
        {
          studentId: new ObjectId(studentId),
          internshipId: new ObjectId(internshipId),
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
          enrolledAt: new Date()
        },
        {
          studentId: new ObjectId(studentId),
          internshipId: new ObjectId(internshipId),
          status: 'COMPLETED',
          paymentStatus: 'COMPLETED',
          enrolledAt: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/internships/my/enrollments?status=ACTIVE')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('ACTIVE');
    });
  });

  describe('PUT /api/internships/:id (Admin only)', () => {
    beforeEach(async () => {
      await createTestInternship();
    });

    it('should update internship as admin', async () => {
      const updateData = {
        title: 'Updated Title',
        price: 5999,
        difficulty: 'ADVANCED'
      };

      const response = await request(app)
        .put(`/api/internships/${internshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify in database
      const updated = await db.collection('internships').findOne({
        _id: new ObjectId(internshipId)
      });
      expect(updated.title).toBe('Updated Title');
      expect(updated.price).toBe(5999);
      expect(updated.difficulty).toBe('ADVANCED');
    });

    it('should require admin role for update', async () => {
      const response = await request(app)
        .put(`/api/internships/${internshipId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/internships/:id (Admin only)', () => {
    beforeEach(async () => {
      await createTestInternship();
    });

    it('should delete internship without enrollments', async () => {
      const response = await request(app)
        .delete(`/api/internships/${internshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await db.collection('internships').findOne({
        _id: new ObjectId(internshipId)
      });
      expect(deleted).toBeNull();
    });

    it('should prevent deletion with active enrollments', async () => {
      // Create enrollment
      await db.collection('enrollments').insertOne({
        studentId: new ObjectId(studentId),
        internshipId: new ObjectId(internshipId),
        status: 'ACTIVE',
        enrolledAt: new Date()
      });

      const response = await request(app)
        .delete(`/api/internships/${internshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete internship with active enrollments');
    });

    it('should require admin role for deletion', async () => {
      const response = await request(app)
        .delete(`/api/internships/${internshipId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      await mongoClient.close();

      const response = await request(app)
        .get('/api/internships')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      mongoClient = new MongoClient(mongoServer.getUri());
      await mongoClient.connect();
      db = mongoClient.db();
    });

    it('should validate request data types', async () => {
      const response = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test',
          description: 'Test',
          price: 'not-a-number', // Invalid type
          category: 'Test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});