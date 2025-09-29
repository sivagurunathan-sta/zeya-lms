// app.js - Complete LMS Student Portal Backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE SETUP ====================

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== DATABASE CONNECTION ====================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// ==================== DATABASE SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'intern'], default: 'intern' },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
  profileImage: { type: String },
  enrollments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Course Schema
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['WEB_DEVELOPMENT', 'MOBILE_DEVELOPMENT', 'DATA_SCIENCE', 'DESIGN', 'MARKETING'],
    required: true 
  },
  difficulty: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER' },
  duration: { type: Number, required: true }, // in weeks
  price: { type: Number, required: true },
  certificatePrice: { type: Number, default: 499 },
  image: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DRAFT'], default: 'ACTIVE' },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  enrolledCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  taskOrder: { type: Number, required: true },
  estimatedHours: { type: Number, required: true },
  resources: {
    videos: [{ name: String, url: String, duration: Number }],
    documents: [{ name: String, url: String, type: String }],
    links: [{ title: String, url: String, description: String }]
  },
  submissionType: { type: String, enum: ['LINK', 'FILE', 'BOTH'], default: 'BOTH' },
  maxFileSize: { type: Number, default: 10 }, // in MB
  allowedFileTypes: [{ type: String }],
  isRequired: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'], default: 'ACTIVE' },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  progressPercentage: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  totalTasks: { type: Number, default: 0 },
  currentTaskOrder: { type: Number, default: 1 },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
  certificateIssued: { type: Boolean, default: false },
  certificatePurchased: { type: Boolean, default: false },
  averageScore: { type: Number, default: 0 },
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  updatedAt: { type: Date, default: Date.now }
});

// Submission Schema
const submissionSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissionType: { type: String, enum: ['LINK', 'FILE'], required: true },
  githubLink: { type: String },
  files: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  notes: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feedback: { type: String },
  grade: { type: Number, min: 0, max: 100 },
  attempts: { type: Number, default: 1 },
  isLate: { type: Boolean, default: false }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['COURSE', 'CERTIFICATE'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, enum: ['UPI', 'CARD', 'NET_BANKING', 'WALLET'], required: true },
  transactionId: { type: String, required: true },
  paymentGatewayId: { type: String },
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  proofDocument: { type: String },
  submittedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  refundReason: { type: String },
  refundedAt: { type: Date }
});

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateNumber: { type: String, unique: true, required: true },
  verificationCode: { type: String, unique: true, required: true },
  issuedAt: { type: Date, default: Date.now },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  certificateUrl: { type: String },
  completionScore: { type: Number, required: true },
  validUntil: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
  revokedAt: { type: Date },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokeReason: { type: String }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'], default: 'INFO' },
  category: { type: String, enum: ['SYSTEM', 'COURSE', 'PAYMENT', 'CERTIFICATE', 'TASK'], required: true },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date }
});

// Chat Schema
const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    timestamp: { type: Date, default: Date.now }
  },
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Task = mongoose.model('Task', taskSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Chat = mongoose.model('Chat', chatSchema);

// ==================== FILE UPLOAD CONFIGURATION ====================

// Ensure upload directories exist
const uploadDirs = ['uploads/courses', 'uploads/tasks', 'uploads/submissions', 'uploads/payments', 'uploads/certificates', 'uploads/profiles'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration for different file types
const createMulterConfig = (destination, fileFilter) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, destination);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter || ((req, file, cb) => {
      cb(null, true);
    })
  });
};

// Specific upload configurations
const courseImageUpload = createMulterConfig('uploads/courses', (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for course images!'), false);
  }
});

const taskResourceUpload = createMulterConfig('uploads/tasks');

const submissionUpload = createMulterConfig('uploads/submissions', (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.zip', '.rar', '.txt', '.jpg', '.jpeg', '.png'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed!'), false);
  }
});

const paymentProofUpload = createMulterConfig('uploads/payments', (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed for payment proof!'), false);
  }
});

// ==================== UTILITY FUNCTIONS ====================

// Generate unique IDs
const generateUniqueId = (prefix = '') => {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
};

