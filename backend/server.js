// backend/server.js - Complete Enhanced Server with All Features

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const cron = require('node-cron');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use('/uploads', express.static('uploads'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// MongoDB Atlas Connection
mongoose.connect("mongodb+srv://sivagurunathan875_db_user:shDbGcTzGPFwjwsW@cluster0.epgf9z2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Connected to MongoDB Atlas");
}).catch(err => {
  console.error("❌ MongoDB connection error:", err);
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|mp4|mp3|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type!'));
    }
  }
});

// ==================== SCHEMAS & MODELS ====================

// User Schema (Enhanced)
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  profileDetails: {
    phone: String,
    address: String,
    dateOfBirth: Date,
    profileImage: String,
    bio: String,
    githubUsername: String,
    linkedinUrl: String
  },
  assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  progress: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    completedAt: Date,
    score: Number
  }],
  internshipStatus: {
    isEnrolled: { type: Boolean, default: false },
    enrolledAt: Date,
    currentDay: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Task Schema for 35-day program
const taskSchema = new mongoose.Schema({
  taskNumber: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 100 // Allow for paid tasks beyond 35
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String, required: true },
  resources: [{
    name: String,
    url: String,
    type: { type: String, enum: ['document', 'video', 'link', 'image'] }
  }],
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  estimatedTime: { type: Number, default: 4 }, // in hours
  category: {
    type: String,
    enum: ['frontend', 'backend', 'fullstack', 'database', 'api', 'testing', 'deployment'],
    required: true
  },
  prerequisites: [Number], // task numbers that should be completed first
  isPaidTask: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  maxScore: { type: Number, default: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Intern Progress Schema
const internProgressSchema = new mongoose.Schema({
  internId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  currentDay: { type: Number, default: 1, min: 1, max: 35 },
  tasksProgress: [{
    taskNumber: { type: Number, required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    status: { 
      type: String, 
      enum: ['locked', 'unlocked', 'in_progress', 'submitted', 'completed', 'skipped'], 
      default: 'locked' 
    },
    unlockedAt: Date,
    startedAt: Date,
    submittedAt: Date,
    completedAt: Date,
    githubRepoUrl: String,
    score: { type: Number, min: 0, max: 100 },
    feedback: String,
    isLate: { type: Boolean, default: false },
    daysLate: { type: Number, default: 0 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date
  }],
  overallStats: {
    totalTasks: { type: Number, default: 35 },
    completedTasks: { type: Number, default: 0 },
    skippedTasks: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    isEligibleForCertificate: { type: Boolean, default: false }
  },
  certificateInfo: {
    isPurchased: { type: Boolean, default: false },
    purchaseDate: Date,
    paymentId: String,
    certificateUrl: String,
    certificateId: String
  },
  paidTasksAccess: {
    hasAccess: { type: Boolean, default: false },
    purchasedTasks: [{
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      purchaseDate: Date,
      paymentId: String,
      amount: { type: Number, default: 1000 }
    }]
  },
  startDate: { type: Date, default: Date.now },
  expectedEndDate: Date,
  actualEndDate: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['certificate', 'paid_task'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'bank_transfer'],
    default: 'razorpay'
  },
  transactionId: String,
  gatewayResponse: Object,
  failureReason: String,
  refundId: String,
  refundAmount: Number,
  refundDate: Date,
  paidAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'task_unlocked', 'task_submitted', 'task_completed', 'task_rejected',
      'certificate_eligible', 'certificate_purchased', 'paid_task_available',
      'admin_announcement', 'deadline_reminder', 'late_submission'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    taskNumber: Number,
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    paymentId: String,
    announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' },
    score: Number,
    additionalInfo: Object
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
});

// Course Schema (from your existing code)
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['document', 'video', 'link', 'quiz'], required: true },
  content: {
    documentUrl: String,
    videoUrl: String,
    externalLink: String,
    quizQuestions: [{
      question: String,
      options: [String],
      correctAnswer: String,
      points: { type: Number, default: 1 }
    }]
  },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category: String,
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  duration: Number,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Submission Schema (from your existing code)
const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  submissionType: { type: String, enum: ['file', 'text', 'quiz'], required: true },
  content: {
    fileUrl: String,
    textAnswer: String,
    quizAnswers: [{
      questionIndex: Number,
      selectedAnswer: String,
      isCorrect: Boolean
    }]
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  score: Number,
  feedback: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Announcement Schema (from your existing code)
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

// Certificate Schema (from your existing code)
const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateId: { type: String, unique: true, required: true },
  templateData: {
    userName: String,
    courseName: String,
    completionDate: Date,
    score: Number,
    certificateUrl: String
  },
  issuedAt: { type: Date, default: Date.now },
  isValid: { type: Boolean, default: true }
});

// Portal Settings Schema (from your existing code)
const portalSettingsSchema = new mongoose.Schema({
  theme: {
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#1e40af' },
    backgroundColor: { type: String, default: '#f8fafc' },
    textColor: { type: String, default: '#1f2937' },
    fontFamily: { type: String, default: 'Inter, sans-serif' }
  },
  branding: {
    logoUrl: String,
    organizationName: { type: String, default: 'Student LMS' },
    welcomeMessage: { type: String, default: 'Welcome to our Learning Management System' }
  },
  features: {
    allowProfileEdit: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    enableCertificates: { type: Boolean, default: true },
    enableAnnouncements: { type: Boolean, default: true }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const InternProgress = mongoose.model('InternProgress', internProgressSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Course = mongoose.model('Course', courseSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);
const PortalSettings = mongoose.model('PortalSettings', portalSettingsSchema);

// ==================== MIDDLEWARE ====================

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ==================== UTILITY FUNCTIONS ====================

const generateUserId = () => {
  return 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const generatePaymentId = () => {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const generateCertificateId = () => {
  return 'CERT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Create notification helper
const createNotification = async (userId, type, title, message, data = {}, priority = 'medium') => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      priority
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Pre-save middlewares
internProgressSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startDate')) {
    this.expectedEndDate = new Date(this.startDate);
    this.expectedEndDate.setDate(this.expectedEndDate.getDate() + 35);
  }
  this.updatedAt = new Date();
  next();
});

// Methods for InternProgress
internProgressSchema.methods.calculateStats = function() {
  const completedTasks = this.tasksProgress.filter(t => t.status === 'completed').length;
  const skippedTasks = this.tasksProgress.filter(t => t.status === 'skipped').length;
  
  const scoredTasks = this.tasksProgress.filter(t => t.status === 'completed' && t.score !== undefined);
  const averageScore = scoredTasks.length > 0 
    ? scoredTasks.reduce((sum, task) => sum + task.score, 0) / scoredTasks.length 
    : 0;
  
  const submittedTasks = this.tasksProgress.filter(t => t.status === 'completed' || t.status === 'submitted');
  const onTimeTasks = submittedTasks.filter(t => !t.isLate).length;
  const consistencyScore = submittedTasks.length > 0 
    ? (onTimeTasks / submittedTasks.length) * 100 
    : 0;
  
  const completionRate = (completedTasks / 35) * 100;
  const finalScore = (averageScore * 0.6) + (consistencyScore * 0.3) + (completionRate * 0.1);
  
  this.overallStats = {
    totalTasks: 35,
    completedTasks,
    skippedTasks,
    averageScore: Math.round(averageScore * 100) / 100,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    finalScore: Math.round(finalScore * 100) / 100,
    isEligibleForCertificate: finalScore >= 75
  };
};

paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.paymentId) {
    this.paymentId = generatePaymentId();
  }
  this.updatedAt = new Date();
  next();
});

// ==================== AUTHENTICATION ROUTES ====================

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'User ID and password required' });
    }

    const user = await User.findOne({ 
      $or: [{ userId }, { email: userId }],
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          _id: user._id,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          profileDetails: user.profileDetails,
          internshipStatus: user.internshipStatus
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get current user info
app.get('/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profileDetails: req.user.profileDetails,
        internshipStatus: req.user.internshipStatus,
        assignedCourses: req.user.assignedCourses,
        progress: req.user.progress
      }
    }
  });
});

