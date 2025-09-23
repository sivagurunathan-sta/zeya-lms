const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const jwtUtil = require('../utils/jwt');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    try {
      const decoded = jwtUtil.verify(token);
      const db = getDB();

      const user = await db.collection('users').findOne(
        { _id: new ObjectId(decoded.userId) },
        {
          projection: {
            email: 1,
            firstName: 1,
            lastName: 1,
            role: 1,
            isActive: 1
          }
        }
      );

      if (!user || user.isActive === false) {
        return res.status(401).json({
          success: false,
          message: 'Token is not valid'
        });
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      };
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwtUtil.verify(token);
    const db = getDB();

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      {
        projection: {
          email: 1,
          firstName: 1,
          lastName: 1,
          role: 1,
          isActive: 1
        }
      }
    );

    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

module.exports = { auth, adminAuth, optionalAuth };