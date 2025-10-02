const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register Route
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg 
      });
    }

    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Generate unique userId
    const userCount = await prisma.user.count({ where: { role: 'INTERN' } });
    const userId = `INT${new Date().getFullYear()}${String(userCount + 1).padStart(3, '0')}`;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        userId,
        name,
        email,
        passwordHash,
        phone: phone || null,
        role: 'INTERN'
      }
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to Student LMS!',
        message: 'Your account has been created successfully. Start your learning journey today!',
        type: 'SUCCESS'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please login.',
      userId: user.userId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    });
  }
});

// Login Route
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been deactivated. Please contact admin.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `User ${user.email} logged in successfully`,
        ipAddress: req.ip
      }
    });

    // Return user data (without password)
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// Get Current User (Protected Route)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
});

module.exports = router;