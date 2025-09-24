const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

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

// ==================== SCHEMAS ====================

// User Schema
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
    bio: String
  },
  assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  progress: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    completedAt: Date,
    score: Number
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Course Schema
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
  duration: Number, // in minutes
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Submission Schema
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

// Announcement Schema
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // empty array means all users
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

// Certificate Schema
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

// Portal Settings Schema (for admin customization)
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

// Models
const User = mongoose.model('User', userSchema);
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

const generateCertificateId = () => {
  return 'CERT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

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

    // Update last login
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
          profileDetails: user.profileDetails
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

    // Check if email already exists
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

// Get All Users (Admin Only)
app.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('assignedCourses', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Update User (Admin Only)
app.put('/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Don't allow updating password through this route
    delete updates.password;

    if (updates.email) {
      const existingUser = await User.findOne({ email: updates.email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// Toggle User Active Status (Admin Only)
app.patch('/admin/users/:userId/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: user.isActive }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// Create Course (Admin Only)
app.post('/admin/courses', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, category, difficulty, duration, assignedTo } = req.body;
    const content = {};

    if (!title || !description || !type) {
      return res.status(400).json({ success: false, message: 'Title, description, and type required' });
    }

    // Handle file upload
    if (req.file) {
      if (type === 'document') {
        content.documentUrl = `/uploads/${req.file.filename}`;
      } else if (type === 'video') {
        content.videoUrl = `/uploads/${req.file.filename}`;
      }
    }

    // Handle external link
    if (req.body.externalLink) {
      content.externalLink = req.body.externalLink;
    }

    // Handle quiz questions
    if (type === 'quiz' && req.body.quizQuestions) {
      content.quizQuestions = JSON.parse(req.body.quizQuestions);
    }

    const newCourse = new Course({
      title,
      description,
      type,
      content,
      category,
      difficulty,
      duration: duration ? parseInt(duration) : undefined,
      assignedTo: assignedTo ? JSON.parse(assignedTo) : [],
      createdBy: req.user._id
    });

    await newCourse.save();

    // Update assigned users
    if (assignedTo && assignedTo.length > 0) {
      const userIds = JSON.parse(assignedTo);
      await User.updateMany(
        { _id: { $in: userIds } },
        { $addToSet: { assignedCourses: newCourse._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course: newCourse }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, message: 'Failed to create course' });
  }
});

// Get All Courses (Admin Only)
app.get('/admin/courses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (category) query.category = category;

    const courses = await Course.find(query)
      .populate('assignedTo', 'name email userId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCourses: total,
          hasNext: skip + courses.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

// Assign Course to Users (Admin Only)
app.post('/admin/assign-course', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId, userIds } = req.body;

    if (!courseId || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'Course ID and user IDs array required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Update course's assigned users
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { assignedTo: { $each: userIds } }
    });

    // Update users' assigned courses
    await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { assignedCourses: courseId } }
    );

    res.json({
      success: true,
      message: 'Course assigned successfully',
      data: { courseId, assignedUsers: userIds.length }
    });
  } catch (error) {
    console.error('Assign course error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign course' });
  }
});

// Create Announcement (Admin Only)
app.post('/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, message, targetUsers, priority, expiresAt } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message required' });
    }

    const newAnnouncement = new Announcement({
      title,
      message,
      targetUsers: targetUsers || [], // empty array means all users
      priority: priority || 'medium',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user._id
    });

    await newAnnouncement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: { announcement: newAnnouncement }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

// Get All Submissions (Admin Only)
app.get('/admin/submissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, courseId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.status = status;
    if (courseId) query.courseId = courseId;

    const submissions = await Submission.find(query)
      .populate('userId', 'name email userId')
      .populate('courseId', 'title type')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSubmissions: total,
          hasNext: skip + submissions.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
});