// ==================== ADMIN ROUTES ====================

// Create User Account (Admin Only)
app.post('/admin/create-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user', profileDetails } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = generateUserId();

    const newUser = new User({
      userId,
      name,
      email,
      password: hashedPassword,
      role,
      profileDetails: profileDetails || {}
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// Create/Update Daily Tasks (Admin Only)
app.post('/admin/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      taskNumber, title, description, instructions, resources, 
      difficulty, category, estimatedTime, prerequisites, isPaidTask, price 
    } = req.body;

    if (!taskNumber || !title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Task number, title, description, and category are required'
      });
    }

    if (taskNumber < 1 || taskNumber > 100) {
      return res.status(400).json({
        success: false,
        message: 'Task number must be between 1 and 100'
      });
    }

    let task = await Task.findOne({ taskNumber });
    
    if (task) {
      Object.assign(task, {
        title, description, instructions,
        resources: resources || [],
        difficulty, category, estimatedTime,
        prerequisites: prerequisites || [],
        isPaidTask: isPaidTask || false,
        price: price || 0,
        updatedAt: new Date()
      });
    } else {
      task = new Task({
        taskNumber, title, description, instructions,
        resources: resources || [],
        difficulty, category, estimatedTime,
        prerequisites: prerequisites || [],
        isPaidTask: isPaidTask || false,
        price: price || 0,
        createdBy: req.user._id
      });
    }

    await task.save();

    res.status(task.isNew ? 201 : 200).json({
      success: true,
      message: `Task ${task.isNew ? 'created' : 'updated'} successfully`,
      data: { task }
    });
  } catch (error) {
    console.error('Task creation/update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update task'
    });
  }
});

// Initialize Intern Progress (Admin Only)
app.post('/admin/initialize-intern/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    let progress = await InternProgress.findOne({ internId: userId });
    if (progress) {
      return res.status(400).json({
        success: false,
        message: 'Intern progress already initialized'
      });
    }

    const tasks = await Task.find({ 
      taskNumber: { $lte: 35 }, 
      isActive: true 
    }).sort({ taskNumber: 1 });

    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tasks found. Please create tasks first.'
      });
    }

    const tasksProgress = tasks.map(task => ({
      taskNumber: task.taskNumber,
      taskId: task._id,
      status: task.taskNumber === 1 ? 'unlocked' : 'locked',
      unlockedAt: task.taskNumber === 1 ? new Date() : undefined
    }));

    progress = new InternProgress({
      internId: userId,
      currentDay: 1,
      tasksProgress,
      startDate: new Date()
    });

    await progress.save();

    // Update user's internship status
    await User.findByIdAndUpdate(userId, {
      'internshipStatus.isEnrolled': true,
      'internshipStatus.enrolledAt': new Date(),
      'internshipStatus.currentDay': 1
    });

    // Send welcome notification
    await createNotification(
      userId,
      'admin_announcement',
      'Welcome to 35-Day Internship Program!',
      'Your internship journey has begun. Task 1 is now unlocked and ready for you to start.',
      { taskNumber: 1 },
      'high'
    );

    res.status(201).json({
      success: true,
      message: 'Intern progress initialized successfully',
      data: { progress }
    });
  } catch (error) {
    console.error('Initialize intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize intern progress'
    });
  }
});

