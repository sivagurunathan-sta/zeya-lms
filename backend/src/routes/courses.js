const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { adminAuth } = require('../middleware/auth');
const Course = require('../models/Course');
const Task = require('../models/Task');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, 'uploads/courses/');
    } else if (file.fieldname === 'materials') {
      cb(null, 'uploads/materials/');
    } else if (file.fieldname === 'videos') {
      cb(null, 'uploads/videos/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Get all courses (admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('enrolledInterns', 'name email')
      .sort({ createdAt: -1 });

    res.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new course
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, duration, price } = req.body;

    const course = new Course({
      name,
      description,
      duration: duration || 35,
      price: price || 499,
      image: req.file ? `/uploads/courses/${req.file.filename}` : '',
      createdBy: req.admin._id,
      isActive: true
    });

    await course.save();

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course by ID
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('enrolledInterns', 'name email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const tasks = await Task.find({ course: req.params.id })
      .sort({ taskNumber: 1 });

    res.json({ course, tasks });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course status
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.isActive = isActive;
    await course.save();

    res.json({
      message: `Course ${isActive ? 'activated' : 'deactivated'} successfully`,
      course
    });
  } catch (error) {
    console.error('Error updating course status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete course
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete all tasks associated with this course
    await Task.deleteMany({ course: req.params.id });

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;