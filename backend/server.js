// server.js - Main Express Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['admin', 'intern'], default: 'intern' },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Internship Schema
const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  coverImage: { type: String },
  totalTasks: { type: Number, required: true },
  duration: { type: Number, required: true }, // in days
  fee: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  internshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
  taskNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String },
  videoUrl: { type: String },
  attachments: [{ fileName: String, filePath: String }],
  timeLimit: { type: Number, default: 24 }, // hours
  points: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  internId: { type: String, required: true },
  internshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
  enrolledAt: { type: Date, default: Date.now },
  currentTask: { type: Number, default: 1 },
  completedTasks: [{ 
    taskNumber: Number, 
    completedAt: Date,
    score: Number,
    submissionUrl: String 
  }],
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'suspended'], default: 'active' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'verified'], default: 'pending' },
  certificateIssued: { type: Boolean, default: false },
  certificatePath: { type: String }
});

// Task Submission Schema
const submissionSchema = new mongoose.Schema({
  internId: { type: String, required: true },
  internshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  taskNumber: { type: Number, required: true },
  githubUrl: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  isLate: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  feedback: { type: String },
  status: { type: String, enum: ['pending', 'reviewed', 'approved', 'rejected'], default: 'pending' }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  internId: { type: String, required: true },
  internshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'QR_CODE' },
  transactionId: { type: String },
  paymentProof: { type: String }, // image path
  status: { type: String, enum: ['pending', 'completed', 'failed', 'verified'], default: 'pending' },
  qrCodeData: { type: String },
  createdAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  verifiedBy: { type: String }
});

// Models
const User = mongoose.model('User', userSchema);
const Internship = mongoose.model('Internship', internshipSchema);
const Task = mongoose.model('Task', taskSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = file.fieldname === 'coverImage' ? 'uploads/covers/' : 
                      file.fieldname === 'attachment' ? 'uploads/attachments/' : 
                      file.fieldname === 'certificate' ? 'uploads/certificates/' : 'uploads/payments/';
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Generate unique user ID
const generateUserId = async () => {
  let userId;
  let exists = true;
  
  while (exists) {
    userId = 'LMS' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const existingUser = await User.findOne({ userId });
    exists = !!existingUser;
  }
  
  return userId;
};

// AUTHENTICATION ROUTES

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    const user = await User.findOne({ userId, role: 'admin' });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Intern Login
app.post('/api/auth/intern-login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    const user = await User.findOne({ userId, role: 'intern', isActive: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or account inactive' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ADMIN ROUTES

// Create Intern User
app.post('/api/admin/create-intern', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    const userId = await generateUserId();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const intern = new User({
      userId,
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'intern',
      createdBy: req.user.userId
    });

    await intern.save();
    
    res.json({
      message: 'Intern created successfully',
      intern: {
        userId: intern.userId,
        name: intern.name,
        email: intern.email,
        phone: intern.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating intern', error: error.message });
  }
});

// Get All Interns
app.get('/api/admin/interns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const interns = await User.find({ role: 'intern' }).select('-password');
    res.json(interns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching interns', error: error.message });
  }
});

// Create Internship
app.post('/api/admin/internships', authenticateToken, requireAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, totalTasks, duration, fee } = req.body;
    
    const internship = new Internship({
      title,
      description,
      totalTasks: parseInt(totalTasks),
      duration: parseInt(duration),
      fee: parseFloat(fee),
      coverImage: req.file ? req.file.path : null
    });

    await internship.save();
    res.json({ message: 'Internship created successfully', internship });
  } catch (error) {
    res.status(500).json({ message: 'Error creating internship', error: error.message });
  }
});

// Get All Internships
app.get('/api/admin/internships', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const internships = await Internship.find();
    res.json(internships);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching internships', error: error.message });
  }
});