// View All Intern Progress (Admin Only)
app.get('/admin/interns-progress', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'completed') {
      query.actualEndDate = { $ne: null };
    }

    const progressRecords = await InternProgress.find(query)
      .populate('internId', 'name email userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InternProgress.countDocuments(query);

    const internsWithStats = progressRecords.map(progress => {
      progress.calculateStats();
      return progress;
    });

    res.json({
      success: true,
      data: {
        interns: internsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalInterns: total,
          hasNext: skip + progressRecords.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get interns progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interns progress'
    });
  }
});

// Review Task Submission (Admin Only)
app.put('/admin/review-submission/:internId/:taskNumber', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { internId, taskNumber } = req.params;
    const { score, feedback, status } = req.body;

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "completed" or "rejected"'
      });
    }

    if (status === 'completed' && (score === undefined || score < 0 || score > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 0 and 100 for completed tasks'
      });
    }

    const progress = await InternProgress.findOne({ internId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === parseInt(taskNumber));
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found in intern progress'
      });
    }

    if (taskProgress.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Task has not been submitted yet'
      });
    }

    // Update task progress
    taskProgress.status = status;
    taskProgress.score = status === 'completed' ? score : 0;
    taskProgress.feedback = feedback;
    taskProgress.reviewedBy = req.user._id;
    taskProgress.reviewedAt = new Date();
    
    if (status === 'completed') {
      taskProgress.completedAt = new Date();
      
      // Unlock next task
      const nextTaskNumber = parseInt(taskNumber) + 1;
      if (nextTaskNumber <= 35) {
        const nextTask = progress.tasksProgress.find(t => t.taskNumber === nextTaskNumber);
        if (nextTask && nextTask.status === 'locked') {
          nextTask.status = 'unlocked';
          nextTask.unlockedAt = new Date();
          progress.currentDay = nextTaskNumber;

          // Update user's current day
          await User.findByIdAndUpdate(internId, {
            'internshipStatus.currentDay': nextTaskNumber
          });

          // Send unlock notification
          await createNotification(
            internId,
            'task_unlocked',
            `Task ${nextTaskNumber} Unlocked!`,
            `Congratulations! You completed Task ${taskNumber}. Task ${nextTaskNumber} is now available.`,
            { taskNumber: nextTaskNumber },
            'medium'
          );
        }
      }
      
      // Check if all tasks are completed
      const completedTasks = progress.tasksProgress.filter(t => t.status === 'completed').length;
      if (completedTasks === 35 || parseInt(taskNumber) === 35) {
        progress.actualEndDate = new Date();
        
        // Update user completion percentage
        await User.findByIdAndUpdate(internId, {
          'internshipStatus.completionPercentage': 100
        });

        // Send completion notification
        await createNotification(
          internId,
          'certificate_eligible',
          '🎉 Internship Completed!',
          'Congratulations! You have completed all 35 tasks. Check your certificate eligibility now.',
          {},
          'high'
        );
      }

      // Send task completion notification
      await createNotification(
        internId,
        'task_completed',
        `Task ${taskNumber} Approved!`,
        `Your Task ${taskNumber} has been reviewed and approved with a score of ${score}/100.`,
        { taskNumber: parseInt(taskNumber), score },
        'medium'
      );
    } else {
      // Send rejection notification
      await createNotification(
        internId,
        'task_rejected',
        `Task ${taskNumber} Needs Revision`,
        `Your Task ${taskNumber} submission needs revision. Check the feedback and resubmit.`,
        { taskNumber: parseInt(taskNumber), feedback },
        'high'
      );
    }

    // Recalculate stats
    progress.calculateStats();
    await progress.save();

    res.json({
      success: true,
      message: `Task ${status} successfully`,
      data: { taskProgress }
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review submission'
    });
  }
});

// Get Admin Analytics
app.get('/admin/intern-analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const allInterns = await InternProgress.find({
      createdAt: { $gte: startDate }
    }).populate('internId', 'name email userId createdAt');

    const totalInterns = allInterns.length;
    const activeInterns = allInterns.filter(p => p.isActive && !p.actualEndDate).length;
    const completedInterns = allInterns.filter(p => p.actualEndDate).length;
    const eligibleForCertificate = allInterns.filter(p => {
      p.calculateStats();
      return p.overallStats.isEligibleForCertificate;
    }).length;
    
    const certificatesPurchased = allInterns.filter(p => p.certificateInfo.isPurchased).length;
    const certificateRevenue = certificatesPurchased * 499;

    const paidTasksPurchased = allInterns.reduce((sum, intern) => 
      sum + intern.paidTasksAccess.purchasedTasks.length, 0
    );
    const paidTasksRevenue = paidTasksPurchased * 1000;

    const avgFinalScore = allInterns.length > 0 
      ? allInterns.reduce((sum, intern) => {
          intern.calculateStats();
          return sum + intern.overallStats.finalScore;
        }, 0) / allInterns.length 
      : 0;

    const avgCompletionRate = allInterns.length > 0
      ? allInterns.reduce((sum, intern) => {
          const completed = intern.tasksProgress.filter(t => t.status === 'completed').length;
          return sum + ((completed / 35) * 100);
        }, 0) / allInterns.length
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalInterns,
          activeInterns,
          completedInterns,
          eligibleForCertificate,
          certificatesPurchased,
          completionRate: avgCompletionRate.toFixed(2),
          avgFinalScore: avgFinalScore.toFixed(2)
        },
        revenue: {
          certificateRevenue,
          paidTasksRevenue,
          totalRevenue: certificateRevenue + paidTasksRevenue
        },
        timeframe
      }
    });
  } catch (error) {
    console.error('Get intern analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch intern analytics'
    });
  }
});