// Generate verification codes
const generateVerificationCode = () => {
  return Math.random().toString(36).substr(2, 10).toUpperCase();
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
};

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send notification email
const sendNotificationEmail = async (to, subject, html) => {
  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@studentlms.com',
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// Create notification
const createNotification = async (userId, title, message, type = 'INFO', category = 'SYSTEM', data = null) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      category,
      data
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
// ==================== MIDDLEWARE ====================

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is suspended or inactive' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

// ==================== AUTHENTICATION ROUTES ====================

// Admin login
app.post('/api/auth/admin-login', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest
], async (req, res) => {
  try {
    const { userId, password } = req.body;

    const user = await User.findOne({ 
      $or: [{ userId }, { email: userId }],
      role: 'admin'
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or inactive'
      });
    }

    const token = generateToken({ 
      id: user._id, 
      role: user.role,
      userId: user.userId 
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Intern login
app.post('/api/auth/intern-login', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest
], async (req, res) => {
  try {
    const { userId, password } = req.body;

    const user = await User.findOne({ 
      $or: [{ userId }, { email: userId }],
      role: 'intern'
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or inactive'
      });
    }

    const token = generateToken({ 
      id: user._id, 
      role: user.role,
      userId: user.userId 
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Intern login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get admin dashboard data
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'intern' });
    const activeCourses = await Course.countDocuments({ status: 'ACTIVE' });
    const pendingSubmissions = await Submission.countDocuments({ status: 'PENDING' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'VERIFIED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const recentSubmissions = await Submission.find({ status: 'PENDING' })
      .populate('studentId', 'firstName lastName email')
      .populate('taskId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5);

    const recentPayments = await Payment.find({ status: 'PENDING' })
      .populate('studentId', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .limit(5);

    const recentEnrollments = await Enrollment.find()
      .populate('studentId', 'firstName lastName email')
      .populate('courseId', 'title')
      .sort({ enrolledAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          activeCourses,
          pendingSubmissions,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentSubmissions,
        recentPayments,
        recentEnrollments
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get all users with filters
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, role } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get user statistics
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const enrollments = await Enrollment.find({ studentId: user._id });
      const completedCourses = enrollments.filter(e => e.status === 'COMPLETED').length;
      const certificates = await Certificate.countDocuments({ studentId: user._id });
      const totalPayments = await Payment.aggregate([
        { $match: { studentId: user._id, status: 'VERIFIED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      return {
        ...user.toObject(),
        stats: {
          totalCourses: enrollments.length,
          completedCourses,
          certificates,
          totalPayments: totalPayments[0]?.total || 0
        }
      };
    }));

    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Create new user
app.post('/api/admin/users', authenticateToken, requireAdmin, [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'intern']).withMessage('Valid role is required'),
  validateRequest
], async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate unique user ID
    const userId = generateUniqueId('USR');

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      userId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      role
    });

    await user.save();

    // Send welcome email
    await sendNotificationEmail(
      email,
      'Welcome to Student LMS',
      `
        <h2>Welcome to Student LMS!</h2>
        <p>Dear ${firstName} ${lastName},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please login and change your password for security.</p>
        <p>Best regards,<br>Student LMS Team</p>
      `
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Update user
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.password;
    delete updates.userId;

    updates.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Update user status
app.put('/api/admin/users/:id/status', authenticateToken, requireAdmin, [
  body('status').isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE']).withMessage('Valid status is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create notification
    await createNotification(
      user._id,
      'Account Status Updated',
      `Your account status has been changed to ${status}`,
      status === 'SUSPENDED' ? 'WARNING' : 'INFO',
      'SYSTEM'
    );

    res.json({
      success: true,
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// ==================== COURSE MANAGEMENT ROUTES ====================

// Get all courses
app.get('/api/admin/courses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const courses = await Course.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('tasks')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Create new course
app.post('/api/admin/courses', authenticateToken, requireAdmin, courseImageUpload.single('image'), [
  body('title').notEmpty().withMessage('Course title is required'),
  body('description').notEmpty().withMessage('Course description is required'),
  body('category').isIn(['WEB_DEVELOPMENT', 'MOBILE_DEVELOPMENT', 'DATA_SCIENCE', 'DESIGN', 'MARKETING']).withMessage('Valid category is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('price').isNumeric().withMessage('Price must be a number'),
  validateRequest
], async (req, res) => {
  try {
    const { title, description, category, difficulty, duration, price, certificatePrice, tasks } = req.body;

    const course = new Course({
      title,
      description,
      category,
      difficulty: difficulty || 'BEGINNER',
      duration: parseInt(duration),
      price: parseFloat(price),
      certificatePrice: certificatePrice ? parseFloat(certificatePrice) : 499,
      image: req.file ? `/uploads/courses/${req.file.filename}` : null,
      createdBy: req.user._id
    });

    await course.save();

    // Create tasks if provided
    if (tasks && Array.isArray(JSON.parse(tasks))) {
      const parsedTasks = JSON.parse(tasks);
      const createdTasks = [];

      for (const taskData of parsedTasks) {
        const task = new Task({
          courseId: course._id,
          title: taskData.title,
          description: taskData.description,
          taskOrder: taskData.order,
          estimatedHours: parseInt(taskData.estimatedHours) || 1,
          resources: taskData.resources || { videos: [], documents: [], links: [] }
        });

        await task.save();
        createdTasks.push(task._id);
      }

      course.tasks = createdTasks;
      await course.save();
    }

    const populatedCourse = await Course.findById(course._id)
      .populate('createdBy', 'firstName lastName')
      .populate('tasks');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: populatedCourse
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course'
    });
  }
});

// Update course
app.put('/api/admin/courses/:id', authenticateToken, requireAdmin, courseImageUpload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (req.file) {
      updates.image = `/uploads/courses/${req.file.filename}`;
    }

    updates.updatedAt = new Date();

    const course = await Course.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName').populate('tasks');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course'
    });
  }
});

// Delete course
app.delete('/api/admin/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if course has enrollments
    const enrollmentCount = await Enrollment.countDocuments({ courseId: id });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with existing enrollments'
      });
    }

    // Delete associated tasks
    await Task.deleteMany({ courseId: id });

    // Delete course
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course'
    });
  }
});

// ==================== TASK MANAGEMENT ROUTES ====================

// Get tasks for a course
app.get('/api/admin/courses/:courseId/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;

    const tasks = await Task.find({ courseId })
      .sort({ taskOrder: 1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Create new task
app.post('/api/admin/courses/:courseId/tasks', authenticateToken, requireAdmin, taskResourceUpload.fields([
  { name: 'videos', maxCount: 10 },
  { name: 'documents', maxCount: 10 }
]), [
  body('title').notEmpty().withMessage('Task title is required'),
  body('description').notEmpty().withMessage('Task description is required'),
  body('taskOrder').isNumeric().withMessage('Task order must be a number'),
  body('estimatedHours').isNumeric().withMessage('Estimated hours must be a number'),
  validateRequest
], async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, taskOrder, estimatedHours, submissionType, isRequired } = req.body;

    // Process uploaded files
    const resources = { videos: [], documents: [], links: [] };

    if (req.files) {
      if (req.files.videos) {
        resources.videos = req.files.videos.map(file => ({
          name: file.originalname,
          url: `/uploads/tasks/${file.filename}`,
          duration: 0 // Can be updated later
        }));
      }

      if (req.files.documents) {
        resources.documents = req.files.documents.map(file => ({
          name: file.originalname,
          url: `/uploads/tasks/${file.filename}`,
          type: path.extname(file.originalname)
        }));
      }
    }

    const task = new Task({
      courseId,
      title,
      description,
      taskOrder: parseInt(taskOrder),
      estimatedHours: parseInt(estimatedHours),
      resources,
      submissionType: submissionType || 'BOTH',
      isRequired: isRequired !== 'false'
    });

    await task.save();

    // Update course with new task
    await Course.findByIdAndUpdate(
      courseId,
      { $push: { tasks: task._id }, updatedAt: new Date() }
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

// Update task
app.put('/api/admin/tasks/:id', authenticateToken, requireAdmin, taskResourceUpload.fields([
  { name: 'videos', maxCount: 10 },
  { name: 'documents', maxCount: 10 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Process uploaded files if any
    if (req.files) {
      const existingTask = await Task.findById(id);
      const resources = existingTask.resources;

      if (req.files.videos) {
        const newVideos = req.files.videos.map(file => ({
          name: file.originalname,
          url: `/uploads/tasks/${file.filename}`,
          duration: 0
        }));
        resources.videos = [...resources.videos, ...newVideos];
      }

      if (req.files.documents) {
        const newDocuments = req.files.documents.map(file => ({
          name: file.originalname,
          url: `/uploads/tasks/${file.filename}`,
          type: path.extname(file.originalname)
        }));
        resources.documents = [...resources.documents, ...newDocuments];
      }

      updates.resources = resources;
    }

    updates.updatedAt = new Date();

    const task = await Task.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

// Delete task
app.delete('/api/admin/tasks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Remove task from course
    await Course.findByIdAndUpdate(
      task.courseId,
      { $pull: { tasks: id }, updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

// ==================== SUBMISSION REVIEW ROUTES ====================

// Get pending submissions
app.get('/api/admin/submissions/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'PENDING', courseId } = req.query;
    const query = { status };

    if (courseId) {
      const course = await Course.findById(courseId);
      if (course) {
        const taskIds = await Task.find({ courseId }).distinct('_id');
        query.taskId = { $in: taskIds };
      }
    }

    const submissions = await Submission.find(query)
      .populate('studentId', 'firstName lastName email userId')
      .populate('taskId', 'title description courseId')
      .populate('enrollmentId', 'courseId')
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseId',
          select: 'title'
        }
      })
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.json({
      success: true,
      submissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get pending submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
});

// Review submission
app.put('/api/admin/submissions/:id/review', authenticateToken, requireAdmin, [
  body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Valid status is required'),
  body('feedback').notEmpty().withMessage('Feedback is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback, grade } = req.body;

    const submission = await Submission.findByIdAndUpdate(
      id,
      {
        status,
        feedback,
        grade: grade ? parseInt(grade) : null,
        reviewedAt: new Date(),
        reviewedBy: req.user._id
      },
      { new: true }
    ).populate('studentId', 'firstName lastName email')
     .populate('taskId', 'title taskOrder')
     .populate('enrollmentId');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Update enrollment progress if approved
    if (status === 'APPROVED') {
      const enrollment = await Enrollment.findById(submission.enrollmentId);
      if (enrollment) {
        // Mark current task as completed and unlock next task
        const totalTasks = await Task.countDocuments({ courseId: enrollment.courseId });
        const completedTasks = await Submission.countDocuments({
          enrollmentId: enrollment._id,
          status: 'APPROVED'
        });

        const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

        await Enrollment.findByIdAndUpdate(enrollment._id, {
          completedTasks,
          progressPercentage,
          currentTaskOrder: submission.taskId.taskOrder + 1,
          updatedAt: new Date()
        });

        // Check if course is completed
        if (completedTasks === totalTasks) {
          await Enrollment.findByIdAndUpdate(enrollment._id, {
            status: 'COMPLETED',
            completedAt: new Date()
          });
        }
      }
    }

    // Create notification for student
    await createNotification(
      submission.studentId._id,
      'Task Reviewed',
      `Your submission for "${submission.taskId.title}" has been ${status.toLowerCase()}`,
      status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      'TASK',
      {
        submissionId: submission._id,
        taskId: submission.taskId._id,
        status,
        feedback
      }
    );

    // Send email notification
    await sendNotificationEmail(
      submission.studentId.email,
      `Task ${status} - ${submission.taskId.title}`,
      `
        <h2>Task Review Update</h2>
        <p>Dear ${submission.studentId.firstName},</p>
        <p>Your submission for "<strong>${submission.taskId.title}</strong>" has been <strong>${status.toLowerCase()}</strong>.</p>
        <p><strong>Feedback:</strong> ${feedback}</p>
        ${grade ? `<p><strong>Grade:</strong> ${grade}/100</p>` : ''}
        <p>Please check your dashboard for more details.</p>
        <p>Best regards,<br>Student LMS Team</p>
      `
    );

    res.json({
      success: true,
      message: `Submission ${status.toLowerCase()} successfully`,
      submission
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review submission'
    });
  }
});

// ==================== PAYMENT MANAGEMENT ROUTES ====================

// Get payments for admin
app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, method } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (method) query.paymentMethod = method;

    const payments = await Payment.find(query)
      .populate('studentId', 'firstName lastName email userId')
      .populate('enrollmentId')
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseId',
          select: 'title price'
        }
      })
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Verify payment
app.put('/api/admin/payments/:id/verify', authenticateToken, requireAdmin, [
  body('status').isIn(['VERIFIED', 'FAILED']).withMessage('Valid status is required'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const payment = await Payment.findByIdAndUpdate(
      id,
      {
        status,
        notes,
        verifiedAt: new Date(),
        verifiedBy: req.user._id
      },
      { new: true }
    ).populate('studentId', 'firstName lastName email')
     .populate('enrollmentId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update enrollment payment status if verified
    if (status === 'VERIFIED' && payment.enrollmentId) {
      await Enrollment.findByIdAndUpdate(payment.enrollmentId._id, {
        paymentStatus: 'PAID',
        updatedAt: new Date()
      });
    }

    // Create notification for student
    await createNotification(
      payment.studentId._id,
      'Payment Update',
      `Your payment of ₹${payment.amount} has been ${status.toLowerCase()}`,
      status === 'VERIFIED' ? 'SUCCESS' : 'ERROR',
      'PAYMENT',
      {
        paymentId: payment._id,
        status,
        amount: payment.amount
      }
    );

    // Send email notification
    await sendNotificationEmail(
      payment.studentId.email,
      `Payment ${status} - ₹${payment.amount}`,
      `
        <h2>Payment Update</h2>
        <p>Dear ${payment.studentId.firstName},</p>
        <p>Your payment of <strong>₹${payment.amount}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        <p>Transaction ID: <strong>${payment.transactionId}</strong></p>
        <p>Please check your dashboard for more details.</p>
        <p>Best regards,<br>Student LMS Team</p>
      `
    );

    res.json({
      success: true,
      message: `Payment ${status.toLowerCase()} successfully`,
      payment
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});
// ==================== STUDENT ROUTES ====================

// Get student dashboard
app.get('/api/student/dashboard', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate('courseId', 'title');

    const totalTasks = await Submission.countDocuments({ studentId: req.user._id });
    const completedTasks = await Submission.countDocuments({ 
      studentId: req.user._id, 
      status: 'APPROVED' 
    });

    const certificates = await Certificate.countDocuments({ studentId: req.user._id });

    const nextDeadlines = await Submission.find({
      studentId: req.user._id,
      status: 'PENDING'
    }).populate('taskId', 'title').limit(5);

    const recentActivities = await Submission.find({ studentId: req.user._id })
      .populate('taskId', 'title')
      .sort({ submittedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          enrolledCourses: enrollments.length,
          totalTasks,
          completedTasks,
          certificates,
          progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        enrollments,
        nextDeadlines,
        recentActivities
      }
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get student enrollments
app.get('/api/student/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate('courseId')
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      enrollments
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
});

// Get tasks for enrollment
app.get('/api/student/enrollments/:enrollmentId/tasks', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId: req.user._id
    }).populate('courseId');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const tasks = await Task.find({ courseId: enrollment.courseId._id })
      .sort({ taskOrder: 1 });

    // Get submissions for these tasks
    const submissions = await Submission.find({
      enrollmentId: enrollment._id,
      taskId: { $in: tasks.map(t => t._id) }
    });

    // Add submission data and unlock status to tasks
    const tasksWithStatus = tasks.map(task => {
      const submission = submissions.find(s => s.taskId.toString() === task._id.toString());
      const isUnlocked = task.taskOrder <= enrollment.currentTaskOrder;
      const isCompleted = submission && submission.status === 'APPROVED';
      const canSubmit = isUnlocked && !isCompleted && !submission;

      return {
        ...task.toObject(),
        isUnlocked,
        isCompleted,
        canSubmit,
        submission
      };
    });

    res.json({
      success: true,
      enrollment,
      tasks: tasksWithStatus
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Submit task
app.post('/api/student/tasks/:taskId/submit', authenticateToken, submissionUpload.array('files', 5), [
  body('enrollmentId').notEmpty().withMessage('Enrollment ID is required'),
  body('submissionType').isIn(['LINK', 'FILE']).withMessage('Valid submission type is required'),
  validateRequest
], async (req, res) => {
  try {
    const { taskId } = req.params;
    const { enrollmentId, submissionType, githubLink, notes } = req.body;

    // Verify enrollment belongs to student
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId: req.user._id
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if task is unlocked
    const task = await Task.findById(taskId);
    if (!task || task.taskOrder > enrollment.currentTaskOrder) {
      return res.status(403).json({
        success: false,
        message: 'Task is not unlocked yet'
      });
    }

    // Check if already submitted and pending/approved
    const existingSubmission = await Submission.findOne({
      enrollmentId,
      taskId,
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Task already submitted'
      });
    }

    // Process files if uploaded
    const files = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimeType: file.mimetype
    })) : [];

    // Create submission
    const submission = new Submission({
      enrollmentId,
      taskId,
      studentId: req.user._id,
      submissionType,
      githubLink: submissionType === 'LINK' ? githubLink : null,
      files: submissionType === 'FILE' ? files : [],
      notes
    });

    await submission.save();

    // Update enrollment
    await Enrollment.findByIdAndUpdate(enrollmentId, {
      $push: { submissions: submission._id },
      updatedAt: new Date()
    });

    // Create notification for admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'New Task Submission',
        `${req.user.firstName} ${req.user.lastName} submitted "${task.title}"`,
        'INFO',
        'TASK',
        {
          submissionId: submission._id,
          taskId: task._id,
          studentId: req.user._id
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Task submitted successfully',
      submission
    });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task'
    });
  }
});

// Submit payment proof
app.post('/api/student/payments/submit-proof', authenticateToken, paymentProofUpload.single('proof'), [
  body('enrollmentId').optional().notEmpty().withMessage('Enrollment ID cannot be empty'),
  body('type').isIn(['COURSE', 'CERTIFICATE']).withMessage('Valid payment type is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentMethod').isIn(['UPI', 'CARD', 'NET_BANKING', 'WALLET']).withMessage('Valid payment method is required'),
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { enrollmentId, type, amount, paymentMethod, transactionId } = req.body;

    // Check for duplicate transaction ID
    const existingPayment = await Payment.findOne({ transactionId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID already exists'
      });
    }

    const payment = new Payment({
      enrollmentId: enrollmentId || null,
      studentId: req.user._id,
      type,
      amount: parseFloat(amount),
      paymentMethod,
      transactionId,
      proofDocument: req.file ? `/uploads/payments/${req.file.filename}` : null
    });

    await payment.save();

    // Add payment to enrollment if it's a course payment
    if (enrollmentId) {
      await Enrollment.findByIdAndUpdate(enrollmentId, {
        $push: { payments: payment._id },
        updatedAt: new Date()
      });
    }

    // Create notification for admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'New Payment Submission',
        `${req.user.firstName} ${req.user.lastName} submitted payment proof for ₹${amount}`,
        'INFO',
        'PAYMENT',
        {
          paymentId: payment._id,
          studentId: req.user._id,
          amount
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted successfully',
      payment
    });
  } catch (error) {
    console.error('Submit payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit payment proof'
    });
  }
});

// Get student payment history
app.get('/api/student/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ studentId: req.user._id })
      .populate('enrollmentId')
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseId',
          select: 'title'
        }
      })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// Get student certificates
