const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const router = express.Router();
let prisma;
let usePrisma = !!process.env.DATABASE_URL;
if (usePrisma) {
  try {
    prisma = new PrismaClient();
  } catch (e) {
    console.warn('Prisma init failed, falling back to file storage', e.message);
    usePrisma = false;
  }
}

const dataDir = path.join(__dirname, '../../data');
const usersFile = path.join(dataDir, 'users.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

const readUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf-8') || '[]'); } catch { return []; }
};
const writeUsers = (users) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

const ensureDefaultLocalUsers = async () => {
  const users = readUsers();
  if (!users.find(u => u.userId === 'ADMIN001')) {
    users.push({
      id: 'local-admin-1',
      userId: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@lms.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  if (!users.find(u => u.userId === 'INT2025001')) {
    users.push({
      id: 'local-int-1',
      userId: 'INT2025001',
      name: 'Intern 1',
      email: 'intern1@lms.com',
      passwordHash: await bcrypt.hash('int2025001', 10),
      role: 'INTERN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  writeUsers(users);
};

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'dev-secret',
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

    if (usePrisma) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      // Generate unique userId
      const userCount = await prisma.user.count({ where: { role: 'INTERN' } });
      const userId = `INT${new Date().getFullYear()}${String(userCount + 1).padStart(3, '0')}`;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({ data: { userId, name, email, passwordHash, phone: phone || null, role: 'INTERN' } });

      // Create welcome notification
      await prisma.notification.create({ data: { userId: user.id, title: 'Welcome to Student LMS!', message: 'Your account has been created successfully. Start your learning journey today!', type: 'SUCCESS' } });

      return res.status(201).json({ success: true, message: 'Registration successful! Please login.', userId: user.userId });
    }

    // Fallback: File-based storage
    const users = readUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userId = `INT${new Date().getFullYear()}${String(users.length + 1).padStart(3, '0')}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id: `local-${Date.now()}`,
      userId,
      name,
      email,
      passwordHash,
      role: 'INTERN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(user);
    writeUsers(users);

    res.status(201).json({ success: true, message: 'Registration successful! Please login.', userId: user.userId });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// Login Route
router.post('/login', [
  body('email').trim().notEmpty().withMessage('Email or User ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    await ensureDefaultLocalUsers();

    const { email: identifier, password } = req.body;

    if (usePrisma) {
      // Find user by email OR userId
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { userId: identifier }] },
        select: { id: true, userId: true, name: true, email: true, passwordHash: true, role: true, isActive: true }
      });

      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
      if (!user.isActive) return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact admin.' });

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const token = generateToken(user.id, user.role);

      // Create audit log if possible
      try { await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', details: `User ${user.email} logged in successfully`, ipAddress: req.ip } }); } catch(e){}

      const { passwordHash, ...userWithoutPassword } = user;
      return res.json({ success: true, message: 'Login successful', token, user: userWithoutPassword });
    }

    // Fallback: file-based lookup
    const users = readUsers();
    const user = users.find(u => u.email === identifier || u.userId === identifier);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact admin.' });

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = generateToken(user.id, user.role);

    const { passwordHash, ...userWithoutPassword } = user;
    return res.json({ success: true, message: 'Login successful', token, user: userWithoutPassword });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
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