// ==================== INTERN ROUTES ====================

// Get Intern Dashboard
app.get('/intern/dashboard', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id })
      .populate('tasksProgress.taskId', 'title description category difficulty estimatedTime');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found. Please contact admin to initialize your account.'
      });
    }

    progress.calculateStats();
    await progress.save();

    const currentTask = progress.tasksProgress.find(t => t.taskNumber === progress.currentDay);
    const nextTask = progress.tasksProgress.find(t => t.taskNumber === progress.currentDay + 1);

    const today = new Date();
    const daysElapsed = Math.floor((today - progress.startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = Math.max(0, 35 - daysElapsed);

    res.json({
      success: true,
      data: {
        overview: {
          currentDay: progress.currentDay,
          daysElapsed,
          daysRemaining,
          startDate: progress.startDate,
          expectedEndDate: progress.expectedEndDate,
          actualEndDate: progress.actualEndDate
        },
        stats: progress.overallStats,
        currentTask,
        nextTask,
        recentTasks: progress.tasksProgress
          .filter(t => t.status !== 'locked')
          .sort((a, b) => b.taskNumber - a.taskNumber)
          .slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get intern dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get All Tasks with Progress
app.get('/intern/tasks', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id })
      .populate('tasksProgress.taskId');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found. Please contact admin.'
      });
    }

    const tasksWithProgress = progress.tasksProgress
      .sort((a, b) => a.taskNumber - b.taskNumber)
      .map(taskProgress => ({
        ...taskProgress.taskId.toObject(),
        progress: {
          taskNumber: taskProgress.taskNumber,
          status: taskProgress.status,
          unlockedAt: taskProgress.unlockedAt,
          startedAt: taskProgress.startedAt,
          submittedAt: taskProgress.submittedAt,
          completedAt: taskProgress.completedAt,
          githubRepoUrl: taskProgress.githubRepoUrl,
          score: taskProgress.score,
          feedback: taskProgress.feedback,
          isLate: taskProgress.isLate,
          daysLate: taskProgress.daysLate
        }
      }));

    res.json({
      success: true,
      data: {
        tasks: tasksWithProgress,
        currentDay: progress.currentDay,
        overallStats: progress.overallStats
      }
    });
  } catch (error) {
    console.error('Get intern tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Start Working on Task
app.post('/intern/start-task/:taskNumber', authenticateToken, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const taskNum = parseInt(taskNumber);

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === taskNum);
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (taskProgress.status !== 'unlocked') {
      return res.status(400).json({
        success: false,
        message: 'Task is not available to start'
      });
    }

    taskProgress.status = 'in_progress';
    taskProgress.startedAt = new Date();
    await progress.save();

    res.json({
      success: true,
      message: 'Task started successfully',
      data: { taskProgress }
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start task'
    });
  }
});

// Submit Task
app.post('/intern/submit-task/:taskNumber', authenticateToken, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const { githubRepoUrl } = req.body;
    const taskNum = parseInt(taskNumber);

    if (!githubRepoUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub repository URL is required'
      });
    }

    const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    if (!githubUrlRegex.test(githubRepoUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid GitHub repository URL'
      });
    }

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === taskNum);
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!['unlocked', 'in_progress'].includes(taskProgress.status)) {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be submitted in current status'
      });
    }

    const submissionTime = new Date();
    const unlockTime = taskProgress.unlockedAt || taskProgress.startedAt;
    const hoursDiff = (submissionTime - unlockTime) / (1000 * 60 * 60);
    const isLate = hoursDiff > 24;
    const daysLate = isLate ? Math.ceil((hoursDiff - 24) / 24) : 0;

    taskProgress.status = 'submitted';
    taskProgress.githubRepoUrl = githubRepoUrl;
    taskProgress.submittedAt = submissionTime;
    taskProgress.isLate = isLate;
    taskProgress.daysLate = daysLate;

    if (!taskProgress.startedAt) {
      taskProgress.startedAt = taskProgress.unlockedAt;
    }

    await progress.save();

    // Send submission notification to admin (you can customize this)
    await createNotification(
      req.user._id,
      'task_submitted',
      `Task ${taskNum} Submitted!`,
      `Your Task ${taskNum} has been submitted successfully and is awaiting review.`,
      { taskNumber: taskNum },
      'medium'
    );

    res.json({
      success: true,
      message: `Task submitted successfully${isLate ? ' (Late submission)' : ''}`,
      data: {
        taskProgress,
        isLate,
        daysLate
      }
    });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task'
    });
  }
});

