// backend/routes/intern.js - Routes for intern management

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const InternProgress = require('../models/InternProgress');
const Payment = require('../models/Payment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ==================== ADMIN ROUTES ====================

// Create/Update Daily Tasks (Admin Only)
router.post('/admin/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { taskNumber, title, description, instructions, resources, difficulty, category, estimatedTime, prerequisites } = req.body;

    if (!taskNumber || !title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Task number, title, description, and category are required'
      });
    }

    if (taskNumber < 1 || taskNumber > 35) {
      return res.status(400).json({
        success: false,
        message: 'Task number must be between 1 and 35'
      });
    }

    // Check if task already exists
    let task = await Task.findOne({ taskNumber });
    
    if (task) {
      // Update existing task
      Object.assign(task, {
        title,
        description,
        instructions,
        resources: resources || [],
        difficulty,
        category,
        estimatedTime,
        prerequisites: prerequisites || [],
        updatedAt: new Date()
      });
    } else {
      // Create new task
      task = new Task({
        taskNumber,
        title,
        description,
        instructions,
        resources: resources || [],
        difficulty,
        category,
        estimatedTime,
        prerequisites: prerequisites || [],
        createdBy: req.user._id
      });
    }

    await task.save();

    res.status(task.isNew ? 201 : 200).json({
      success: true,
      message: `Task ${task.isNew ? 'created' : 'updated'} successfully`,
      data: { task }
    });
  } catch (error) {
    console.error('Task creation/update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update task'
    });
  }
});

// Get All Tasks (Admin Only)
router.get('/admin/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 35 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ taskNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalTasks: total,
          hasNext: skip + tasks.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Initialize Intern Progress (Admin Only)
router.post('/admin/initialize-intern/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if progress already exists
    let progress = await InternProgress.findOne({ internId: userId });
    if (progress) {
      return res.status(400).json({
        success: false,
        message: 'Intern progress already initialized'
      });
    }

    // Get all tasks
    const tasks = await Task.find({ isActive: true }).sort({ taskNumber: 1 });
    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tasks found. Please create tasks first.'
      });
    }

    // Initialize progress with all tasks locked except day 1
    const tasksProgress = tasks.map(task => ({
      taskNumber: task.taskNumber,
      taskId: task._id,
      status: task.taskNumber === 1 ? 'unlocked' : 'locked',
      unlockedAt: task.taskNumber === 1 ? new Date() : undefined
    }));

    progress = new InternProgress({
      internId: userId,
      currentDay: 1,
      tasksProgress,
      startDate: new Date()
    });

    await progress.save();

    res.status(201).json({
      success: true,
      message: 'Intern progress initialized successfully',
      data: { progress }
    });
  } catch (error) {
    console.error('Initialize intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize intern progress'
    });
  }
});

// View All Intern Progress (Admin Only)
router.get('/admin/interns-progress', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'completed') {
      query.actualEndDate = { $ne: null };
    }

    const progressRecords = await InternProgress.find(query)
      .populate('internId', 'name email userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InternProgress.countDocuments(query);

    // Calculate stats for each intern
    const internsWithStats = progressRecords.map(progress => {
      progress.calculateStats();
      return progress;
    });

    res.json({
      success: true,
      data: {
        interns: internsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalInterns: total,
          hasNext: skip + progressRecords.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get interns progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interns progress'
    });
  }
});

