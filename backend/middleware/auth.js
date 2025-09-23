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

const optionalAuth = async (req, res, next) => {
  req.user = demoUser; // Always attach demo user for consistency
  next();
};

module.exports = { auth, adminAuth, optionalAuth };
