const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const {
  getTasksForEnrollment,
  submitTask,
  reviewSubmission,
  getPendingSubmissions,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

const router = express.Router();

// Validation middleware
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

// Get tasks for specific enrollment (Student)
router.get('/enrollment/:enrollmentId', auth, getTasksForEnrollment);

// Submit task (Student)
router.post('/:taskId/submit', [
  auth,
  body('enrollmentId').isMongoId(),
  body('submissionText').optional().isLength({ max: 5000 }),
  body('fileUrls').optional().isArray()
], validateRequest, submitTask);

// Review task submission (Admin only)
router.put('/submission/:submissionId/review', [
  auth,
  adminAuth,
  body('status').isIn(['APPROVED', 'REJECTED', 'NEEDS_REVISION']),
  body('feedback').optional().isLength({ max: 1000 }),
  body('grade').optional().isFloat({ min: 0, max: 10 })
], validateRequest, reviewSubmission);

// Get pending submissions for review (Admin only)
router.get('/admin/pending', [auth, adminAuth], getPendingSubmissions);

// Create task (Admin only)
router.post('/', [
  auth,
  adminAuth,
  body('internshipId').isMongoId(),
  body('title').isLength({ min: 3, max: 200 }),
  body('description').isLength({ min: 10, max: 2000 }),
  body('taskOrder').isInt({ min: 1 }),
  body('estimatedHours').optional().isInt({ min: 1, max: 100 }),
  body('isMandatory').optional().isBoolean()
], validateRequest, createTask);

// Update task (Admin only)
router.put('/:id', [
  auth,
  adminAuth,
  body('title').optional().isLength({ min: 3, max: 200 }),
  body('description').optional().isLength({ min: 10, max: 2000 }),
  body('taskOrder').optional().isInt({ min: 1 }),
  body('estimatedHours').optional().isInt({ min: 1, max: 100 }),
  body('isMandatory').optional().isBoolean()
], validateRequest, updateTask);

// Delete task (Admin only)
router.delete('/:id', [auth, adminAuth], deleteTask);

// Get all submissions for a specific task (Admin only)
router.get('/:taskId/submissions', [auth, adminAuth], (req, res, next) => {
  req.query.taskId = req.params.taskId;
  getPendingSubmissions(req, res, next);
});

// Get student progress for specific internship (Admin only)
router.get('/admin/progress/:internshipId', [auth, adminAuth], async (req, res, next) => {
  try {
    const { internshipId } = req.params;
    const { getDB } = require('../config/database');
    const { ObjectId } = require('mongodb');
    const db = getDB();

    const progress = await db.collection('enrollments').aggregate([
      { $match: { internshipId: new ObjectId(internshipId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'taskSubmissions',
          localField: '_id',
          foreignField: 'enrollmentId',
          as: 'submissions'
        }
      },
      {
        $addFields: {
          completedTasks: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $eq: ['$this.status', 'APPROVED'] }
              }
            }
          },
          pendingTasks: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $eq: ['$this.status', 'PENDING'] }
              }
            }
          },
          rejectedTasks: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $eq: ['$this.status', 'REJECTED'] }
              }
            }
          }
        }
      },
      { $sort: { progressPercentage: -1 } }
    ]).toArray();

    res.json({
      success: true,
      data: progress.map(p => ({
        ...p,
        id: p._id.toString()
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get task analytics (Admin only)
router.get('/admin/analytics', [auth, adminAuth], async (req, res, next) => {
  try {
    const { getDB } = require('../config/database');
    const db = getDB();

    const analytics = await db.collection('taskSubmissions').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgGrade: { $avg: '$grade' }
        }
      }
    ]).toArray();

    const taskCompletion = await db.collection('tasks').aggregate([
      {
        $lookup: {
          from: 'taskSubmissions',
          localField: '_id',
          foreignField: 'taskId',
          as: 'submissions'
        }
      },
      {
        $addFields: {
          totalSubmissions: { $size: '$submissions' },
          approvedSubmissions: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $eq: ['$this.status', 'APPROVED'] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $eq: ['$totalSubmissions', 0] },
              0,
              { $multiply: [{ $divide: ['$approvedSubmissions', '$totalSubmissions'] }, 100] }
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]).toArray();

    res.json({
      success: true,
      data: {
        submissionStats: analytics,
        taskCompletion: taskCompletion.map(task => ({
          ...task,
          id: task._id.toString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;