const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.trim();
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required to start the server');
}

const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.trim()) || JWT_SECRET;

function sign(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, options);
}

function verify(token, options = {}) {
  return jwt.verify(token, JWT_SECRET, options);
}

function signRefresh(payload, options = {}) {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, options);
}

function verifyRefresh(token, options = {}) {
  return jwt.verify(token, JWT_REFRESH_SECRET, options);
}

module.exports = {
  sign,
  verify,
  signRefresh,
  verifyRefresh,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};