// Review Submission (Admin Only)
app.put('/admin/submissions/:submissionId/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, score, feedback } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status (approved/rejected) required' });
    }

    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      {
        status,
        score,
        feedback,
        reviewedAt: new Date(),
        reviewedBy: req.user._id
      },
      { new: true }
    ).populate('userId courseId');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Update user progress if approved
    if (status === 'approved') {
      await User.findByIdAndUpdate(submission.userId._id, {
        $set: {
          'progress.$[elem].status': 'completed',
          'progress.$[elem].completedAt': new Date(),
          'progress.$[elem].score': score
        }
      }, {
        arrayFilters: [{ 'elem.courseId': submission.courseId._id }],
        upsert: false
      });

      // Check if user completed all assigned courses for certificate generation
      const user = await User.findById(submission.userId._id).populate('assignedCourses');
      const completedCourses = user.progress.filter(p => p.status === 'completed').length;
      
      if (completedCourses === user.assignedCourses.length) {
        // Generate certificate
        const certificateId = generateCertificateId();
        const certificate = new Certificate({
          userId: user._id,
          courseId: submission.courseId._id,
          certificateId,
          templateData: {
            userName: user.name,
            courseName: submission.courseId.title,
            completionDate: new Date(),
            score: score
          }
        });
        await certificate.save();
      }
    }

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: { submission }
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to review submission' });
  }
});

// Update Portal Settings (Admin Only)
app.put('/admin/portal-settings', authenticateToken, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    const updates = req.body;
    
    // Handle logo upload
    if (req.file) {
      updates['branding.logoUrl'] = `/uploads/${req.file.filename}`;
    }

    // Parse nested objects if they come as strings
    if (updates.theme && typeof updates.theme === 'string') {
      updates.theme = JSON.parse(updates.theme);
    }
    if (updates.features && typeof updates.features === 'string') {
      updates.features = JSON.parse(updates.features);
    }

    updates.updatedBy = req.user._id;
    updates.updatedAt = new Date();

    const settings = await PortalSettings.findOneAndUpdate(
      {},
      updates,
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Portal settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Update portal settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update portal settings' });
  }
});

// ==================== USER ROUTES ====================

// Get User's Assigned Courses
app.get('/user/courses', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'assignedCourses',
        match: { isActive: true }
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Add progress information to each course
    const coursesWithProgress = user.assignedCourses.map(course => {
      const progress = user.progress.find(p => 
        p.courseId && p.courseId.toString() === course._id.toString()
      );

      return {
        ...course.toObject(),
        progress: progress || { status: 'not_started' }
      };
    });

    res.json({
      success: true,
      data: { 
        courses: coursesWithProgress,
        totalCourses: coursesWithProgress.length
      }
    });
  } catch (error) {
    console.error('Get user courses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

// Get Single Course Details
app.get('/user/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user.assignedCourses.includes(courseId)) {
      return res.status(403).json({ success: false, message: 'Course not assigned to you' });
    }

    const course = await Course.findById(courseId);
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const progress = user.progress.find(p => 
      p.courseId && p.courseId.toString() === courseId
    );

    res.json({
      success: true,
      data: {
        course,
        progress: progress || { status: 'not_started' }
      }
    });
  } catch (error) {
    console.error('Get course details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch course details' });
  }
});