// Skip Task
app.post('/intern/skip-task/:taskNumber', authenticateToken, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const taskNum = parseInt(taskNumber);

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === taskNum);
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!['unlocked', 'in_progress'].includes(taskProgress.status)) {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be skipped in current status'
      });
    }

    taskProgress.status = 'skipped';
    taskProgress.score = 0;

    // Unlock next task
    const nextTaskNumber = taskNum + 1;
    if (nextTaskNumber <= 35) {
      const nextTask = progress.tasksProgress.find(t => t.taskNumber === nextTaskNumber);
      if (nextTask && nextTask.status === 'locked') {
        nextTask.status = 'unlocked';
        nextTask.unlockedAt = new Date();
        progress.currentDay = nextTaskNumber;

        await User.findByIdAndUpdate(req.user._id, {
          'internshipStatus.currentDay': nextTaskNumber
        });
      }
    }

    progress.calculateStats();
    await progress.save();

    res.json({
      success: true,
      message: 'Task skipped successfully. Note: This will affect your final score.',
      data: { taskProgress }
    });
  } catch (error) {
    console.error('Skip task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip task'
    });
  }
});

// Check Certificate Eligibility
app.get('/intern/certificate-eligibility', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    progress.calculateStats();
    await progress.save();

    const isEligible = progress.overallStats.isEligibleForCertificate;
    const finalScore = progress.overallStats.finalScore;

    res.json({
      success: true,
      data: {
        isEligible,
        finalScore,
        requiredScore: 75,
        canPurchase: isEligible && !progress.certificateInfo.isPurchased,
        alreadyPurchased: progress.certificateInfo.isPurchased,
        certificatePrice: 499,
        stats: progress.overallStats
      }
    });
  } catch (error) {
    console.error('Check certificate eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check certificate eligibility'
    });
  }
});

// Purchase Certificate
app.post('/intern/purchase-certificate', authenticateToken, async (req, res) => {
  try {
    const { paymentMethod = 'razorpay' } = req.body;

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    progress.calculateStats();
    if (!progress.overallStats.isEligibleForCertificate) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for certificate. Minimum score required: 75%'
      });
    }

    if (progress.certificateInfo.isPurchased) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already purchased'
      });
    }

    const payment = new Payment({
      userId: req.user._id,
      type: 'certificate',
      itemId: progress._id,
      amount: 499,
      paymentMethod,
      status: 'completed', // Mock payment
      transactionId: 'TXN_' + Date.now(),
      paidAt: new Date()
    });

    await payment.save();

    const certificateId = generateCertificateId();
    progress.certificateInfo.isPurchased = true;
    progress.certificateInfo.purchaseDate = new Date();
    progress.certificateInfo.paymentId = payment.paymentId;
    progress.certificateInfo.certificateId = certificateId;
    progress.certificateInfo.certificateUrl = `/certificates/${progress._id}`;
    progress.paidTasksAccess.hasAccess = true;

    await progress.save();

    await createNotification(
      req.user._id,
      'certificate_purchased',
      'Certificate Purchased Successfully! 🎉',
      'Congratulations! Your internship certificate has been purchased. You now have access to paid tasks.',
      { paymentId: payment.paymentId },
      'high'
    );

    res.status(201).json({
      success: true,
      message: 'Certificate purchased successfully! You now have access to paid tasks.',
      data: {
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paidAt: payment.paidAt
        },
        certificateId,
        certificateUrl: progress.certificateInfo.certificateUrl,
        paidTasksAccessEnabled: true
      }
    });
  } catch (error) {
    console.error('Purchase certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase certificate'
    });
  }
});

// Get Paid Tasks
app.get('/intern/paid-tasks', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    if (!progress.paidTasksAccess.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase a certificate first to access paid tasks'
      });
    }

    const paidTasks = await Task.find({
      taskNumber: { $gt: 35 },
      isActive: true
    }).sort({ taskNumber: 1 });

    const tasksWithPurchaseStatus = paidTasks.map(task => ({
      ...task.toObject(),
      isPurchased: progress.paidTasksAccess.purchasedTasks.some(
        pt => pt.taskId.toString() === task._id.toString()
      ),
      price: task.price || 1000
    }));

    res.json({
      success: true,
      data: {
        paidTasks: tasksWithPurchaseStatus,
        totalPurchased: progress.paidTasksAccess.purchasedTasks.length
      }
    });
  } catch (error) {
    console.error('Get paid tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid tasks'
    });
  }
});