app.get('/api/student/certificates', authenticateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({ studentId: req.user._id })
      .populate('courseId', 'title')
      .populate('enrollmentId')
      .sort({ issuedAt: -1 });

    // Get eligible certificates (completed courses with 75%+ score)
    const enrollments = await Enrollment.find({
      studentId: req.user._id,
      status: 'COMPLETED',
      progressPercentage: { $gte: 75 },
      certificateIssued: false
    }).populate('courseId', 'title certificatePrice');

    res.json({
      success: true,
      certificates,
      eligible: enrollments
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates'
    });
  }
});

// Purchase certificate
app.post('/api/student/certificates/:enrollmentId/purchase', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId: req.user._id,
      status: 'COMPLETED',
      progressPercentage: { $gte: 75 },
      certificateIssued: false
    }).populate('courseId');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not eligible for certificate'
      });
    }

    // Check if payment for certificate exists and is verified
    const certificatePayment = await Payment.findOne({
      studentId: req.user._id,
      type: 'CERTIFICATE',
      status: 'VERIFIED',
      amount: enrollment.courseId.certificatePrice
    });

    if (!certificatePayment) {
      return res.status(400).json({
        success: false,
        message: 'Certificate payment not found or not verified'
      });
    }

    // Generate certificate
    const certificateNumber = generateUniqueId('CERT');
    const verificationCode = generateVerificationCode();

    const certificate = new Certificate({
      enrollmentId: enrollment._id,
      studentId: req.user._id,
      courseId: enrollment.courseId._id,
      certificateNumber,
      verificationCode,
      issuedBy: req.user._id, // In real app, this would be admin
      completionScore: enrollment.averageScore,
      certificateUrl: `/certificates/${certificateNumber}.pdf` // Would be generated
    });

    await certificate.save();

    // Update enrollment
    await Enrollment.findByIdAndUpdate(enrollmentId, {
      certificateIssued: true,
      certificatePurchased: true,
      updatedAt: new Date()
    });

    // Create notification
    await createNotification(
      req.user._id,
      'Certificate Issued',
      `Your certificate for "${enrollment.courseId.title}" has been issued`,
      'SUCCESS',
      'CERTIFICATE',
      {
        certificateId: certificate._id,
        certificateNumber,
        verificationCode
      }
    );

    // Send email
    await sendNotificationEmail(
      req.user.email,
      `Certificate Issued - ${enrollment.courseId.title}`,
      `
        <h2>Congratulations!</h2>
        <p>Dear ${req.user.firstName},</p>
        <p>Your certificate for "<strong>${enrollment.courseId.title}</strong>" has been issued successfully.</p>
        <p><strong>Certificate Number:</strong> ${certificateNumber}</p>
        <p><strong>Verification Code:</strong> ${verificationCode}</p>
        <p>You can download your certificate from your dashboard.</p>
        <p>Best regards,<br>Student LMS Team</p>
      `
    );

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      certificate
    });
  } catch (error) {
    console.error('Purchase certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to issue certificate'
    });
  }
});

