// backend/server.js - UPDATED VERSION
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Create upload directories
const uploadsDirectories = [
  'uploads',
  'uploads/courses',
  'uploads/tasks',
  'uploads/submissions',
  'uploads/payments',
  'uploads/certificates',
  'uploads/profiles',
  'uploads/qr-codes',
  'uploads/chat',
  'uploads/payment-proofs',
  'uploads/task-submissions'
];

uploadsDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Security & Middleware
app.set('trust proxy', true); // Allow reading X-Forwarded-For when behind proxies
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests' }
}));
app.use(compression());
app.use(morgan('combined'));
const frontendUrl = process.env.FRONTEND_URL;
const corsOptions = {
  origin: frontendUrl || (process.env.NODE_ENV === 'production' ? 'http://localhost:3000' : '*'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// API ROUTES - ALL CONNECTED
// ==========================================

// Authentication
app.use('/api/auth', require('./src/routes/auth'));

// Admin Routes
app.use('/api/admin', require('./src/routes/admin-users'));
app.use('/api/admin', require('./src/routes/admin-chat'));
app.use('/api/admin', require('./src/routes/admin-enhanced'));
app.use('/api/admin/payments', require('./src/routes/admin-payment-verification'));

// Task & Submission Routes
app.use('/api', require('./src/routes/tasks'));

// Payment Routes
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/intern/payments', require('./src/routes/intern-payment'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Student LMS Server Running',
    timestamp: new Date().toISOString(),
    version: '4.0.0'
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Student LMS API v4.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login',
        'GET /api/auth/me': 'Get profile',
        'POST /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'Logout'
      },
      admin: {
        'GET /api/admin/users': 'Get all users',
        'GET /api/admin/users/:userId': 'Get user profile',
        'POST /api/admin/users/bulk-add': 'Bulk add users',
        'PUT /api/admin/users/:userId': 'Update user',
        'POST /api/admin/users/:userId/revoke': 'Revoke access',
        'POST /api/admin/users/:userId/restore': 'Restore access',
        'GET /api/admin/dashboard/stats': 'Dashboard stats'
      }
    }
  });
});

// Database Initialization
app.post('/api/init-db', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();

    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          userId: 'ADMIN001',
          name: 'System Administrator',
          email: 'admin@lms.com',
          role: 'ADMIN',
          passwordHash: hashedPassword,
          isActive: true
        }
      });
    }

    const existingIntern = await prisma.user.findFirst({
      where: { userId: 'INT2025001' }
    });

    if (!existingIntern) {
      const hashedPassword = await bcrypt.hash('int2025001', 10);
      await prisma.user.create({
        data: {
          userId: 'INT2025001',
          name: 'Sample Intern',
          email: 'intern@lms.com',
          role: 'INTERN',
          passwordHash: hashedPassword,
          isActive: true
        }
      });
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'Database initialized',
      credentials: [
        { role: 'Admin', userId: 'ADMIN001', password: 'admin123' },
        { role: 'Intern', userId: 'INT2025001', password: 'int2025001' }
      ]
    });

  } catch (error) {
    console.error('DB init error:', error);
    res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message
    });
  }
});

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`
  });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 STUDENT LMS SERVER RUNNING');
  console.log('='.repeat(80));
  console.log(`\n📡 Server: http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log('\n🔑 Default Login:');
  console.log('   Admin: ADMIN001 / admin123');
  console.log('   Intern: INT2025001 / int2025001\n');
  console.log('='.repeat(80) + '\n');
});

module.exports = app;