// Create Task
app.post('/api/admin/tasks', authenticateToken, requireAdmin, upload.array('attachments', 5), async (req, res) => {
  try {
    const { internshipId, taskNumber, title, description, instructions, videoUrl, timeLimit, points } = req.body;
    
    const attachments = req.files ? req.files.map(file => ({
      fileName: file.originalname,
      filePath: file.path
    })) : [];

    const task = new Task({
      internshipId,
      taskNumber: parseInt(taskNumber),
      title,
      description,
      instructions,
      videoUrl,
      attachments,
      timeLimit: parseInt(timeLimit) || 24,
      points: parseInt(points) || 10
    });

    await task.save();
    res.json({ message: 'Task created successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Get Tasks for Internship
app.get('/api/admin/internships/:id/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tasks = await Task.find({ internshipId: req.params.id }).sort({ taskNumber: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Get All Submissions
app.get('/api/admin/submissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate('internshipId', 'title')
      .populate('taskId', 'title taskNumber')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
});

// Review Submission
app.put('/api/admin/submissions/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { score, feedback, status } = req.body;
    
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { score, feedback, status },
      { new: true }
    );

    // Update enrollment score
    if (status === 'approved') {
      await Enrollment.updateOne(
        { internId: submission.internId, internshipId: submission.internshipId },
        { 
          $inc: { totalScore: score },
          $push: { 
            completedTasks: {
              taskNumber: submission.taskNumber,
              completedAt: submission.submittedAt,
              score: score,
              submissionUrl: submission.githubUrl
            }
          }
        }
      );
    }

    res.json({ message: 'Submission reviewed successfully', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error reviewing submission', error: error.message });
  }
});

// Get All Payments
app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('internshipId', 'title fee')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
});

// Verify Payment
app.put('/api/admin/payments/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: req.user.userId
      },
      { new: true }
    );

    // Update enrollment payment status
    await Enrollment.updateOne(
      { internId: payment.internId, internshipId: payment.internshipId },
      { paymentStatus: 'verified' }
    );

    res.json({ message: 'Payment verified successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

// Upload Certificate
app.post('/api/admin/certificate/:internId/:internshipId', authenticateToken, requireAdmin, upload.single('certificate'), async (req, res) => {
  try {
    const { internId, internshipId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Certificate file required' });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { internId, internshipId },
      { 
        certificateIssued: true,
        certificatePath: req.file.path
      },
      { new: true }
    );

    res.json({ message: 'Certificate uploaded successfully', enrollment });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading certificate', error: error.message });
  }
});

// INTERN ROUTES

// Get Available Internships for Intern
app.get('/api/intern/internships', authenticateToken, async (req, res) => {
  try {
    const internships = await Internship.find({ isActive: true });
    const enrollments = await Enrollment.find({ internId: req.user.userId });
    
    const enrichedInternships = internships.map(internship => {
      const enrollment = enrollments.find(e => e.internshipId.toString() === internship._id.toString());
      return {
        ...internship.toObject(),
        enrolled: !!enrollment,
        paymentStatus: enrollment?.paymentStatus || 'pending',
        currentTask: enrollment?.currentTask || 1,
        totalScore: enrollment?.totalScore || 0
      };
    });

    res.json(enrichedInternships);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching internships', error: error.message });
  }
});

// Enroll in Internship
app.post('/api/intern/enroll/:internshipId', authenticateToken, async (req, res) => {
  try {
    const { internshipId } = req.params;
    
    const existingEnrollment = await Enrollment.findOne({
      internId: req.user.userId,
      internshipId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this internship' });
    }

    const internship = await Internship.findById(internshipId);
    const tasks = await Task.find({ internshipId }).sort({ taskNumber: 1 });
    
    const enrollment = new Enrollment({
      internId: req.user.userId,
      internshipId,
      maxScore: tasks.reduce((sum, task) => sum + task.points, 0)
    });

    await enrollment.save();

    // Generate QR Code for Payment
    const qrData = `PAYMENT:${enrollment._id}:${internship.fee}:${req.user.userId}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const payment = new Payment({
      internId: req.user.userId,
      internshipId,
      amount: internship.fee,
      qrCodeData: qrCode
    });

    await payment.save();

    res.json({ 
      message: 'Enrolled successfully', 
      enrollment,
      paymentQR: qrCode,
      paymentId: payment._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Error enrolling', error: error.message });
  }
});

// Get Intern's Tasks
app.get('/api/intern/internships/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const enrollment = await Enrollment.findOne({
      internId: req.user.userId,
      internshipId: id
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Not enrolled in this internship' });
    }

    const tasks = await Task.find({ internshipId: id }).sort({ taskNumber: 1 });
    
    const enrichedTasks = tasks.map(task => ({
      ...task.toObject(),
      unlocked: task.taskNumber <= enrollment.currentTask,
      completed: enrollment.completedTasks.some(ct => ct.taskNumber === task.taskNumber)
    }));

    res.json({
      tasks: enrichedTasks,
      enrollment
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Submit Task
app.post('/api/intern/submit-task', authenticateToken, async (req, res) => {
  try {
    const { internshipId, taskId, taskNumber, githubUrl } = req.body;
    
    const enrollment = await Enrollment.findOne({
      internId: req.user.userId,
      internshipId
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Not enrolled in this internship' });
    }

    if (taskNumber > enrollment.currentTask) {
      return res.status(400).json({ message: 'Task not yet unlocked' });
    }

    const existingSubmission = await Submission.findOne({
      internId: req.user.userId,
      internshipId,
      taskNumber
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'Task already submitted' });
    }

    const task = await Task.findById(taskId);
    const taskDeadline = new Date(enrollment.enrolledAt);
    taskDeadline.setHours(taskDeadline.getHours() + (taskNumber * task.timeLimit));
    
    const isLate = new Date() > taskDeadline;

    const submission = new Submission({
      internId: req.user.userId,
      internshipId,
      taskId,
      taskNumber,
      githubUrl,
      isLate
    });

    await submission.save();

    // Unlock next task
    if (taskNumber === enrollment.currentTask) {
      await Enrollment.updateOne(
        { _id: enrollment._id },
        { $inc: { currentTask: 1 } }
      );
    }

    res.json({ message: 'Task submitted successfully', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting task', error: error.message });
  }
});

// Upload Payment Proof
app.post('/api/intern/payment-proof/:paymentId', authenticateToken, upload.single('paymentProof'), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Payment proof image required' });
    }

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        paymentProof: req.file.path,
        transactionId,
        status: 'completed'
      },
      { new: true }
    );

    res.json({ message: 'Payment proof uploaded successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading payment proof', error: error.message });
  }
});

// Get Intern Dashboard Data
app.get('/api/intern/dashboard', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ internId: req.user.userId })
      .populate('internshipId', 'title coverImage duration totalTasks');
    
    const submissions = await Submission.find({ internId: req.user.userId })
      .populate('taskId', 'title points');

    const payments = await Payment.find({ internId: req.user.userId });

    res.json({
      enrollments,
      submissions,
      payments,
      stats: {
        totalEnrollments: enrollments.length,
        completedTasks: submissions.filter(s => s.status === 'approved').length,
        totalScore: enrollments.reduce((sum, e) => sum + e.totalScore, 0),
        certificatesEarned: enrollments.filter(e => e.certificateIssued).length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});