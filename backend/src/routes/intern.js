const express = require('express');
const router = express.Router();
const { internAuth } = require('../middleware/auth');
const Intern = require('../models/Intern');
const Course = require('../models/Course');
const Task = require('../models/Task');
const Submission = require('../models/Submission');

// Get intern profile
router.get('/profile', internAuth, async (req, res) => {
  try {
    const intern = await Intern.findById(req.intern._id)
      .select('-password')
      .populate('enrolledCourses', 'name');

    res.json({ user: intern });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all courses (enrolled and available)
router.get('/courses', internAuth, async (req, res) => {
  try {
    const intern = await Intern.findById(req.intern._id);

    // Get enrolled courses with progress
    const enrolledCourses = await Course.find({
      _id: { $in: intern.enrolledCourses },
      isActive: true
    });

    // Calculate progress for each course
    const enrolledWithProgress = await Promise.all(
      enrolledCourses.map(async (course) => {
        const totalTasks = await Task.countDocuments({ course: course._id });
        const completedTasks = await Submission.countDocuments({
          intern: intern._id,
          course: course._id,
          status: 'approved'
        });
        
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...course.toObject(),
          progress,
          completedTasks,
          totalTasks
        };
      })
    );

    // Get available courses (not enrolled)
    const availableCourses = await Course.find({
      _id: { $nin: intern.enrolledCourses },
      isActive: true
    });

    res.json({
      enrolledCourses: enrolledWithProgress,
      availableCourses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in a course
router.post('/courses/:id/enroll', internAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.isActive) {
      return res.status(400).json({ message: 'This course is not active' });
    }

    const intern = await Intern.findById(req.intern._id);

    if (intern.enrolledCourses.includes(req.params.id)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    intern.enrolledCourses.push(req.params.id);
    await intern.save();

    course.enrolledInterns.push(intern._id);
    await course.save();

    res.json({ message: 'Successfully enrolled in course', course });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course details with tasks
router.get('/courses/:id', internAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const intern = await Intern.findById(req.intern._id);
    
    if (!intern.enrolledCourses.includes(req.params.id)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Calculate progress
    const totalTasks = await Task.countDocuments({ course: course._id });
    const completedTasks = await Submission.countDocuments({
      intern: intern._id,
      course: course._id,
      status: 'approved'
    });
    
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      course: {
        ...course.toObject(),
        progress,
        completedTasks,
        totalTasks
      }
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks for a course with unlock status
router.get('/courses/:id/tasks', internAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const intern = await Intern.findById(req.intern._id);
    
    if (!intern.enrolledCourses.includes(req.params.id)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Get all tasks for the course
    const allTasks = await Task.find({ course: req.params.id })
      .sort({ taskNumber: 1 });

    // Get all submissions for this intern and course
    const submissions = await Submission.find({
      intern: intern._id,
      course: req.params.id
    });

    // Map tasks with their status
    const tasksWithStatus = await Promise.all(
      allTasks.map(async (task, index) => {
        // Find latest submission for this task
        const latestSubmission = submissions
          .filter(s => s.task.toString() === task._id.toString())
          .sort((a, b) => b.submittedAt - a.submittedAt)[0];

        let isUnlocked = false;
        let isCompleted = false;
        let submissionStatus = null;
        let feedback = null;

        // First task is always unlocked
        if (index === 0) {
          isUnlocked = true;
        } else {
          // Check if previous task is completed and 12 hours have passed
          const previousTask = allTasks[index - 1];
          const previousSubmission = await Submission.findOne({
            intern: intern._id,
            task: previousTask._id,
            status: 'approved'
          });

          if (previousSubmission) {
            const unlockTime = previousSubmission.nextTaskUnlockTime;
            const now = new Date();
            
            if (unlockTime && now >= unlockTime) {
              isUnlocked = true;
            }
          }
        }

        // Check if current task is completed
        if (latestSubmission && latestSubmission.status === 'approved') {
          isCompleted = true;
        }

        // Get submission status
        if (latestSubmission) {
          submissionStatus = latestSubmission.status;
          feedback = latestSubmission.feedback;
        }

        return {
          ...task.toObject(),
          isUnlocked,
          isCompleted,
          submissionStatus,
          feedback
        };
      })
    );

    res.json({ tasks: tasksWithStatus });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;