// Get student notifications
app.get('/api/student/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, read } = req.query;
    const query = { userId: req.user._id };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      read: false 
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
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

// Mark notification as read
app.put('/api/student/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
app.put('/api/student/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// ==================== PUBLIC ROUTES ====================

// Get available courses for enrollment
app.get('/api/courses/available', async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;
    const query = { status: 'ACTIVE' };

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('tasks')
      .select('-createdBy')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Enroll in course
app.post('/api/courses/:courseId/enroll', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists and is active
    const course = await Course.findOne({ _id: courseId, status: 'ACTIVE' });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      studentId: req.user._id,
      courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Get total tasks for this course
    const totalTasks = await Task.countDocuments({ courseId });

    // Create enrollment
    const enrollment = new Enrollment({
      studentId: req.user._id,
      courseId,
      totalTasks
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrolledCount: 1 },
      updatedAt: new Date()
    });

    // Update user enrollments
    await User.findByIdAndUpdate(req.user._id, {
      $push: { enrollments: enrollment._id },
      updatedAt: new Date()
    });

    // Create notification
    await createNotification(
      req.user._id,
      'Course Enrollment',
      `Successfully enrolled in "${course.title}"`,
      'SUCCESS',
      'COURSE',
      {
        enrollmentId: enrollment._id,
        courseId: course._id
      }
    );

    // Send welcome email
    await sendNotificationEmail(
      req.user.email,
      `Welcome to ${course.title}`,
      `
        <h2>Welcome to ${course.title}!</h2>
        <p>Dear ${req.user.firstName},</p>
        <p>You have successfully enrolled in "<strong>${course.title}</strong>".</p>
        <p>Course Details:</p>
        <ul>
          <li>Duration: ${course.duration} weeks</li>
          <li>Total Tasks: ${totalTasks}</li>
          <li>Difficulty: ${course.difficulty}</li>
        </ul>
        <p>You can start with your first task from your dashboard.</p>
        <p>Best regards,<br>Student LMS Team</p>
      `
    );

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error) {
    console.error('Course enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course'
    });
  }
});

// ==================== HEALTH CHECK & ERROR HANDLING ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Student LMS API is ready!`);
});

// Create default admin user if none exists
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await hashPassword('admin123');
      const admin = new User({
        userId: 'ADMIN001',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@lms.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Default admin user created');
      console.log('📧 Email: admin@lms.com');
      console.log('🔑 Password: admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Initialize default data
mongoose.connection.once('open', async () => {
  await createDefaultAdmin();
});

module.exports = app;