const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create upload directories
const uploadDirs = [
  'uploads/courses',
  'uploads/materials',
  'uploads/videos',
  'uploads/submissions',
  'uploads/payments'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-lms';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-12345';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Models
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const internSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  profilePicture: { type: String, default: '' },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  totalScore: { type: Number, default: 0 },
  hasCertificate: { type: Boolean, default: false },
  certificatePurchased: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  image: { type: String, default: '' },
  duration: { type: Number, required: true, default: 35 },
  price: { type: Number, required: true, default: 499 },
  isActive: { type: Boolean, default: true },
  totalTasks: { type: Number, default: 0 },
  enrolledInterns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Intern' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  taskNumber: { type: Number, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  materials: [{ type: String }],
  videos: [{ type: String }],
  submissionType: { type: String, enum: ['GITHUB', 'FILE', 'FORM'], default: 'GITHUB' },
  formUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
taskSchema.index({ course: 1, taskNumber: 1 }, { unique: true });

const submissionSchema = new mongoose.Schema({
  intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  githubLink: { type: String, default: '' },
  formUrl: { type: String, default: '' },
  files: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  feedback: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  nextTaskUnlockTime: { type: Date }
});
submissionSchema.index({ intern: 1, task: 1, submittedAt: -1 });

const paymentSchema = new mongoose.Schema({
  intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true, trim: true },
  screenshot: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  paymentMethod: { type: String, default: 'UPI' },
  submittedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

const certificateSchema = new mongoose.Schema({
  intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateId: { type: String, unique: true, required: true },
  finalScore: { type: Number, required: true },
  completionDate: { type: Date, default: Date.now },
  issuedAt: { type: Date, default: Date.now },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

const Admin = mongoose.model('Admin', adminSchema);
const Intern = mongoose.model('Intern', internSchema);
const Course = mongoose.model('Course', courseSchema);
const Task = mongoose.model('Task', taskSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);

// Auth Middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No authentication token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const admin = await Admin.findById(decoded.userId);
    if (!admin || !admin.isActive) return res.status(401).json({ message: 'Admin not found' });
    req.admin = admin;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const internAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No authentication token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'intern') return res.status(403).json({ message: 'Intern only' });
    const intern = await Intern.findById(decoded.userId);
    if (!intern || !intern.isActive) return res.status(401).json({ message: 'Intern not found' });
    req.intern = intern;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') cb(null, 'uploads/courses/');
    else if (file.fieldname === 'materials') cb(null, 'uploads/materials/');
    else if (file.fieldname === 'videos') cb(null, 'uploads/videos/');
    else if (file.fieldname === 'files') cb(null, 'uploads/submissions/');
    else if (file.fieldname === 'screenshot') cb(null, 'uploads/payments/');
    else cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

// AUTH ROUTES
// Unified login endpoint: tries admin then intern; falls back to local data file
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, email, userIdOrEmail, password } = req.body;
    const identifier = (userId || userIdOrEmail || email || '').toString().trim();
    if (!identifier || !password) return res.status(400).json({ message: 'userId/email and password are required' });

    // Try admin first (Mongo), but don't fail if DB is down
    let account = null;
    try {
      account = await Admin.findOne({ $or: [{ userId: identifier }, { email: identifier.toLowerCase() }] });
    } catch (e) {
      account = null;
    }
    if (account) {
      if (!account.isActive) return res.status(403).json({ message: 'Account inactive' });
      const ok = await bcrypt.compare(password, account.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ userId: account._id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: account._id, name: account.name, userId: account.userId, email: account.email, role: 'admin' } });
    }

    // Then try intern (Mongo), but don't fail if DB is down
    try {
      account = await Intern.findOne({ $or: [{ userId: identifier }, { email: identifier.toLowerCase() }] });
    } catch (e) {
      account = null;
    }
    if (account) {
      if (!account.isActive) return res.status(403).json({ message: 'Account inactive' });
      const ok = await bcrypt.compare(password, account.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ userId: account._id, role: 'intern' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: account._id, name: account.name, userId: account.userId, email: account.email, role: 'intern' } });
    }

    // Fallback: check local users file for demo logins
    try {
      const usersPath = path.join(__dirname, 'data', 'users.json');
      const raw = fs.readFileSync(usersPath, 'utf-8');
      const localUsers = JSON.parse(raw);
      const idLower = identifier.toLowerCase();
      const local = localUsers.find(u => (u.userId === identifier || (u.email || '').toLowerCase() === idLower) && u.isActive !== false);
      if (local) {
        const ok = await bcrypt.compare(password, local.passwordHash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
        const roleLower = (local.role || '').toLowerCase();
        const role = roleLower === 'admin' ? 'admin' : (roleLower === 'intern' ? 'intern' : roleLower || 'intern');
        const token = jwt.sign({ userId: local.id, role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: { id: local.id, name: local.name, userId: local.userId, email: local.email, role } });
      }
    } catch (e) {
      // ignore file fallback errors
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Existing role-specific endpoints
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const admin = await Admin.findOne({ userId });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    if (!admin.isActive) return res.status(403).json({ message: 'Account inactive' });
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: admin._id, name: admin.name, userId: admin.userId, email: admin.email, role: 'admin' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/intern/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const intern = await Intern.findOne({ userId });
    if (!intern) return res.status(401).json({ message: 'Invalid credentials' });
    if (!intern.isActive) return res.status(403).json({ message: 'Account inactive' });
    const isValid = await bcrypt.compare(password, intern.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: intern._id, role: 'intern' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: intern._id, name: intern.name, userId: intern.userId, email: intern.email, role: 'intern' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES
app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const totalInterns = await Intern.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const pendingSubmissions = await Submission.countDocuments({ status: 'pending' });
    const certificatesIssued = await Intern.countDocuments({ hasCertificate: true });
    const recentSubmissions = await Submission.find().populate('intern', 'name').populate('task', 'title').sort({ submittedAt: -1 }).limit(10);
    const recentActivity = recentSubmissions.map(sub => ({ timestamp: sub.submittedAt, description: `${sub.intern.name} submitted ${sub.task.title}` }));
    res.json({ stats: { totalInterns, activeCourses, pendingSubmissions, certificatesIssued }, recentActivity });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/interns/all', adminAuth, async (req, res) => {
  try {
    const interns = await Intern.find().select('-password').populate('enrolledCourses', 'name').sort({ createdAt: -1 });
    res.json({ interns });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/interns/create', adminAuth, async (req, res) => {
  try {
    const { name, userId, password, email } = req.body;
    const existing = await Intern.findOne({ $or: [{ userId }, { email }] });
    if (existing) return res.status(400).json({ message: 'User ID or email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const intern = new Intern({ name, userId, password: hashedPassword, email, isActive: true });
    await intern.save();
    res.status(201).json({ message: 'Intern created', intern: { _id: intern._id, name: intern.name, userId: intern.userId, email: intern.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/interns/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const intern = await Intern.findById(req.params.id);
    if (!intern) return res.status(404).json({ message: 'Intern not found' });
    intern.name = name || intern.name;
    intern.email = email || intern.email;
    if (password && password.trim() !== '') intern.password = await bcrypt.hash(password, 10);
    await intern.save();
    res.json({ message: 'Intern updated', intern: { _id: intern._id, name: intern.name, userId: intern.userId, email: intern.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/admin/interns/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const intern = await Intern.findById(req.params.id);
    if (!intern) return res.status(404).json({ message: 'Intern not found' });
    intern.isActive = isActive;
    await intern.save();
    res.json({ message: `Intern ${isActive ? 'activated' : 'deactivated'}`, intern: { _id: intern._id, name: intern.name, isActive: intern.isActive } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/interns/:id', adminAuth, async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) return res.status(404).json({ message: 'Intern not found' });
    await Submission.deleteMany({ intern: req.params.id });
    await Course.updateMany({ enrolledInterns: req.params.id }, { $pull: { enrolledInterns: req.params.id } });
    await Intern.findByIdAndDelete(req.params.id);
    res.json({ message: 'Intern deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/courses', adminAuth, async (req, res) => {
  try {
    const courses = await Course.find().populate('enrolledInterns', 'name email').sort({ createdAt: -1 });
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/courses', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, duration, price } = req.body;
    const course = new Course({
      name, description, duration: duration || 35, price: price || 499,
      image: req.file ? `/uploads/courses/${req.file.filename}` : '',
      createdBy: req.admin._id, isActive: true
    });
    await course.save();
    res.status(201).json({ message: 'Course created', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/courses/:id', adminAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('enrolledInterns', 'name email');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const tasks = await Task.find({ course: req.params.id }).sort({ taskNumber: 1 });
    res.json({ course, tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/admin/courses/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    course.isActive = isActive;
    await course.save();
    res.json({ message: `Course ${isActive ? 'activated' : 'deactivated'}`, course });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/courses/:id', adminAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await Task.deleteMany({ course: req.params.id });
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/tasks', adminAuth, upload.fields([{ name: 'materials', maxCount: 10 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const { courseId, taskNumber, title, description, submissionType, formUrl } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const materials = req.files['materials'] ? req.files['materials'].map(f => `/uploads/materials/${f.filename}`) : [];
    const videos = req.files['videos'] ? req.files['videos'].map(f => `/uploads/videos/${f.filename}`) : [];
    const task = new Task({ course: courseId, taskNumber: parseInt(taskNumber), title, description, materials, videos, submissionType: submissionType || 'GITHUB', formUrl: formUrl || '' });
    await task.save();
    course.totalTasks = await Task.countDocuments({ course: courseId });
    await course.save();
    res.status(201).json({ message: 'Task created', task });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/tasks/course/:courseId', adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ course: req.params.courseId }).sort({ taskNumber: 1 });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/tasks/:id', adminAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const courseId = task.course;
    await Task.findByIdAndDelete(req.params.id);
    const course = await Course.findById(courseId);
    if (course) {
      course.totalTasks = await Task.countDocuments({ course: courseId });
      await course.save();
    }
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/submissions', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    const submissions = await Submission.find(query).populate('intern', 'name email userId').populate('task', 'title taskNumber').populate('course', 'name').sort({ submittedAt: -1 });
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/submissions/:id/review', adminAuth, async (req, res) => {
  try {
    const { status, feedback, unlockNextTask } = req.body;
    const submission = await Submission.findById(req.params.id).populate('task').populate('course').populate('intern');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status !== 'pending') return res.status(400).json({ message: 'Already reviewed' });
    submission.status = status;
    submission.feedback = feedback || '';
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.admin._id;
    if (status === 'approved' && unlockNextTask) {
      const unlockTime = new Date();
      unlockTime.setHours(unlockTime.getHours() + 12);
      submission.nextTaskUnlockTime = unlockTime;
      const intern = await Intern.findById(submission.intern._id);
      if (!intern.completedTasks.includes(submission.task._id)) {
        intern.completedTasks.push(submission.task._id);
        await intern.save();
      }
      const totalTasks = await Task.countDocuments({ course: submission.course._id });
      const completedTasks = intern.completedTasks.length;
      const progress = Math.round((completedTasks / totalTasks) * 100);
      intern.totalScore = progress;
      await intern.save();
    }
    await submission.save();
    res.json({ message: status === 'approved' ? 'Task OPENED! Next task unlocks in 12 hours' : 'Task CLOSED', submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/interns', adminAuth, async (req, res) => {
  try {
    const interns = await Intern.find().select('-password').populate('enrolledCourses').sort({ createdAt: -1 });
    res.json({ interns });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/payments', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    const payments = await Payment.find(query).populate('intern', 'name email userId').populate('course', 'name price').sort({ submittedAt: -1 });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/payments/:id/verify', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id).populate('intern').populate('course');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
    payment.status = status;
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.admin._id;
    await payment.save();
    if (status === 'verified') {
      const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const certificate = new Certificate({ intern: payment.intern._id, course: payment.course._id, certificateId, finalScore: payment.intern.totalScore || 0, issuedBy: req.admin._id });
      await certificate.save();
      const intern = await Intern.findById(payment.intern._id);
      intern.hasCertificate = true;
      intern.certificatePurchased = true;
      await intern.save();
      res.json({ message: 'Payment verified and certificate issued', payment, certificate });
    } else {
      res.json({ message: 'Payment rejected', payment });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// INTERN ROUTES
app.get('/api/intern/profile', internAuth, async (req, res) => {
  try {
    const intern = await Intern.findById(req.intern._id).select('-password').populate('enrolledCourses', 'name');
    res.json({ user: intern });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/intern/courses', internAuth, async (req, res) => {
  try {
    const intern = await Intern.findById(req.intern._id);
    const enrolledCourses = await Course.find({ _id: { $in: intern.enrolledCourses }, isActive: true });
    const enrolledWithProgress = await Promise.all(enrolledCourses.map(async (course) => {
      const totalTasks = await Task.countDocuments({ course: course._id });
      const completedTasks = await Submission.countDocuments({ intern: intern._id, course: course._id, status: 'approved' });
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return { ...course.toObject(), progress, completedTasks, totalTasks };
    }));
    const availableCourses = await Course.find({ _id: { $nin: intern.enrolledCourses }, isActive: true });
    res.json({ enrolledCourses: enrolledWithProgress, availableCourses });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/intern/courses/:id/enroll', internAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (!course.isActive) return res.status(400).json({ message: 'Course not active' });
    const intern = await Intern.findById(req.intern._id);
    if (intern.enrolledCourses.includes(req.params.id)) return res.status(400).json({ message: 'Already enrolled' });
    intern.enrolledCourses.push(req.params.id);
    await intern.save();
    course.enrolledInterns.push(intern._id);
    await course.save();
    res.json({ message: 'Successfully enrolled', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/intern/courses/:id', internAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const intern = await Intern.findById(req.intern._id);
    if (!intern.enrolledCourses.includes(req.params.id)) return res.status(403).json({ message: 'Not enrolled' });
    const totalTasks = await Task.countDocuments({ course: course._id });
    const completedTasks = await Submission.countDocuments({ intern: intern._id, course: course._id, status: 'approved' });
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    res.json({ course: { ...course.toObject(), progress, completedTasks, totalTasks } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/intern/courses/:id/tasks', internAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const intern = await Intern.findById(req.intern._id);
    if (!intern.enrolledCourses.includes(req.params.id)) return res.status(403).json({ message: 'Not enrolled' });
    const allTasks = await Task.find({ course: req.params.id }).sort({ taskNumber: 1 });
    const submissions = await Submission.find({ intern: intern._id, course: req.params.id });
    const tasksWithStatus = await Promise.all(allTasks.map(async (task, index) => {
      const latestSubmission = submissions.filter(s => s.task.toString() === task._id.toString()).sort((a, b) => b.submittedAt - a.submittedAt)[0];
      let isUnlocked = false;
      let isCompleted = false;
      let submissionStatus = null;
      let feedback = null;
      if (index === 0) {
        isUnlocked = true;
      } else {
        const previousTask = allTasks[index - 1];
        const previousSubmission = await Submission.findOne({ intern: intern._id, task: previousTask._id, status: 'approved' });
        if (previousSubmission) {
          const unlockTime = previousSubmission.nextTaskUnlockTime;
          const now = new Date();
          if (unlockTime && now >= unlockTime) {
            isUnlocked = true;
          }
        }
      }
      if (latestSubmission && latestSubmission.status === 'approved') {
        isCompleted = true;
      }
      if (latestSubmission) {
        submissionStatus = latestSubmission.status;
        feedback = latestSubmission.feedback;
      }
      return { ...task.toObject(), isUnlocked, isCompleted, submissionStatus, feedback };
    }));
    res.json({ tasks: tasksWithStatus });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/intern/submissions', internAuth, upload.array('files', 5), async (req, res) => {
  try {
    const { taskId, courseId, githubLink, formUrl } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const intern = await Intern.findById(req.intern._id);
    if (!intern.enrolledCourses.includes(courseId)) return res.status(403).json({ message: 'Not enrolled' });
    const existingPending = await Submission.findOne({ intern: req.intern._id, task: taskId, status: 'pending' });
    if (existingPending) return res.status(400).json({ message: 'Already have pending submission' });
    const files = req.files ? req.files.map(f => `/uploads/submissions/${f.filename}`) : [];
    const submission = new Submission({ intern: req.intern._id, course: courseId, task: taskId, githubLink: githubLink || '', formUrl: formUrl || '', files, status: 'pending', submittedAt: new Date() });
    await submission.save();
    res.status(201).json({ message: 'Task submitted successfully', submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/payments/eligibility/:courseId', internAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const intern = await Intern.findById(req.intern._id);
    if (!intern.enrolledCourses.includes(courseId)) return res.status(403).json({ message: 'Not enrolled' });
    const totalTasks = await Task.countDocuments({ course: courseId });
    const completedTasks = await Submission.countDocuments({ intern: intern._id, course: courseId, status: 'approved' });
    if (completedTasks < totalTasks) return res.json({ eligible: false, message: `Complete all ${totalTasks} tasks`, completedTasks, totalTasks });
    const finalScore = intern.totalScore || 0;
    if (finalScore < 75) return res.json({ eligible: false, message: 'Need at least 75% score', finalScore });
    const existingPayment = await Payment.findOne({ intern: intern._id, course: courseId, status: 'verified' });
    if (existingPayment) return res.json({ eligible: false, message: 'Certificate already purchased', alreadyPurchased: true });
    const course = await Course.findById(courseId);
    res.json({ eligible: true, finalScore, amount: course.price, completedTasks, totalTasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/payments/submit', internAuth, upload.single('screenshot'), async (req, res) => {
  try {
    const { courseId, transactionId, amount } = req.body;
    const intern = await Intern.findById(req.intern._id);
    if (!intern.enrolledCourses.includes(courseId)) return res.status(403).json({ message: 'Not enrolled' });
    const existingPayment = await Payment.findOne({ intern: intern._id, course: courseId, status: { $in: ['pending', 'verified'] } });
    if (existingPayment) return res.status(400).json({ message: 'Payment already submitted' });
    const screenshot = req.file ? `/uploads/payments/${req.file.filename}` : '';
    const payment = new Payment({ intern: intern._id, course: courseId, amount: parseFloat(amount), transactionId, screenshot, status: 'pending' });
    await payment.save();
    res.status(201).json({ message: 'Payment submitted successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/payments/my/:courseId', internAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ intern: req.intern._id, course: req.params.courseId }).populate('course', 'name price');
    res.json({ payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/certificates/my', internAuth, async (req, res) => {
  try {
    const certificates = await Certificate.find({ intern: req.intern._id }).populate('course', 'name description').sort({ issuedAt: -1 });
    res.json({ certificates });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/certificates', adminAuth, async (req, res) => {
  try {
    const certificates = await Certificate.find().populate('intern', 'name email userId').populate('course', 'name').populate('issuedBy', 'name').sort({ issuedAt: -1 });
    res.json({ certificates });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/certificates/verify/:certificateId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId }).populate('intern', 'name email').populate('course', 'name');
    if (!certificate) return res.status(404).json({ valid: false, message: 'Certificate not found' });
    res.json({ valid: true, certificate: { certificateId: certificate.certificateId, internName: certificate.intern.name, courseName: certificate.course.name, finalScore: certificate.finalScore, completionDate: certificate.completionDate, issuedAt: certificate.issuedAt } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Student LMS API running', timestamp: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

module.exports = app;
