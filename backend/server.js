// server.js - ENHANCED VERSION WITH ALL FEATURES
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Create uploads directories if they don't exist
const uploadsDirectories = [
  'uploads',
  'uploads/certificates',
  'uploads/user-certificates', 
  'uploads/payment-proofs',
  'uploads/chat-files',
  'uploads/task-files'
];

uploadsDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/intern', require('./routes/intern'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/chat', require('./routes/chat'));

// Enhanced dashboard route with real-time data
app.get('/api/dashboard', require('./middleware/auth').auth, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    if (req.user.role === 'ADMIN') {
      // Admin dashboard
      const [
        totalInterns,
        totalInternships,
        pendingSubmissions,
        pendingPayments,
        certificateValidations,
        chatRooms,
        totalRevenue,
        recentActivity
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'INTERN' } }),
        prisma.internship.count({ where: { isActive: true } }),
        prisma.submission.count({ where: { status: 'PENDING' } }),
        prisma.payment.count({ where: { paymentStatus: 'PENDING' } }),
        prisma.certificateValidation.count({ where: { status: 'PENDING' } }),
        prisma.chatRoom.count({ where: { isActive: true } }),
        prisma.payment.aggregate({
          where: { paymentStatus: 'VERIFIED' },
          _sum: { amount: true }
        }),
        // Recent activity - submissions, payments, etc.
        prisma.submission.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            intern: { select: { name: true, userId: true } },
            task: { select: { title: true, taskNumber: true } }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalInterns,
            totalInternships,
            pendingSubmissions,
            pendingPayments,
            certificateValidations,
            chatRooms,
            totalRevenue: totalRevenue._sum.amount || 0
          },
          recentActivity
        }
      });
    } else {
      // Intern dashboard
      const [enrollments, notifications, privateTasks] = await Promise.all([
        prisma.enrollment.findMany({
          where: { internId: req.user.id },
          include: {
            internship: {
              select: {
                title: true,
                coverImage: true,
                certificatePrice: true
              }
            },
            submissions: {
              include: {
                task: { select: { taskNumber: true, title: true, points: true } }
              }
            }
          }
        }),
        prisma.notification.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.privateTask.findMany({
          where: { assignedTo: req.user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            assignedBy: { select: { name: true } }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          enrollments,
          notifications,
          privateTasks,
          stats: {
            totalEnrollments: enrollments.length,
            completedInternships: enrollments.filter(e => e.isCompleted).length,
            certificates: enrollments.filter(e => e.certificatePurchased).length,
            pendingTasks: privateTasks.filter(t => t.status === 'ASSIGNED').length
          }
        }
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Enhanced LMS Server is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Student LMS API Documentation',
    version: '2.0.0',
    endpoints: {
      authentication: {
        'POST /api/auth/login': 'User login',
        'GET /api/auth/me': 'Get current user info',
        'POST /api/auth/change-password': 'Change password'
      },
      admin: {
        'GET /api/admin/dashboard': 'Admin dashboard analytics',
        'POST /api/admin/users/bulk-add': 'Bulk add users',
        'GET /api/admin/users/:id/profile': 'Get user full profile',
        'PUT /api/admin/users/:id/edit': 'Edit user details',
        'PUT /api/admin/users/:id/revoke': 'Revoke user access',
        'PUT /api/admin/users/:id/enable-chat': 'Enable chat for user',
        'GET /api/admin/submissions/review': 'Get submissions for review',
        'PUT /api/admin/submissions/:id/review': 'Review submission',
        'POST /api/admin/internships/:id/tasks/enhanced': 'Create enhanced task'
      },
      intern: {
        'GET /api/intern/dashboard': 'Intern dashboard',
        'POST /api/intern/enroll/:internshipId': 'Enroll in internship',
        'GET /api/intern/internships/:id/tasks': 'Get internship tasks',
        'POST /api/intern/tasks/:id/submit': 'Submit task',
        'GET /api/intern/progress/:internshipId': 'Get progress tracking'
      },
      payments: {
        'GET /api/payments/payment-section/:enrollmentId': 'Get payment section',
        'POST /api/payments/submit-proof/:paymentId': 'Submit payment proof',
        'GET /api/payments/admin/payments': 'Admin - get all payments',
        'PUT /api/payments/admin/payments/:id/verify': 'Admin - verify payment'
      },
      certificates: {
        'GET /api/certificates/my-certificates': 'Get user certificates',
        'GET /api/certificates/download/:enrollmentId': 'Download certificate',
        'POST /api/certificates/validate-certificate': 'Upload certificate for validation',
        'GET /api/certificates/admin/certificate-sessions': 'Admin - get certificate sessions',
        'POST /api/certificates/admin/upload-certificate/:sessionId': 'Admin - upload certificate'
      },
      chat: {
        'GET /api/chat/check-permission': 'Check chat permission',
        'GET /api/chat/messages/:roomId': 'Get chat messages',
        'POST /api/chat/messages/:roomId': 'Send message',
        'GET /api/chat/admin/rooms': 'Admin - get chat rooms',
        'POST /api/chat/admin/assign-task/:roomId': 'Admin - assign private task',
        'GET /api/chat/private-tasks': 'Get private tasks',
        'POST /api/chat/private-tasks/:id/submit': 'Submit private task'
      }
    },
    features: [
      'Enhanced User Management',
      'Task Assignment & Review System',
      'Payment Verification System', 
      'Certificate Management',
      'Admin-User Chat System',
      'Private Task Assignment',
      'Real-time Notifications',
      'Progress Tracking',
      'Audit Logging',
      'Role-based Access Control'
    ]
  });
});

// Initialize database with default data
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

    // Create sample internship if doesn't exist
    const existingInternship = await prisma.internship.findFirst();
    if (!existingInternship) {
      const internship = await prisma.internship.create({
        data: {
          title: 'Full Stack Web Development Internship',
          description: 'Complete 35-day internship program covering React.js, Node.js, databases, and deployment.',
          coverImage: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800',
          durationDays: 35,
          passPercentage: 75.0,
          certificatePrice: 499,
          isActive: true
        }
      });

      // Create sample tasks
      const sampleTasks = [
        {
          taskNumber: 1,
          title: 'Setup Development Environment',
          description: 'Install Node.js, VS Code, Git, and create your first repository.',
          points: 100,
          waitTimeHours: 12,
          maxAttempts: 3
        },
        {
          taskNumber: 2,
          title: 'HTML & CSS Fundamentals',
          description: 'Create a responsive portfolio website using HTML5 and CSS3.',
          points: 100,
          waitTimeHours: 12,
          maxAttempts: 3
        },
        {
          taskNumber: 3,
          title: 'JavaScript Basics',
          description: 'Learn JavaScript fundamentals including variables, functions, and DOM manipulation.',
          points: 100,
          waitTimeHours: 12,
          maxAttempts: 3
        }
      ];

      for (const taskData of sampleTasks) {
        await prisma.task.create({
          data: {
            ...taskData,
            internshipId: internship.id
          }
        });
      }
      console.log('✅ Sample internship and tasks created');
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        adminCredentials: {
          email: 'admin@lms.com',
          password: 'admin123'
        }
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

// File upload endpoint for testing
app.post('/api/upload-test', require('./middleware/auth').auth, (req, res) => {
  const multer = require('multer');
  
  const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      }
    });
  });
});