// Purchase Paid Task
app.post('/intern/purchase-paid-task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { paymentMethod = 'razorpay' } = req.body;

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    if (!progress.paidTasksAccess.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase a certificate first to access paid tasks'
      });
    }

    const task = await Task.findById(taskId);
    if (!task || task.taskNumber <= 35) {
      return res.status(404).json({
        success: false,
        message: 'Paid task not found'
      });
    }

    const alreadyPurchased = progress.paidTasksAccess.purchasedTasks.some(
      pt => pt.taskId.toString() === taskId
    );

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: 'Task already purchased'
      });
    }

    const payment = new Payment({
      userId: req.user._id,
      type: 'paid_task',
      itemId: taskId,
      amount: task.price || 1000,
      paymentMethod,
      status: 'completed',
      transactionId: 'TXN_' + Date.now(),
      paidAt: new Date()
    });

    await payment.save();

    progress.paidTasksAccess.purchasedTasks.push({
      taskId,
      purchaseDate: new Date(),
      paymentId: payment.paymentId,
      amount: task.price || 1000
    });

    await progress.save();

    res.status(201).json({
      success: true,
      message: 'Paid task purchased successfully!',
      data: {
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paidAt: payment.paidAt
        },
        task: {
          id: task._id,
          title: task.title,
          taskNumber: task.taskNumber
        }
      }
    });
  } catch (error) {
    console.error('Purchase paid task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase paid task'
    });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Get User Notifications
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { userId: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('data.taskId', 'title taskNumber');

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      isRead: false 
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalNotifications: total,
          hasNext: skip + notifications.length < total,
          hasPrev: parseInt(page) > 1
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark Notification as Read
app.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark All Notifications as Read
app.put('/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { 
        $set: { 
          isRead: true, 
          readAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// ==================== AUTOMATED CRON JOBS ====================

// Daily reminder for pending tasks
cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Running daily task reminders...');
  
  try {
    const activeInterns = await InternProgress.find({ 
      isActive: true,
      actualEndDate: null 
    }).populate('internId', 'name email');

    for (const progress of activeInterns) {
      const currentTask = progress.tasksProgress.find(t => 
        t.taskNumber === progress.currentDay && 
        ['unlocked', 'in_progress'].includes(t.status)
      );

      if (currentTask) {
        const hoursRemaining = 24 - ((new Date() - currentTask.unlockedAt) / (1000 * 60 * 60));
        
        if (hoursRemaining <= 6 && hoursRemaining > 0) {
          await createNotification(
            progress.internId._id,
            'deadline_reminder',
            'Task Deadline Approaching ⏰',
            `You have ${Math.round(hoursRemaining)} hours remaining to submit Task ${currentTask.taskNumber}`,
            { taskNumber: currentTask.taskNumber },
            'high'
          );
        } else if (hoursRemaining <= 0) {
          currentTask.isLate = true;
          currentTask.daysLate = Math.ceil(Math.abs(hoursRemaining) / 24);
          await progress.save();

          await createNotification(
            progress.internId._id,
            'late_submission',
            'Task Overdue ⚠️',
            `Task ${currentTask.taskNumber} is now ${currentTask.daysLate} day(s) late. Please submit as soon as possible.`,
            { taskNumber: currentTask.taskNumber },
            'urgent'
          );
        }
      }
    }
  } catch (error) {
    console.error('Daily reminder cron job error:', error);
  }
});

// Weekly progress report
cron.schedule('0 10 * * 1', async () => {
  console.log('📊 Generating weekly progress reports...');
  
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeInterns = await InternProgress.find({ 
      isActive: true,
      createdAt: { $gte: oneWeekAgo }
    }).populate('internId', 'name email');

    for (const progress of activeInterns) {
      progress.calculateStats();
      
      const weeklyReport = {
        tasksCompleted: progress.tasksProgress.filter(t => 
          t.status === 'completed' && 
          t.completedAt >= oneWeekAgo
        ).length,
        currentScore: progress.overallStats.finalScore,
        consistency: progress.overallStats.consistencyScore,
        daysActive: progress.currentDay
      };

      await createNotification(
        progress.internId._id,
        'admin_announcement',
        'Weekly Progress Report 📈',
        `This week: ${weeklyReport.tasksCompleted} tasks completed. Current score: ${weeklyReport.currentScore}%. Keep up the great work!`,
        weeklyReport,
        'medium'
      );
    }
  } catch (error) {
    console.error('Weekly report cron job error:', error);
  }
});

// ==================== CERTIFICATE GENERATION ====================

// Generate Certificate PDF (placeholder)
app.get('/certificates/:progressId', async (req, res) => {
  try {
    const { progressId } = req.params;
    
    const progress = await InternProgress.findById(progressId)
      .populate('internId', 'name email');

    if (!progress || !progress.certificateInfo.isPurchased) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or not purchased'
      });
    }

    progress.calculateStats();

    res.json({
      success: true,
      data: {
        certificateId: progress.certificateInfo.certificateId,
        internName: progress.internId.name,
        completionDate: progress.actualEndDate || progress.expectedEndDate,
        finalScore: progress.overallStats.finalScore,
        completedTasks: progress.overallStats.completedTasks,
        consistencyScore: progress.overallStats.consistencyScore,
        issuedDate: progress.certificateInfo.purchaseDate,
        isValid: true
      }
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate'
    });
  }
});

// Verify Certificate (Public)
app.get('/verify-certificate/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const progress = await InternProgress.findOne({
      'certificateInfo.certificateId': certificateId,
      'certificateInfo.isPurchased': true
    }).populate('internId', 'name email');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid'
      });
    }

    progress.calculateStats();

    res.json({
      success: true,
      data: {
        isValid: true,
        certificate: {
          certificateId: progress.certificateInfo.certificateId,
          userName: progress.internId.name,
          finalScore: progress.overallStats.finalScore,
          completedTasks: progress.overallStats.completedTasks,
          completionDate: progress.actualEndDate,
          issuedAt: progress.certificateInfo.purchaseDate
        }
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate'
    });
  }
});

// ==================== WEBHOOK ENDPOINTS ====================

