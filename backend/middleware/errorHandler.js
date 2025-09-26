// middleware/errorHandler.js
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime');

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const target = err.meta?.target;
        let field = 'field';
        if (target && Array.isArray(target)) {
          field = target.join(', ');
        }
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
          error: 'DUPLICATE_ENTRY'
        });

      case 'P2025':
        // Record not found
        return res.status(404).json({
          success: false,
          message: 'Record not found',
          error: 'NOT_FOUND'
        });

      case 'P2003':
        // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Related record not found',
          error: 'FOREIGN_KEY_VIOLATION'
        });

      case 'P2014':
        // Required relation missing
        return res.status(400).json({
          success: false,
          message: 'Required relation is missing',
          error: 'REQUIRED_RELATION_MISSING'
        });

      default:
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
          error: 'DATABASE_ERROR'
        });
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    });
  }

  // Handle validation errors (Joi)
  if (err.isJoi) {
    const errorMessage = err.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      message: errorMessage,
      error: 'VALIDATION_ERROR'
    });
  }

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      error: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files',
      error: 'TOO_MANY_FILES'
    });
  }

  // Handle custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.code || 'CUSTOM_ERROR'
    });
  }

  // Handle MongoDB/Mongoose errors (if using MongoDB)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'INVALID_ID'
    });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: errors.join(', '),
      error: 'VALIDATION_ERROR'
    });
  }

  // Handle syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON',
      error: 'INVALID_JSON'
    });
  }

  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS error',
      error: 'CORS_ERROR'
    });
  }

  // Handle rate limiting errors
  if (err.message.includes('Too many requests')) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    error: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;