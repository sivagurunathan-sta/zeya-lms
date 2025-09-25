const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

// Generate access token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRE });
};

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

// Generate tokens for user
const generateAuthTokens = (user) => {
  const payload = {
    id: user._id,
    userId: user.userId,
    email: user.profile.email,
    role: user.role
  };
  
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken({ id: user._id });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRE
  };
};

// Decode token without verification (useful for expired tokens)
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRE,
  generateToken,
  generateRefreshToken,
  verifyToken,
  generateAuthTokens,
  decodeToken
};