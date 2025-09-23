const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    return authController.register(req, res, next);
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    return authController.login(req, res, next);
  }
);

// Get current user
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;
