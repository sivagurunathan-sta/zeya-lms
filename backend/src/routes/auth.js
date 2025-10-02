const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Intern = require('../models/Intern');

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    const admin = await Admin.findOne({ userId });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        userId: admin.userId,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Intern Login
router.post('/intern/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    const intern = await Intern.findOne({ userId });
    if (!intern) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!intern.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isPasswordValid = await bcrypt.compare(password, intern.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: intern._id, role: 'intern' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: intern._id,
        name: intern.name,
        userId: intern.userId,
        email: intern.email,
        role: 'intern'
      }
    });
  } catch (error) {
    console.error('Intern login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;