// Submit Assignment
app.post('/user/submit', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { courseId, submissionType, textAnswer, quizAnswers } = req.body;

    if (!courseId || !submissionType) {
      return res.status(400).json({ success: false, message: 'Course ID and submission type required' });
    }

    // Verify user has access to this course
    const user = await User.findById(req.user._id);
    if (!user.assignedCourses.includes(courseId)) {
      return res.status(403).json({ success: false, message: 'Course not assigned to you' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if user already submitted
    const existingSubmission = await Submission.findOne({
      userId: req.user._id,
      courseId: courseId
    });

    if (existingSubmission) {
      return res.status(400).json({ success: false, message: 'You have already submitted for this course' });
    }

    const content = {};

    // Handle different submission types
    switch (submissionType) {
      case 'file':
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'File required for file submission' });
        }
        content.fileUrl = `/uploads/${req.file.filename}`;
        break;
      
      case 'text':
        if (!textAnswer) {
          return res.status(400).json({ success: false, message: 'Text answer required' });
        }
        content.textAnswer = textAnswer;
        break;
      
      case 'quiz':
        if (!quizAnswers) {
          return res.status(400).json({ success: false, message: 'Quiz answers required' });
        }
        
        const parsedAnswers = JSON.parse(quizAnswers);
        let score = 0;
        const quizResults = parsedAnswers.map((answer, index) => {
          const correctAnswer = course.content.quizQuestions[index]?.correctAnswer;
          const isCorrect = answer.selectedAnswer === correctAnswer;
          if (isCorrect) {
            score += course.content.quizQuestions[index]?.points || 1;
          }
          return {
            questionIndex: index,
            selectedAnswer: answer.selectedAnswer,
            isCorrect
          };
        });
        
        content.quizAnswers = quizResults;
        break;
      
      default:
        return res.status(400).json({ success: false, message: 'Invalid submission type' });
    }

    const newSubmission = new Submission({
      userId: req.user._id,
      courseId,
      submissionType,
      content,
      score: submissionType === 'quiz' ? score : undefined
    });

    await newSubmission.save();

    // Update user progress to 'in_progress'
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'progress.$[elem].status': 'in_progress'
      }
    }, {
      arrayFilters: [{ 'elem.courseId': courseId }],
      upsert: false
    });

    // If no existing progress entry, create one
    const progressExists = user.progress.some(p => p.courseId && p.courseId.toString() === courseId);
    if (!progressExists) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          progress: {
            courseId,
            status: 'in_progress'
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: { submission: newSubmission }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit assignment' });
  }
});

// Get User's Submissions
app.get('/user/submissions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { userId: req.user._id };
    if (status) query.status = status;

    const submissions = await Submission.find(query)
      .populate('courseId', 'title type')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSubmissions: total,
          hasNext: skip + submissions.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
});

// Get User's Announcements
app.get('/user/announcements', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const announcements = await Announcement.find({
      $or: [
        { targetUsers: { $size: 0 } }, // Global announcements
        { targetUsers: req.user._id }  // User-specific announcements
      ],
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } }
      ]
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments({
      $or: [
        { targetUsers: { $size: 0 } },
        { targetUsers: req.user._id }
      ],
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } }
      ]
    });

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalAnnouncements: total,
          hasNext: skip + announcements.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user announcements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// Update User Profile (Limited)
