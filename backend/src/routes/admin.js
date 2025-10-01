const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { adminAuth } = require('../middleware/auth');
const Intern = require('../models/Intern');
const Course = require('../models/Course');
const Task = require('../models/Task');
const Submission = require('../models/Submission');

// Get all interns (existing endpoint)
router.get('/interns/all', adminAuth, async (req, res) => {
  try {
    const interns = await Intern.find()
      .select('-password')
      .populate('enrolledCourses', 'name')
      .sort({ createdAt: -1 });

    res.json({ interns });
  } catch (error) {
    console.error('Error fetching interns:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new intern account
router.post('/interns/create', adminAuth, async (req, res) => {
  try {
    const { name, userId, password, email } = req.body;

    // Check if userId already exists
    const existingIntern = await Intern.findOne({ userId });
    if (existingIntern) {
      return res.status(400).json({ message: 'User ID already exists' });
    }

    // Check if email already exists
    const existingEmail = await Intern.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new intern
    const intern = new Intern({
      name,
      userId,
      password: hashedPassword,
      email,
      isActive: true
    });

    await intern.save();

    res.status(201).json({
      message: 'Intern account created successfully',
      intern: {
        _id: intern._id,
        name: intern.name,
        userId: intern.userId,
        email: intern.email
      }
    });
  } catch (error) {
    console.error('Error creating intern:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update intern account
router.put('/interns/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const intern = await Intern.findById(req.params.id);

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Update fields
    intern.name = name || intern.name;
    intern.email = email || intern.email;

    // Update password if provided
    if (password && password.trim() !== '') {
      intern.password = await bcrypt.hash(password, 10);
    }

    await intern.save();

    res.json({
      message: 'Intern updated successfully',
      intern: {
        _id: intern._id,
        name: intern.name,
        userId: intern.userId,
        email: intern.email
      }
    });
  } catch (error) {
    console.error('Error updating intern:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle intern status (active/inactive)
router.patch('/interns/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const intern = await Intern.findById(req.params.id);

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    intern.isActive = isActive;
    await intern.save();

    res.json({
      message: `Intern ${isActive ? 'activated' : 'deactivated'} successfully`,
      intern: {
        _id: intern._id,
        name: intern.name,
        isActive: intern.isActive
      }
    });
  } catch (error) {
    console.error('Error updating intern status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete intern account
router.delete('/interns/:id', adminAuth, async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Delete all submissions by this intern
    await Submission.deleteMany({ intern: req.params.id });

    // Remove intern from enrolled courses
    await Course.updateMany(
      { enrolledInterns: req.params.id },
      { $pull: { enrolledInterns: req.params.id } }
    );

    // Delete intern
    await Intern.findByIdAndDelete(req.params.id);

    res.json({ message: 'Intern deleted successfully' });
  } catch (error) {
    console.error('Error deleting intern:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalInterns = await Intern.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const pendingSubmissions = await Submission.countDocuments({ status: 'pending' });
    const certificatesIssued = await Intern.countDocuments({ hasCertificate: true });

    // Get recent activity (last 10 submissions)
    const recentSubmissions = await Submission.find()
      .populate('intern', 'name')
      .populate('task', 'title')
      .sort({ submittedAt: -1 })
      .limit(10);

    const recentActivity = recentSubmissions.map(sub => ({
      timestamp: sub.submittedAt,
      description: `${sub.intern.name} submitted ${sub.task.title}`
    }));

    res.json({
      stats: {
        totalInterns,
        activeCourses,
        pendingSubmissions,
        certificatesIssued
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;