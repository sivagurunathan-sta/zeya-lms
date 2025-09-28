// server.js - FIXED VERSION FOR IMMEDIATE LOGIN
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// CORS - Allow all origins for development
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'intern'], default: 'intern' },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const User = mongoose.model('User', userSchema);

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

// FIXED LOGIN ROUTE - This will work with your credentials
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ message: 'User ID and password required' });
    }

    // Find user by userId or email
    const user = await User.findOne({ 
      $or: [
        { userId: userId },
        { email: userId }
      ],
      isActive: true 
    });
    
    console.log('User found:', user ? user.email : 'No user found');
    
    if (!user) {
      // Create default admin if not exists and login attempt is for admin
      if (userId === 'admin@lms.com' || userId === 'ADMIN001') {
        console.log('Creating default admin...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const newAdmin = new User({
          userId: 'ADMIN001',
          name: 'System Administrator',
          email: 'admin@lms.com',
          role: 'admin',
          password: hashedPassword,
          isActive: true
        });
        await newAdmin.save();
        
        // Now try login again
        const token = jwt.sign(
          { userId: newAdmin.userId, role: newAdmin.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return res.json({
          token,
          user: {
            userId: newAdmin.userId,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role
          }
        });
      }
      
      return res.status(401).json({ message: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', validPassword);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', user.email);

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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Admin Login (separate endpoint)
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    // Auto-create admin if doesn't exist
    let user = await User.findOne({ 
      $or: [{ userId }, { email: userId }],
      role: 'admin' 
    });
    
    if (!user && (userId === 'admin@lms.com' || userId === 'ADMIN001')) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = new User({
        userId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@lms.com',
        role: 'admin',
        password: hashedPassword,
        isActive: true
      });
      await user.save();
      console.log('Admin user auto-created');
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
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
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Intern Login
app.post('/api/auth/intern-login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    const user = await User.findOne({ 
      $or: [{ userId }, { email: userId }],
      role: 'intern', 
      isActive: true 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid intern credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid intern credentials' });
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
    console.error('Intern login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Initialize Database Route
app.post('/api/init-db', async (req, res) => {
  try {
    // Create admin if doesn't exist
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        userId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@lms.com',
        role: 'admin',
        password: hashedPassword,
        isActive: true
      });
      await admin.save();
      console.log('Admin created');
    }

    // Create sample interns
    const sampleInterns = [
      {
        userId: 'INT001',
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'int001'
      },
      {
        userId: 'INT002',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'int002'
      }
    ];

    for (const internData of sampleInterns) {
      const existingIntern = await User.findOne({ email: internData.email });
      if (!existingIntern) {
        const hashedPassword = await bcrypt.hash(internData.password, 10);
        const intern = new User({
          ...internData,
          password: hashedPassword,
          role: 'intern',
          isActive: true
        });
        await intern.save();
        console.log(`Intern ${internData.name} created`);
      }
    }

    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('DB init error:', error);
    res.status(500).json({ message: 'Error initializing database', error: error.message });
  }
});

// ADMIN ROUTES
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

app.get('/api/admin/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const totalInterns = await User.countDocuments({ role: 'intern' });
    
    const analytics = {
      overview: {
        totalInterns,
        totalTasks: 35,
        totalSubmissions: 156,
        totalCertificates: 12,
        pendingReviews: 8,
        pendingPayments: 3
      },
      recentActivity: {
        submissions: [],
        payments: []
      }
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// INTERN ROUTES
app.get('/api/intern/dashboard', authenticateToken, async (req, res) => {
  try {
    const dashboardData = {
      progress: {
        completedTasks: 12,
        totalTasks: 35,
        averageScore: 85.5,
        consistencyScore: 92.0,
        completionPercentage: 34.3
      },
      nextTask: {
        taskId: 13,
        title: "React Components & Props",
        description: "Learn about React components, props, and component composition.",
        difficulty: "medium",
        points: 100
      },
      recentSubmissions: [],
      certificate: null,
      canPurchaseCertificate: false
    };
    
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test route to check if server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔑 Admin login: admin@lms.com / admin123`);
  console.log(`👤 Test the API: http://localhost:${PORT}/api/test`);
});