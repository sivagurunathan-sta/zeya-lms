const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging (but don't log in production)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error Stack:', err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    let message = `Duplicate field value: ${field}. Please use another value`;
    
    // More specific messages for common duplicates
    if (field === 'userId') {
      message = 'This user ID is already taken. Please choose another.';
    } else if (field === 'profile.email') {
      message = 'This email is already registered. Please use another email.';
    } else if (field === 'taskNumber') {
      message = 'A task with this number already exists.';
    }
    
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message: message.join(', '), statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid authentication token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Authentication token expired';
    error = { message, statusCode: 401 };
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxSize = Math.round((parseInt(process.env.MAX_FILE_SIZE) || 50000000) / 1000000);
    const message = `File too large. Maximum size allowed: ${maxSize}MB`;
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded at once. Maximum 10 files allowed.';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field. Please check your form data.';
    error = { message, statusCode: 400 };
  }

  // Rate limiting error
  if (err.status === 429) {
    const message = 'Too many requests. Please try again later.';
    error = { message, statusCode: 429 };
  }

  // Google OAuth errors
  if (err.message && err.message.includes('Google')) {
    const message = 'Google authentication failed. Please try again.';
    error = { message, statusCode: 400 };
  }

  // Payment errors
  if (err.message && err.message.includes('Payment')) {
    error = { message: err.message, statusCode: 400 };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: Array.isArray(message) ? message : [message],
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
};

// 404 handler for non-existent routes
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: [`Route ${req.originalUrl} not found`]
  });
};

module.exports = {
  errorHandler,
  notFound
};
