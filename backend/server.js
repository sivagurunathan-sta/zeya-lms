// server.js - Main Entry Point
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

// Create all required upload directories
const uploadsDirectories = [
  'uploads',
  'uploads/courses',
  'uploads/tasks',
  'uploads/submissions',
  'uploads/payments',
  'uploads/certificates',
  'uploads/intern-certificates',
  'uploads/profiles',
  'uploads/qr-codes',
  'uploads/chat'
];

uploadsDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// ==========================================
// SECURITY & MIDDLEWARE CONFIGURATION
// ==========================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// API ROUTES - ALL MODULES
// ==========================================

// Authentication
app.use('/api/auth', require('./src/routes/auth'));

// Admin Routes - Modularized
app.use('/api/admin', require('./src/routes/admin-users'));
app.use('/api', require('./src/routes/tasks'));
app.use('/api/admin/payments', require('./src/routes/admin-payment-verification'));
// app.use('/api/admin/certificates', require('./src/routes/admin/certificates'));
app.use('/api/admin', require('./src/routes/admin-chat'));
app.use('/api/admin', require('./src/routes/admin-enhanced'));

// Intern Routes - Modularized
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/intern/payments', require('./src/routes/intern-payment'));
// app.use('/api/intern/payments', require('./src/routes/intern/payments'));
// app.use('/api/intern/certificates', require('./src/routes/intern/certificates'));
// app.use('/api/intern/chat', require('./src/routes/intern/chat'));

// Public Routes
// app.use('/api/public', require('./src/routes/public'));

// ==========================================
// HEALTH CHECK & DOCUMENTATION
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Unified Student LMS Server is running',
    timestamp: new Date().toISOString(),
    version: '4.0.0',
    modules: ['Users', 'Tasks', 'Payments', 'Certificates', 'Chat']
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Student LMS API Documentation v4.0',
    version: '4.0.0',
    modules: {
      authentication: {
        'POST /api/auth/login': 'User login (Google OAuth / userId)',
        'GET /api/auth/me': 'Get current user profile',
        'POST /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'Logout user'
      },
      adminUsers: {
        'GET /api/admin/users': 'Get all users with filters',
        'GET /api/admin/users/:userId': 'Get complete user profile',
        'POST /api/admin/users/bulk-add': 'Bulk add users',
        'PUT /api/admin/users/:userId': 'Update user details',
        'POST /api/admin/users/:userId/revoke': 'Revoke user access',
        'POST /api/admin/users/:userId/restore': 'Restore user access'
      },
      adminTasks: {
        'POST /api/admin/tasks/create-course': 'Create internship with 35 tasks',
        'GET /api/admin/tasks/submissions': 'Get all submissions',
        'GET /api/admin/tasks/submissions/pending': 'Get pending reviews',
        'PUT /api/admin/tasks/submissions/:id/review': 'Approve/Reject submission',
        'GET /api/admin/tasks/courses': 'Get all courses',
        'PUT /api/admin/tasks/courses/:id': 'Update course'
      },
      adminPayments: {
        'GET /api/admin/payments': 'Get all payments',
        'GET /api/admin/payments/pending': 'Get pending verifications',
        'POST /api/admin/payments/:id/verify': 'Verify payment proof',
        'POST /api/admin/payments/:id/reject': 'Reject payment'
      },
      adminCertificates: {
        'GET /api/admin/certificates/requests': 'Get certificate purchase requests',
        'POST /api/admin/certificates/upload': 'Upload certificate to intern',
        'GET /api/admin/certificates/issued': 'Get all issued certificates',
        'POST /api/admin/certificates/:userId/validate': 'Validate cert for paid tasks'
      },
      adminChat: {
        'GET /api/admin/chat/rooms': 'Get all chat rooms',
        'POST /api/admin/chat/create/:userId': 'Create chat room',
        'GET /api/admin/chat/:roomId/messages': 'Get messages',
        'POST /api/admin/chat/:roomId/send': 'Send message',
        'POST /api/admin/chat/:roomId/assign-task': 'Assign private task'
      },
      internProfile: {
        'GET /api/intern/profile/dashboard': 'Intern dashboard',
        'POST /api/intern/profile/enroll/:courseId': 'Enroll in course',
        'GET /api/intern/profile/enrollments': 'Get my enrollments',
        'GET /api/intern/profile/notifications': 'Get notifications'
      },
      internTasks: {
        'GET /api/intern/tasks/:enrollmentId': 'Get my tasks',
        'POST /api/intern/tasks/:taskId/submit': 'Submit task (GitHub/Form/File)',
        'GET /api/intern/tasks/submission/:id': 'Get submission details',
        'GET /api/intern/tasks/progress/:enrollmentId': 'Get progress'
      },
      internPayments: {
        'POST /api/intern/payments/initiate-certificate': 'Start certificate payment',
        'POST /api/intern/payments/:id/upload-proof': 'Upload payment screenshot',
        'GET /api/intern/payments/history': 'Payment history',
        'POST /api/intern/payments/initiate-paid-task': 'Buy paid task'
      },
      internCertificates: {
        'GET /api/intern/certificates/status': 'Check eligibility',
        'GET /api/intern/certificates/download/:enrollmentId': 'Download certificate',
        'POST /api/intern/certificates/submit-validation': 'Submit for validation',
        'GET /api/intern/certificates/validation-status': 'Check validation status'
      },
      internChat: {
        'GET /api/intern/chat/room': 'Get my chat room',
        'GET /api/intern/chat/messages': 'Get messages',
        'POST /api/intern/chat/send': 'Send message',
        'GET /api/intern/chat/private-tasks': 'Get assigned private tasks',
        'POST /api/intern/chat/private-tasks/:id/submit': 'Submit private task'
      }
    }
  });
});

