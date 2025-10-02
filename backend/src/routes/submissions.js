const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { adminAuth, internAuth } = require('../middleware/auth');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const Course = require('../models/Course');
const Intern = require('../models/Intern');

// Configure multer for submission files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/submissions/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Intern: Submit task
router.post('/', internAuth, upload.array('files', 5), async (req, res) => {
  try {
    const { taskId, courseId, githubLink, formUrl } = req.body;

    // Check if task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if intern is enrolled in the course
    const intern = await Intern.findById(req.intern._id);
    if (!intern.enrolledCourses.includes(courseId)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Check if there's already a pending submission for this task
    const existingPending = await Submission.findOne({
      intern: req.intern._id,
      task: taskId,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({ message: 'You already have a pending submission for this task' });
    }

    const files = req.files ? req.files.map(f => `/uploads/submissions/${f.filename}`) : [];

    const submission = new Submission({
      intern: req.intern._id,
      course: courseId,
      task: taskId,
      githubLink: githubLink || '',
      formUrl: formUrl || '',
      files,
      status: 'pending',
      submittedAt: new Date()
    });

    await submission.save();

    res.status(201).json({
      message: 'Task submitted successfully! Admin will review within 12 hours.',
      submission
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all submissions with filters
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const submissions = await Submission.find(query)
      .populate('intern', 'name email userId')
      .populate('task', 'title taskNumber')
      .populate('course', 'name')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Review submission (OPEN or CLOSE)
router.post('/:id/review', adminAuth, async (req, res) => {
  try {
    const { status, feedback, unlockNextTask } = req.body;
    // status can be 'approved' (OPEN) or 'rejected' (CLOSE)

    const submission = await Submission.findById(req.params.id)
      .populate('task')
      .populate('course')
      .populate('intern');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({ message: 'This submission has already been reviewed' });
    }

    submission.status = status;
    submission.feedback = feedback || '';
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.admin._id;

    // If OPEN (approved), set next task unlock time to 12 hours from now
    if (status === 'approved' && unlockNextTask) {
      const unlockTime = new Date();
      unlockTime.setHours(unlockTime.getHours() + 12);
      submission.nextTaskUnlockTime = unlockTime;

      // Mark task as completed for this intern
      const intern = await Intern.findById(submission.intern._id);
      if (!intern.completedTasks.includes(submission.task._id)) {
        intern.completedTasks.push(submission.task._id);
        await intern.save();
      }

      // Calculate and update intern's progress
      const totalTasks = await Task.countDocuments({ course: submission.course._id });
      const completedTasks = intern.completedTasks.length;
      const progress = Math.round((completedTasks / totalTasks) * 100);
      
      // Update intern's total score (you can customize this logic)
      intern.totalScore = progress;
      await intern.save();
    }

    await submission.save();

    res.json({
      message: status === 'approved' 
        ? 'Task OPENED! Next task will unlock in 12 hours.' 
        : 'Task CLOSED. Feedback sent to intern.',
      submission
    });
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Intern: Get own submissions for a course
router.get('/my/:courseId', internAuth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      intern: req.intern._id,
      course: req.params.courseId
    })
      .populate('task', 'title taskNumber')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get submission details
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('intern', 'name email userId')
      .populate('task', 'title taskNumber description')
      .populate('course', 'name')
      .populate('reviewedBy', 'name');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;