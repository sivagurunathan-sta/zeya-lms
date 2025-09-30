// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const adminEnhancedRoutes = require('./src/routes/admin-enhanced');
require('dotenv').config();

const app = express();

// Create uploads directories if they don't exist
const uploadsDirectories = [
  'uploads',
  'uploads/courses',
  'uploads/tasks',
  'uploads/submissions',
  'uploads/payments',
  'uploads/certificates',
  'uploads/profiles'
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
  max: 1000,
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
  origin: 'http://localhost:3000', // Your frontend URL
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
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/admin/enhanced', require('./src/routes/admin-enhanced'));
app.use('/api/intern', require('./src/routes/intern'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/certificates', require('./src/routes/certificates'));
app.use('/api/chat', require('./src/routes/chat'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'LMS Server is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Student LMS API Documentation',
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
        'GET /api/admin/submissions/review': 'Get submissions for review'
      },
      intern: {
        'GET /api/intern/dashboard': 'Intern dashboard',
        'POST /api/intern/enroll/:internshipId': 'Enroll in internship',
        'GET /api/intern/internships/:id/tasks': 'Get internship tasks'
      }
    }
  });
});

// Initialize database
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

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        adminCredentials: {
          userId: 'ADMIN001',
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

// Catch-all for undefined routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large'
    });
  }

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

  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\n🚀 LMS Server Started Successfully!');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log('\n🔑 Default Admin Credentials:');
  console.log('   User ID: ADMIN001');
  console.log('   Password: admin123');
  console.log('\n✨ Ready to handle requests!\n');
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