// Payment webhook (for real payment integration)
app.post('/webhooks/payment', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = JSON.parse(req.body);
    
    if (payload.event === 'payment.successful') {
      const payment = await Payment.findOne({ paymentId: payload.paymentId });
      
      if (payment) {
        payment.status = 'completed';
        payment.transactionId = payload.transactionId;
        payment.paidAt = new Date();
        payment.gatewayResponse = payload;
        
        await payment.save();
        
        if (payment.type === 'certificate') {
          await InternProgress.findByIdAndUpdate(payment.itemId, {
            'certificateInfo.isPurchased': true,
            'certificateInfo.purchaseDate': new Date(),
            'paidTasksAccess.hasAccess': true
          });
        }
        
        await createNotification(
          payment.userId,
          payment.type === 'certificate' ? 'certificate_purchased' : 'paid_task_available',
          'Payment Successful ✅',
          `Your payment of ₹${payment.amount} has been processed successfully.`,
          { paymentId: payment.paymentId, amount: payment.amount },
          'medium'
        );
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// ==================== UTILITY & PUBLIC ROUTES ====================

// Get Portal Settings (Public)
app.get('/portal-settings', async (req, res) => {
  try {
    const settings = await PortalSettings.findOne({});
    
    if (!settings) {
      const defaultSettings = {
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af',
          backgroundColor: '#f8fafc',
          textColor: '#1f2937',
          fontFamily: 'Inter, sans-serif'
        },
        branding: {
          organizationName: 'Student LMS',
          welcomeMessage: 'Welcome to our 35-Day Internship Program'
        },
        features: {
          allowProfileEdit: true,
          showProgress: true,
          enableCertificates: true,
          enableAnnouncements: true
        }
      };
      
      return res.json({
        success: true,
        data: { settings: defaultSettings }
      });
    }

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get portal settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portal settings'
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Student LMS Backend is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get System Stats (Public)
app.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalInterns = await InternProgress.countDocuments();
    const completedInternships = await InternProgress.countDocuments({ actualEndDate: { $ne: null } });
    const totalTasks = await Task.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalInterns,
        completedInternships,
        totalTasks,
        completionRate: totalInterns > 0 ? ((completedInternships / totalInterns) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

// ==================== ERROR HANDLING & SERVER STARTUP ====================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large' });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Create uploads directory
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Create default admin user and sample data
const createDefaultData = async () => {
  try {
    // Create default admin
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const defaultAdmin = new User({
        userId: 'ADMIN_001',
        name: 'System Administrator',
        email: 'admin@studentlms.com',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        profileDetails: {
          bio: 'Default system administrator account'
        }
      });
      
      await defaultAdmin.save();
      console.log('👤 Default admin user created');
      console.log('📧 Email: admin@studentlms.com');
      console.log('🔑 Password: admin123');
      console.log('⚠️  Please change the default password after first login!');
    }

    // Create sample tasks if none exist
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      const sampleTasks = [
        {
          taskNumber: 1,
          title: "HTML Basics & Structure",
          description: "Create a well-structured HTML page with semantic elements",
          instructions: "Create an HTML page with header, nav, main, aside, and footer. Include at least 10 different HTML5 semantic tags and ensure proper document structure.",
          category: "frontend",
          difficulty: "easy",
          estimatedTime: 3,
          resources: [
            { name: "HTML5 Documentation", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", type: "link" },
            { name: "HTML Semantic Elements", url: "https://www.w3schools.com/html/html5_semantic_elements.asp", type: "link" }
          ],
          createdBy: adminExists ? adminExists._id : null
        },
        {
          taskNumber: 2,
          title: "CSS Fundamentals & Responsive Design",
          description: "Style your HTML page with CSS and make it responsive",
          instructions: "Add comprehensive CSS styling to your HTML page from Task 1. Implement responsive design using flexbox/grid and media queries. Ensure mobile-first approach.",
          category: "frontend",
          difficulty: "easy",
          estimatedTime: 4,
          prerequisites: [1],
          resources: [
            { name: "CSS Grid Guide", url: "https://css-tricks.com/snippets/css/complete-guide-grid/", type: "link" },
            { name: "Flexbox Guide", url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/", type: "link" }
          ],
          createdBy: adminExists ? adminExists._id : null
        },
        {
          taskNumber: 3,
          title: "JavaScript DOM Manipulation",
          description: "Add interactivity to your webpage using JavaScript",
          instructions: "Implement JavaScript functionality: form validation, dynamic content updates, event handling, and local storage integration. Add at least 5 interactive features.",
          category: "frontend",
          difficulty: "medium",
          estimatedTime: 5,
          prerequisites: [1, 2],
          resources: [
            { name: "JavaScript DOM Guide", url: "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model", type: "link" }
          ],
          createdBy: adminExists ? adminExists._id : null
        },
        {
          taskNumber: 4,
          title: "Git Version Control & GitHub",
          description: "Learn Git fundamentals and host your project on GitHub",
          instructions: "Initialize Git repository, create meaningful commits, branches, and push to GitHub. Write a comprehensive README.md with project documentation.",
          category: "deployment",
          difficulty: "easy",
          estimatedTime: 2,
          prerequisites: [1, 2, 3],
          resources: [
            { name: "Git Tutorial", url: "https://git-scm.com/docs/gittutorial", type: "link" },
            { name: "GitHub Guide", url: "https://guides.github.com/activities/hello-world/", type: "link" }
          ],
          createdBy: adminExists ? adminExists._id : null
        },
        {
          taskNumber: 5,
          title: "Advanced CSS: Animations & Sass",
          description: "Implement CSS animations and learn Sass preprocessing",
          instructions: "Add smooth CSS animations, transitions, and keyframes to your project. Convert your CSS to Sass/SCSS with variables, mixins, and nested rules.",
          category: "frontend",
          difficulty: "medium",
          estimatedTime: 4,
          prerequisites: [2, 3],
          resources: [
            { name: "CSS Animations", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations", type: "link" },
            { name: "Sass Documentation", url: "https://sass-lang.com/documentation", type: "link" }
          ],
          createdBy: adminExists ? adminExists._id : null
        }
      ];

      // Add more sample tasks to reach 35
      for (let i = 6; i <= 35; i++) {
        sampleTasks.push({
          taskNumber: i,
          title: `Advanced Task ${i}`,
          description: `Advanced development task focusing on ${i % 2 === 0 ? 'backend' : 'frontend'} concepts`,
          instructions: `Complete the requirements for advanced task ${i}. This builds upon previous tasks and introduces new concepts.`,
          category: i % 3 === 0 ? 'fullstack' : (i % 2 === 0 ? 'backend' : 'frontend'),
          difficulty: i < 15 ? 'easy' : (i < 25 ? 'medium' : 'hard'),
          estimatedTime: Math.floor(Math.random() * 4) + 2,
          prerequisites: i > 1 ? [i - 1] : [],
          createdBy: adminExists ? adminExists._id : null
        });
      }

      await Task.insertMany(sampleTasks);
      console.log('📝 Sample 35 tasks created');
    }

    // Create sample paid tasks
    const paidTaskCount = await Task.countDocuments({ isPaidTask: true });
    if (paidTaskCount === 0) {
      const paidTasks = [
        {
          taskNumber: 36,
          title: "Advanced React Development",
          description: "Build a complex React application with advanced patterns",
          instructions: "Create a full-featured React application using hooks, context, and modern patterns.",
          category: "frontend",
          difficulty: "hard",
          estimatedTime: 8,
          isPaidTask: true,
          price: 1000,
          createdBy: adminExists ? adminExists._id : null
        },
        {
          taskNumber: 37,
          title: "Node.js & Express API Development",
          description: "Build a RESTful API with authentication and database integration",
          instructions: "Create a complete backend API with JWT authentication, MongoDB integration, and comprehensive testing.",
          category: "backend",
          difficulty: "hard",
          estimatedTime: 10,
          isPaidTask: true,
          price: 1000,
          createdBy: adminExists ? adminExists._id : null
        },
        {
          taskNumber: 38,
          title: "Full-Stack MERN Application",
          description: "Combine React frontend with Node.js backend",
          instructions: "Build a complete MERN stack application with real-time features and deployment.",
          category: "fullstack",
          difficulty: "hard",
          estimatedTime: 12,
          isPaidTask: true,
          price: 1500,
          prerequisites: [36, 37],
          createdBy: adminExists ? adminExists._id : null
        }
      ];

      await Task.insertMany(paidTasks);
      console.log('💰 Sample paid tasks created');
    }

  } catch (error) {
    console.error('Failed to create default data:', error);
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Enhanced Student LMS Backend Server running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  
  // Create default data
  await createDefaultData();
  
  console.log('\n📋 Available API Endpoints:');
  console.log('🔐 Authentication:');
  console.log('  POST /auth/login - User login');
  console.log('  GET  /auth/me - Get current user info');
  
  console.log('\n👨‍💼 Admin Routes:');
  console.log('  POST /admin/create-user - Create user account');
  console.log('  POST /admin/tasks - Create/update tasks');
  console.log('  POST /admin/initialize-intern/:userId - Initialize intern');
  console.log('  GET  /admin/interns-progress - View all intern progress');
  console.log('  PUT  /admin/review-submission/:internId/:taskNumber - Review submissions');
  console.log('  GET  /admin/intern-analytics - Analytics dashboard');
  
  console.log('\n🎓 Intern Routes:');
  console.log('  GET  /intern/dashboard - Intern dashboard');
  console.log('  GET  /intern/tasks - Get all tasks with progress');
  console.log('  POST /intern/start-task/:taskNumber - Start working on task');
  console.log('  POST /intern/submit-task/:taskNumber - Submit task with GitHub URL');
  console.log('  POST /intern/skip-task/:taskNumber - Skip a task');
  console.log('  GET  /intern/certificate-eligibility - Check certificate eligibility');
  console.log('  POST /intern/purchase-certificate - Purchase certificate (₹499)');
  console.log('  GET  /intern/paid-tasks - Get available paid tasks');
  console.log('  POST /intern/purchase-paid-task/:taskId - Purchase paid task (₹1000)');
  
  console.log('\n🔔 Notification Routes:');
  console.log('  GET  /notifications - Get user notifications');
  console.log('  PUT  /notifications/:id/read - Mark notification as read');
  console.log('  PUT  /notifications/mark-all-read - Mark all as read');
  
  console.log('\n🌐 Public Routes:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /stats - System statistics');
  console.log('  GET  /portal-settings - Portal configuration');
  console.log('  GET  /verify-certificate/:certificateId - Verify certificate');
  console.log('  GET  /certificates/:progressId - Generate certificate');
  
  console.log('\n🔗 Webhook Endpoints:');
  console.log('  POST /webhooks/payment - Payment gateway webhooks');
  
  console.log('\n✅ Enhanced Student LMS Backend is ready!');
  console.log('🎯 35-Day Internship Management System activated');
  console.log('🔔 Automated notifications and reminders enabled');
  console.log('💰 Certificate and paid task monetization ready');
  console.log('📊 Analytics and reporting features active');
  console.log('⚡ Real-time progress tracking operational');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📦 MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📦 MongoDB connection closed');
    process.exit(0);
  });
});