app.put('/user/profile', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const allowedUpdates = ['profileDetails'];
    const updates = {};

    // Only allow updating profile details
    if (req.body.phone) updates['profileDetails.phone'] = req.body.phone;
    if (req.body.address) updates['profileDetails.address'] = req.body.address;
    if (req.body.dateOfBirth) updates['profileDetails.dateOfBirth'] = new Date(req.body.dateOfBirth);
    if (req.body.bio) updates['profileDetails.bio'] = req.body.bio;
    
    // Handle profile image upload
    if (req.file) {
      updates['profileDetails.profileImage'] = `/uploads/${req.file.filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid updates provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Get User's Certificates
app.get('/user/certificates', authenticateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({
      userId: req.user._id,
      isValid: true
    })
      .populate('courseId', 'title category')
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      data: { certificates }
    });
  } catch (error) {
    console.error('Get user certificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
});

// Get User Progress Summary
app.get('/user/progress', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('assignedCourses', 'title category')
      .populate('progress.courseId', 'title');

    const totalAssigned = user.assignedCourses.length;
    const completed = user.progress.filter(p => p.status === 'completed').length;
    const inProgress = user.progress.filter(p => p.status === 'in_progress').length;
    const notStarted = totalAssigned - completed - inProgress;

    const progressSummary = {
      totalCourses: totalAssigned,
      completed,
      inProgress,
      notStarted,
      completionRate: totalAssigned > 0 ? ((completed / totalAssigned) * 100).toFixed(2) : 0,
      averageScore: user.progress.length > 0 
        ? (user.progress.reduce((sum, p) => sum + (p.score || 0), 0) / user.progress.filter(p => p.score).length || 0).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      data: {
        progressSummary,
        detailedProgress: user.progress
      }
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
});

// ==================== PUBLIC ROUTES ====================

// Get Portal Settings (Public)
app.get('/portal-settings', async (req, res) => {
  try {
    const settings = await PortalSettings.findOne({});
    
    if (!settings) {
      // Return default settings if none exist
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
          welcomeMessage: 'Welcome to our Learning Management System'
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
    res.status(500).json({ success: false, message: 'Failed to fetch portal settings' });
  }
});

// Verify Certificate (Public)
app.get('/verify-certificate/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await Certificate.findOne({
      certificateId,
      isValid: true
    })
      .populate('userId', 'name')
      .populate('courseId', 'title category');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found or invalid' });
    }

    res.json({
      success: true,
      data: {
        isValid: true,
        certificate: {
          certificateId: certificate.certificateId,
          userName: certificate.userId.name,
          courseName: certificate.courseId.title,
          courseCategory: certificate.courseId.category,
          completionDate: certificate.templateData.completionDate,
          score: certificate.templateData.score,
          issuedAt: certificate.issuedAt
        }
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify certificate' });
  }
});

// ==================== DASHBOARD & ANALYTICS ROUTES ====================

// Admin Dashboard Stats
app.get('/admin/dashboard-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalSubmissions,
      pendingSubmissions,
      activeAnnouncements,
      totalCertificates
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Course.countDocuments({ isActive: true }),
      Submission.countDocuments({}),
      Submission.countDocuments({ status: 'pending' }),
      Announcement.countDocuments({ isActive: true }),
      Certificate.countDocuments({ isValid: true })
    ]);

    // Recent activity
    const recentSubmissions = await Submission.find({})
      .populate('userId', 'name')
      .populate('courseId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5);

    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalCourses,
          totalSubmissions,
          pendingSubmissions,
          activeAnnouncements,
          totalCertificates
        },
        recentActivity: {
          recentSubmissions,
          recentUsers
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// User Dashboard Stats
app.get('/user/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedCourses');
    
    const totalAssigned = user.assignedCourses.length;
    const completed = user.progress.filter(p => p.status === 'completed').length;
    const inProgress = user.progress.filter(p => p.status === 'in_progress').length;

    const submissions = await Submission.find({ userId: req.user._id });
    const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
    const approvedSubmissions = submissions.filter(s => s.status === 'approved').length;

    const certificates = await Certificate.countDocuments({
      userId: req.user._id,
      isValid: true
    });

    const recentAnnouncements = await Announcement.find({
      $or: [
        { targetUsers: { $size: 0 } },
        { targetUsers: req.user._id }
      ],
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: {
        stats: {
          totalAssignedCourses: totalAssigned,
          completedCourses: completed,
          inProgressCourses: inProgress,
          pendingSubmissions,
          approvedSubmissions,
          certificatesEarned: certificates,
          completionRate: totalAssigned > 0 ? ((completed / totalAssigned) * 100).toFixed(2) : 0
        },
        recentAnnouncements
      }
    });
  } catch (error) {
    console.error('Get user dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
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

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Create default admin user on startup
const createDefaultAdmin = async () => {
  try {
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
  } catch (error) {
    console.error('Failed to create default admin:', error);
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Student LMS Backend Server running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/auth/login`);
  
  // Create default admin user
  await createDefaultAdmin();
  
  console.log('\n📋 Available Routes:');
  console.log('Authentication:');
  console.log('  POST /auth/login - User login');
  console.log('  GET  /auth/me - Get current user');
  console.log('\nAdmin Routes:');
  console.log('  POST /admin/create-user - Create user account');
  console.log('  GET  /admin/users - Get all users');
  console.log('  POST /admin/courses - Create course');
  console.log('  POST /admin/assign-course - Assign course to users');
  console.log('  POST /admin/announcements - Create announcement');
  console.log('  GET  /admin/submissions - View all submissions');
  console.log('  PUT  /admin/submissions/:id/review - Review submission');
  console.log('\nUser Routes:');
  console.log('  GET  /user/courses - Get assigned courses');
  console.log('  POST /user/submit - Submit assignment');
  console.log('  GET  /user/announcements - View announcements');
  console.log('  PUT  /user/profile - Update profile');
  console.log('  GET  /user/certificates - Get certificates');
  console.log('\n✅ Student LMS Backend is ready!');
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