const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: ['Too many requests from this IP. Please try again later.']
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: ['Rate limit exceeded. Please try again later.'],
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per windowMs
  message: {
    success: false,
    message: ['Too many authentication attempts. Please try again after 15 minutes.']
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: ['Authentication rate limit exceeded. Please try again after 15 minutes.'],
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Upload limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 uploads per hour
  message: {
    success: false,
    message: ['Upload limit exceeded. Please try again later.']
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: ['File upload rate limit exceeded. Please try again later.'],
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// API limiter for external API calls
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: ['API rate limit exceeded. Please slow down your requests.']
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Submission limiter for task submissions
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 submissions per hour per IP
  message: {
    success: false,
    message: ['Too many submissions. Please wait before submitting again.']
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? req.user._id.toString() : req.ip;
  }
});

// Speed limiter that progressively slows down requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 100, // add 100ms delay per request after delayAfter
  maxDelayMs: 5000, // maximum delay of 5 seconds
  headers: true
});

// Create a custom limiter for specific routes
const createCustomLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: [message]
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  apiLimiter,
  submissionLimiter,
  speedLimiter,
  createCustomLimiter
};