// Review Task Submission (Admin Only)
router.put('/admin/review-submission/:internId/:taskNumber', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { internId, taskNumber } = req.params;
    const { score, feedback, status } = req.body; // status: 'completed' or 'rejected'

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "completed" or "rejected"'
      });
    }

    if (status === 'completed' && (score === undefined || score < 0 || score > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 0 and 100 for completed tasks'
      });
    }

    const progress = await InternProgress.findOne({ internId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === parseInt(taskNumber));
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found in intern progress'
      });
    }

    if (taskProgress.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Task has not been submitted yet'
      });
    }

    // Update task progress
    taskProgress.status = status;
    taskProgress.score = status === 'completed' ? score : 0;
    taskProgress.feedback = feedback;
    taskProgress.reviewedBy = req.user._id;
    taskProgress.reviewedAt = new Date();
    
    if (status === 'completed') {
      taskProgress.completedAt = new Date();
      
      // Unlock next task if not already unlocked and intern hasn't finished all tasks
      const nextTaskNumber = parseInt(taskNumber) + 1;
      if (nextTaskNumber <= 35) {
        const nextTask = progress.tasksProgress.find(t => t.taskNumber === nextTaskNumber);
        if (nextTask && nextTask.status === 'locked') {
          nextTask.status = 'unlocked';
          nextTask.unlockedAt = new Date();
          progress.currentDay = nextTaskNumber;
        }
      }
      
      // Check if all tasks are completed
      const completedTasks = progress.tasksProgress.filter(t => t.status === 'completed').length;
      if (completedTasks === 35 || parseInt(taskNumber) === 35) {
        progress.actualEndDate = new Date();
      }
    }

    // Recalculate stats
    progress.calculateStats();
    await progress.save();

    res.json({
      success: true,
      message: `Task ${status} successfully`,
      data: { taskProgress: taskProgress }
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review submission'
    });
  }
});

// ==================== INTERN ROUTES ====================

// Get Intern Dashboard
router.get('/intern/dashboard', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id })
      .populate('tasksProgress.taskId', 'title description category difficulty estimatedTime');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found. Please contact admin.'
      });
    }

    // Calculate fresh stats
    progress.calculateStats();
    await progress.save();

    // Get current and next tasks
    const currentTask = progress.tasksProgress.find(t => t.taskNumber === progress.currentDay);
    const nextTask = progress.tasksProgress.find(t => t.taskNumber === progress.currentDay + 1);

    // Calculate days remaining
    const today = new Date();
    const daysElapsed = Math.floor((today - progress.startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = Math.max(0, 35 - daysElapsed);

    res.json({
      success: true,
      data: {
        overview: {
          currentDay: progress.currentDay,
          daysElapsed,
          daysRemaining,
          startDate: progress.startDate,
          expectedEndDate: progress.expectedEndDate,
          actualEndDate: progress.actualEndDate
        },
        stats: progress.overallStats,
        currentTask,
        nextTask,
        recentTasks: progress.tasksProgress
          .filter(t => t.status !== 'locked')
          .sort((a, b) => b.taskNumber - a.taskNumber)
          .slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get intern dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get All Tasks with Progress
router.get('/intern/tasks', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id })
      .populate('tasksProgress.taskId');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found. Please contact admin.'
      });
    }

    // Sort tasks by task number
    const tasksWithProgress = progress.tasksProgress
      .sort((a, b) => a.taskNumber - b.taskNumber)
      .map(taskProgress => ({
        ...taskProgress.taskId.toObject(),
        progress: {
          taskNumber: taskProgress.taskNumber,
          status: taskProgress.status,
          unlockedAt: taskProgress.unlockedAt,
          startedAt: taskProgress.startedAt,
          submittedAt: taskProgress.submittedAt,
          completedAt: taskProgress.completedAt,
          githubRepoUrl: taskProgress.githubRepoUrl,
          score: taskProgress.score,
          feedback: taskProgress.feedback,
          isLate: taskProgress.isLate,
          daysLate: taskProgress.daysLate
        }
      }));

    res.json({
      success: true,
      data: {
        tasks: tasksWithProgress,
        currentDay: progress.currentDay,
        overallStats: progress.overallStats
      }
    });
  } catch (error) {
    console.error('Get intern tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Start Working on Task
router.post('/intern/start-task/:taskNumber', authenticateToken, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const taskNum = parseInt(taskNumber);

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === taskNum);
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (taskProgress.status !== 'unlocked') {
      return res.status(400).json({
        success: false,
        message: 'Task is not available to start'
      });
    }

    // Update task status to in_progress
    taskProgress.status = 'in_progress';
    taskProgress.startedAt = new Date();

    await progress.save();

    res.json({
      success: true,
      message: 'Task started successfully',
      data: { taskProgress }
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start task'
    });
  }
});

