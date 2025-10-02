const jwt = require('jsonwebtoken');

const JWTUtil = {
  generateToken: (user) => {
    const payload = {
      id: user.id,
      userId: user.userId,
      role: user.role
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '24h'
    });
  },

  verifyToken: (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
};

module.exports = JWTUtil;