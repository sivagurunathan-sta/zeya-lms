const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Validation middleware helper
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('phone').optional().isMobilePhone()
  ],
  validateRequest,
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validateRequest,
  authController.login
);

// Get current user (protected route)
router.get('/me', auth, authController.getCurrentUser);

// Update profile (protected route)
router.put(
  '/profile',
  [
    auth,
    body('firstName').optional().notEmpty().trim(),
    body('lastName').optional().notEmpty().trim(),
    body('phone').optional().isMobilePhone()
  ],
  validateRequest,
  authController.updateProfile
);

// Change password (protected route)
router.put(
  '/password',
  [
    auth,
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  validateRequest,
  authController.changePassword
);

module.exports = router;