// Submit Task
router.post('/intern/submit-task/:taskNumber', authenticateToken, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const { githubRepoUrl } = req.body;
    const taskNum = parseInt(taskNumber);

    if (!githubRepoUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub repository URL is required'
      });
    }

    // Validate GitHub URL format
    const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    if (!githubUrlRegex.test(githubRepoUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid GitHub repository URL'
      });
    }

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === taskNum);
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!['unlocked', 'in_progress'].includes(taskProgress.status)) {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be submitted in current status'
      });
    }

    // Check if submission is late (more than 24 hours after unlock)
    const submissionTime = new Date();
    const unlockTime = taskProgress.unlockedAt || taskProgress.startedAt;
    const hoursDiff = (submissionTime - unlockTime) / (1000 * 60 * 60);
    const isLate = hoursDiff > 24;
    const daysLate = isLate ? Math.ceil((hoursDiff - 24) / 24) : 0;

    // Update task progress
    taskProgress.status = 'submitted';
    taskProgress.githubRepoUrl = githubRepoUrl;
    taskProgress.submittedAt = submissionTime;
    taskProgress.isLate = isLate;
    taskProgress.daysLate = daysLate;

    if (!taskProgress.startedAt) {
      taskProgress.startedAt = taskProgress.unlockedAt;
    }

    await progress.save();

    res.json({
      success: true,
      message: `Task submitted successfully${isLate ? ' (Late submission)' : ''}`,
      data: {
        taskProgress,
        isLate,
        daysLate
      }
    });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task'
    });
  }
});

// Skip Task (reduces final score)
router.post('/intern/skip-task/:taskNumber', authenticateToken, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const taskNum = parseInt(taskNumber);

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    const taskProgress = progress.tasksProgress.find(t => t.taskNumber === taskNum);
    if (!taskProgress) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!['unlocked', 'in_progress'].includes(taskProgress.status)) {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be skipped in current status'
      });
    }

    // Update task status to skipped
    taskProgress.status = 'skipped';
    taskProgress.score = 0; // Skipped tasks get 0 score

    // Unlock next task
    const nextTaskNumber = taskNum + 1;
    if (nextTaskNumber <= 35) {
      const nextTask = progress.tasksProgress.find(t => t.taskNumber === nextTaskNumber);
      if (nextTask && nextTask.status === 'locked') {
        nextTask.status = 'unlocked';
        nextTask.unlockedAt = new Date();
        progress.currentDay = nextTaskNumber;
      }
    }

    // Recalculate stats
    progress.calculateStats();
    await progress.save();

    res.json({
      success: true,
      message: 'Task skipped successfully',
      data: { taskProgress }
    });
  } catch (error) {
    console.error('Skip task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip task'
    });
  }
});

// ==================== CERTIFICATE & PAYMENT ROUTES ====================

// Check Certificate Eligibility
router.get('/intern/certificate-eligibility', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    // Recalculate stats to ensure accuracy
    progress.calculateStats();
    await progress.save();

    const isEligible = progress.overallStats.isEligibleForCertificate;
    const finalScore = progress.overallStats.finalScore;

    res.json({
      success: true,
      data: {
        isEligible,
        finalScore,
        requiredScore: 75,
        canPurchase: isEligible && !progress.certificateInfo.isPurchased,
        alreadyPurchased: progress.certificateInfo.isPurchased,
        certificatePrice: 499,
        stats: progress.overallStats
      }
    });
  } catch (error) {
    console.error('Check certificate eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check certificate eligibility'
    });
  }
});