// ==========================================
// DATABASE INITIALIZATION
// ==========================================

app.post('/api/init-db', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();

    // Create admin if doesn't exist
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
      console.log('✅ Admin user created');
    }

    // Create sample intern
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
      console.log('✅ Sample intern created');
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        credentials: [
          { role: 'Admin', userId: 'ADMIN001', password: 'admin123' },
          { role: 'Intern', userId: 'INT2025001', password: 'int2025001' }
        ]
      }
    });

  } catch (error) {
    console.error('DB initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message
    });
  }
});

// ==========================================
// CRON JOBS - AUTO UNLOCK TASKS
// ==========================================

// Run every 10 minutes to unlock tasks after 12 hours
cron.schedule('*/10 * * * *', async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const submissions = await prisma.submission.findMany({
      where: {
        submissionDate: { lt: twelveHoursAgo },
        nextTaskUnlocked: false
      },
      include: {
        task: true,
        enrollment: true
      }
    });

    for (const submission of submissions) {
      await prisma.submission.update({
        where: { id: submission.id },
        data: { nextTaskUnlocked: true }
      });

      await prisma.notification.create({
        data: {
          userId: submission.enrollment.userId,
          title: '🔓 Next Task Unlocked',
          message: `Task ${submission.task.taskNumber + 1} is now available!`,
          type: 'INFO'
        }
      });
    }

    console.log(`✅ Auto-unlocked ${submissions.length} tasks`);
    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Cron job error:', error.message);
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
    hint: 'Check /api/docs for available endpoints'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large (max 100MB)'
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 UNIFIED STUDENT LMS SERVER STARTED SUCCESSFULLY!');
  console.log('='.repeat(80));
  console.log(`\n📡 Server: http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Init DB: POST http://localhost:${PORT}/api/init-db`);
  
  console.log('\n📦 MODULES LOADED:');
  console.log('   ✅ User Management');
  console.log('   ✅ Task & Submission System');
  console.log('   ✅ Payment Processing');
  console.log('   ✅ Certificate Management');
  console.log('   ✅ Chat System');
  
  console.log('\n🔑 Default Credentials:');
  console.log('   Admin: ADMIN001 / admin123');
  console.log('   Intern: INT2025001 / int2025001');
  
  console.log('\n⏰ Cron Jobs:');
  console.log('   🔓 Auto-unlock tasks: Every 10 minutes');
  
  console.log('\n' + '='.repeat(80) + '\n');
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
