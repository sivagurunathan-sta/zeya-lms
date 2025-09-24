const { ObjectId } = require('mongodb');
const demoUser = {
  id: 'demo_user',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
  role: 'STUDENT',
  isActive: true,
};

const auth = async (req, res, next) => {
  req.user = demoUser;
  next();
};

const adminAuth = (req, res, next) => {
  // Allow all requests in demo mode
  req.user = req.user || demoUser;
  next();
};

const requireAdmin = (req, res, next) => {
  const user = req.user || demoUser;
  if (user && user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

const optionalAuth = async (req, res, next) => {
  req.user = demoUser; // Always attach demo user for consistency
  next();
};

module.exports = { auth, adminAuth, optionalAuth, requireAdmin };