// Catch-all for undefined routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/docs',
      'POST /api/init-db',
      'POST /api/auth/login',
      'GET /api/dashboard'
    ]
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Handle specific error types
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large'
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.message
    });
  }

  if (error.code === 'P2002') { // Prisma unique constraint error
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\n🚀 Enhanced Student LMS Server Started Successfully!');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Initialize DB: POST http://localhost:${PORT}/api/init-db`);
  console.log('\n🔑 Default Admin Credentials:');
  console.log('   Email: admin@lms.com');
  console.log('   Password: admin123');
  console.log('\n✨ Enhanced Features Available:');
  console.log('   • Advanced User Management');
  console.log('   • Task Assignment & Review System');
  console.log('   • Payment Verification with QR Codes');
  console.log('   • Certificate Management & Validation');
  console.log('   • Admin-User Chat System');
  console.log('   • Private Task Assignment');
  console.log('   • Real-time Notifications');
  console.log('   • Comprehensive Analytics');
  console.log('\n🛡️  Security Features:');
  console.log('   • Role-based Access Control');
  console.log('   • Rate Limiting');
  console.log('   • Request Compression');
  console.log('   • Security Headers');
  console.log('   • Audit Logging');
  console.log('\n📁 Upload Directories Created:');
  console.log('   • uploads/certificates/');
  console.log('   • uploads/user-certificates/');
  console.log('   • uploads/payment-proofs/');
  console.log('   • uploads/chat-files/');
  console.log('   • uploads/task-files/');
  console.log('\n🎯 Ready to handle all LMS operations!');
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;