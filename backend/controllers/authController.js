const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const emailService = require('../utils/email');
const logger = require('../utils/logger');
const jwtUtil = require('../utils/jwt');

// Generate JWT token
const generateToken = (userId) => {
  return jwtUtil.sign({ userId }, { expiresIn: process.env.JWT_EXPIRE || '24h' });
};

// Register user
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const db = getDB();

    // Check if user exists
    const normalizedEmail = email.toLowerCase();
    const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userDoc = {
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      role: 'STUDENT',
      avatar: null,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(userDoc);
    const userId = result.insertedId.toString();

    // Generate JWT
    const token = generateToken(userId);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail({ firstName, email: normalizedEmail });
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
    }

    const user = {
      id: userId,
      email,
      firstName,
      lastName,
      role: 'STUDENT'
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user, token }
    });

  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const db = getDB();

    // Find user
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate JWT
    const token = generateToken(user._id.toString());

    const userData = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userData, token }
    });

  } catch (error) {
    next(error);
  }
};

// Get current user
const getCurrentUser = async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update profile
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const db = getDB();

    const updateData = {
      firstName,
      lastName,
      phone,
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getDB();

    // Get user
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword
};