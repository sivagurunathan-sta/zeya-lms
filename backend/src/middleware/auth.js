const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token with correct field name (fallback to dev-secret if JWT_SECRET not set)
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret);

    // Backend auth.js uses generateToken(user) which creates token with user object
    // So decoded will have the full user object, not just id
    const userId = decoded.id || decoded.userId || decoded.user || decoded.sub;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

const authorizeIntern = (req, res, next) => {
  if (req.user.role !== 'INTERN') {
    return res.status(403).json({
      success: false,
      message: 'Intern access required'
    });
  }
  next();
};

module.exports = { authenticateToken, authorizeAdmin, authorizeIntern };
