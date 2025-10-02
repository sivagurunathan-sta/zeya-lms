const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { adminAuth } = require('../middleware/auth');
const Task = require('../models/Task');
const Course = require('../models/Course');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'materials') {
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
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// Create new task
router.post('/', adminAuth, upload.fields([
  { name: 'materials', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), async (req, res) => {
  try {
    const { courseId, taskNumber, title, description, submissionType, formUrl } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const materials = req.files['materials'] 
      ? req.files['materials'].map(f => `/uploads/materials/${f.filename}`)
      : [];
    
    const videos = req.files['videos']
      ? req.files['videos'].map(f => `/uploads/videos/${f.filename}`)
      : [];

    const task = new Task({
      course: courseId,
      taskNumber: parseInt(taskNumber),
      title,
      description,
      materials,
      videos,
      submissionType: submissionType || 'GITHUB',
      formUrl: formUrl || ''
    });

    await task.save();

    // Update course total tasks count
    course.totalTasks = await Task.countDocuments({ course: courseId });
    await course.save();

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks for a course
router.get('/course/:courseId', adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ course: req.params.courseId })
      .sort({ taskNumber: 1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', adminAuth, upload.fields([
  { name: 'materials', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), async (req, res) => {
  try {
    const { title, description, submissionType, formUrl } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.submissionType = submissionType || task.submissionType;
    task.formUrl = formUrl || task.formUrl;

    if (req.files['materials']) {
      const newMaterials = req.files['materials'].map(f => `/uploads/materials/${f.filename}`);
      task.materials = [...task.materials, ...newMaterials];
    }

    if (req.files['videos']) {
      const newVideos = req.files['videos'].map(f => `/uploads/videos/${f.filename}`);
      task.videos = [...task.videos, ...newVideos];
    }

    await task.save();

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const courseId = task.course;
    await Task.findByIdAndDelete(req.params.id);

    // Update course total tasks count
    const course = await Course.findById(courseId);
    if (course) {
      course.totalTasks = await Task.countDocuments({ course: courseId });
      await course.save();
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;