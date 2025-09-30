// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      req.user = user;
      next();
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Authorize admin role
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Authorize intern role
const authorizeIntern = (req, res, next) => {
  if (req.user.role !== 'INTERN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Intern privileges required.'
    });
  }
  next();
};

// Check if user owns the resource
const authorizeOwnership = (userIdField = 'internId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (req.user.role === 'ADMIN') {
      // Admins can access any resource
      return next();
    }

    if (req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeAdmin,
  authorizeIntern,
  authorizeOwnership
};