// Purchase Certificate (Mock Payment - integrate with actual payment gateway)
router.post('/intern/purchase-certificate', authenticateToken, async (req, res) => {
  try {
    const { paymentMethod = 'razorpay' } = req.body;

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    // Check eligibility
    progress.calculateStats();
    if (!progress.overallStats.isEligibleForCertificate) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for certificate. Minimum score required: 75%'
      });
    }

    if (progress.certificateInfo.isPurchased) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already purchased'
      });
    }

    // Create payment record
    const payment = new Payment({
      userId: req.user._id,
      type: 'certificate',
      itemId: progress._id, // Using progress ID as certificate ID
      amount: 499,
      paymentMethod,
      status: 'completed', // Mock payment - always successful
      transactionId: 'TXN_' + Date.now(),
      paidAt: new Date()
    });

    await payment.save();

    // Update progress with certificate info
    progress.certificateInfo.isPurchased = true;
    progress.certificateInfo.purchaseDate = new Date();
    progress.certificateInfo.paymentId = payment.paymentId;
    progress.certificateInfo.certificateUrl = `/certificates/${progress._id}`;

    // Enable access to paid tasks
    progress.paidTasksAccess.hasAccess = true;

    await progress.save();

    res.status(201).json({
      success: true,
      message: 'Certificate purchased successfully! You now have access to paid tasks.',
      data: {
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paidAt: payment.paidAt
        },
        certificateUrl: progress.certificateInfo.certificateUrl,
        paidTasksAccessEnabled: true
      }
    });
  } catch (error) {
    console.error('Purchase certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase certificate'
    });
  }
});

// Get Available Paid Tasks
router.get('/intern/paid-tasks', authenticateToken, async (req, res) => {
  try {
    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    if (!progress.paidTasksAccess.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase a certificate first to access paid tasks'
      });
    }

    // Get paid tasks (tasks beyond regular 35 tasks)
    const paidTasks = await Task.find({
      taskNumber: { $gt: 35 }, // Tasks numbered > 35 are paid tasks
      isActive: true
    }).sort({ taskNumber: 1 });

    // Add purchase status to each task
    const tasksWithPurchaseStatus = paidTasks.map(task => ({
      ...task.toObject(),
      isPurchased: progress.paidTasksAccess.purchasedTasks.some(
        pt => pt.taskId.toString() === task._id.toString()
      ),
      price: 1000
    }));

    res.json({
      success: true,
      data: {
        paidTasks: tasksWithPurchaseStatus,
        totalPurchased: progress.paidTasksAccess.purchasedTasks.length
      }
    });
  } catch (error) {
    console.error('Get paid tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid tasks'
    });
  }
});

// Purchase Paid Task
router.post('/intern/purchase-paid-task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { paymentMethod = 'razorpay' } = req.body;

    const progress = await InternProgress.findOne({ internId: req.user._id });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Intern progress not found'
      });
    }

    if (!progress.paidTasksAccess.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase a certificate first to access paid tasks'
      });
    }

    // Check if task exists and is a paid task
    const task = await Task.findById(taskId);
    if (!task || task.taskNumber <= 35) {
      return res.status(404).json({
        success: false,
        message: 'Paid task not found'
      });
    }

    // Check if already purchased
    const alreadyPurchased = progress.paidTasksAccess.purchasedTasks.some(
      pt => pt.taskId.toString() === taskId
    );

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: 'Task already purchased'
      });
    }

    // Create payment record
    const payment = new Payment({
      userId: req.user._id,
      type: 'paid_task',
      itemId: taskId,
      amount: 1000,
      paymentMethod,
      status: 'completed', // Mock payment
      transactionId: 'TXN_' + Date.now(),
      paidAt: new Date()
    });

    await payment.save();

    // Add to purchased tasks
    progress.paidTasksAccess.purchasedTasks.push({
      taskId,
      purchaseDate: new Date(),
      paymentId: payment.paymentId,
      amount: 1000
    });

    await progress.save();

    res.status(201).json({
      success: true,
      message: 'Paid task purchased successfully!',
      data: {
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paidAt: payment.paidAt
        },
        task: {
          id: task._id,
          title: task.title,
          taskNumber: task.taskNumber
        }
      }
    });
  } catch (error) {
    console.error('Purchase paid task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase paid task'
    });
  }
});

// Get Payment History
router.get('/intern/payment-history', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('itemId');

    res.json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

module.exports = router;