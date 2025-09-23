const express = require('express');

const router = express.Router();

const demoUser = {
  id: 'demo_user',
  role: 'STUDENT',
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@example.com'
};

// Demo login - accepts any credentials and returns demo user
router.post('/login', (req, res) => {
  return res.json({
    success: true,
    data: {
      user: demoUser,
      token: 'demo-token'
    }
  });
});

// Demo register - returns demo user
router.post('/register', (req, res) => {
  return res.status(201).json({
    success: true,
    data: {
      user: demoUser,
      token: 'demo-token'
    }
  });
});

// Current user
router.get('/me', (req, res) => {
  return res.json({ success: true, data: demoUser });
});

// Profile update
router.put('/profile', (req, res) => {
  return res.json({ success: true, data: { ...demoUser, ...req.body } });
});

// Change password (noop)
router.put('/password', (req, res) => {
  return res.json({ success: true, message: 'Password updated (demo)' });
});

module.exports = router;
