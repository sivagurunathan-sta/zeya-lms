// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is inactive.' 
      });
    }

    req.user = {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Token validation failed.' 
    });
  }
};

const adminOnly = async (req, res, next) => {
  await auth(req, res, () => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    next();
  });
};

const internOnly = async (req, res, next) => {
  await auth(req, res, () => {
    if (req.user.role !== 'INTERN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Intern privileges required.' 
      });
    }
    next();
  });
};

const authMiddleware = auth;

module.exports = {
  auth,
  authMiddleware,
  adminOnly,
  internOnly
};