// routes/tasks.js - ENHANCED TASK & SUBMISSION MANAGEMENT SYSTEM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly, internOnly } = require('../middleware/auth');
const { createAuditLog, generatePaymentQR } = require('../utils/helpers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for task file uploads
const taskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/task-submissions/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadSubmission = multer({ 
  storage: taskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip|rar|7z|txt|csv|xlsx|xls|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type for submission'));
    }
  }
});

// ==========================
// INTERN ROUTES - TASK SUBMISSION
// ==========================

/**
 * Get all tasks for an internship with submission status
 * Shows task details, locked/unlocked status, and submission info
 */
router.get('/internship/:internshipId/tasks', auth, async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        internId: userId,
        internshipId
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this internship'
      });
    }

    // Get all tasks with submission status
    const tasks = await prisma.task.findMany({
      where: { internshipId },
      orderBy: { taskNumber: 'asc' },
      include: {
        submissions: {
          where: { 
            internId: userId,
            enrollmentId: enrollment.id
          },
          orderBy: { submissionDate: 'desc' },
          take: 1,
          include: {
            resubmissionOpportunities: {
              where: { isUsed: false }
            }
          }
        },
        taskUnlocks: {
          where: { enrollmentId: enrollment.id }
        }
      }
    });

    // Process tasks to determine unlock status
    const tasksWithStatus = tasks.map((task, index) => {
      const submission = task.submissions[0] || null;
      const taskUnlock = task.taskUnlocks[0] || null;

      // First task is always unlocked
      let isUnlocked = task.taskNumber === 1;
      let unlockTime = null;
      let canSubmit = true;
      let waitMessage = null;

      if (task.taskNumber > 1) {
        // Check if previous task is approved
        const previousTask = tasks.find(t => t.taskNumber === task.taskNumber - 1);
        const previousSubmission = previousTask?.submissions[0];

        if (previousSubmission?.status === 'APPROVED') {
          // Check if wait time has passed
          if (taskUnlock) {
            isUnlocked = taskUnlock.isUnlocked || new Date() >= taskUnlock.unlocksAt;
            unlockTime = taskUnlock.unlocksAt;
            
            if (!isUnlocked) {
              const timeLeft = Math.ceil((taskUnlock.unlocksAt - new Date()) / (1000 * 60 * 60));
              waitMessage = `Task will unlock in ${timeLeft} hours`;
              canSubmit = false;
            }
          } else {
            // Unlock record doesn't exist yet, create it
            isUnlocked = true;
          }
        } else {
          isUnlocked = false;
          waitMessage = 'Complete previous task first';
          canSubmit = false;
        }
      }

      // Check if resubmission is allowed
      const hasResubmissionOpportunity = submission?.resubmissionOpportunities?.length > 0;
      const resubmissionDeadline = hasResubmissionOpportunity 
        ? submission.resubmissionOpportunities[0].allowedUntil 
        : null;

      return {
        id: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        description: task.description,
        videoUrl: task.videoUrl,
        files: task.files,
        isRequired: task.isRequired,
        points: task.points,
        waitTimeHours: task.waitTimeHours,
        maxAttempts: task.maxAttempts,
        createdAt: task.createdAt,
        
        // Status information
        isUnlocked,
        canSubmit,
        unlockTime,
        waitMessage,
        
        // Submission information
        submission: submission ? {
          id: submission.id,
          githubRepoUrl: submission.githubRepoUrl,
          googleFormUrl: submission.googleFormUrl,
          fileUrl: submission.fileUrl,
          fileName: submission.fileName,
          submissionDate: submission.submissionDate,
          isLate: submission.isLate,
          score: submission.score,
          adminFeedback: submission.adminFeedback,
          status: submission.status,
          attemptNumber: submission.attemptNumber,
          reviewedAt: submission.reviewedAt
        } : null,
        
        // Resubmission info
        hasResubmissionOpportunity,
        resubmissionDeadline
      };
    });

    res.json({
      success: true,
      data: {
        enrollment: {
          id: enrollment.id,
          enrollmentDate: enrollment.enrollmentDate,
          isCompleted: enrollment.isCompleted,
          certificateEligible: enrollment.certificateEligible
        },
        tasks: tasksWithStatus
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Submit task - Supports multiple submission types:
 * 1. GitHub Repository URL
 * 2. Google Forms URL
 * 3. File Upload
 */
router.post('/tasks/:taskId/submit', auth, uploadSubmission.single('file'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { 
      submissionType, // 'github', 'form', 'file'
      githubRepoUrl, 
      googleFormUrl,
      additionalNotes
    } = req.body;
    const userId = req.user.id;

    // Validate submission type
    if (!['github', 'form', 'file'].includes(submissionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission type. Must be github, form, or file'
      });
    }

    // Validate based on submission type
    if (submissionType === 'github' && !githubRepoUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub repository URL is required'
      });
    }

    if (submissionType === 'form' && !googleFormUrl) {
      return res.status(400).json({
        success: false,
        message: 'Google Form URL is required'
      });
    }

    if (submissionType === 'file' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'File upload is required'
      });
    }

    // Validate URLs
    if (githubRepoUrl) {
      const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
      if (!githubUrlRegex.test(githubRepoUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GitHub repository URL format'
        });
      }
    }

    if (googleFormUrl) {
      const formUrlRegex = /^https:\/\/docs\.google\.com\/forms\//;
      if (!formUrlRegex.test(googleFormUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google Form URL format'
        });
      }
    }

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        internship: { select: { title: true } }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        internId: userId,
        internshipId: task.internshipId
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this internship'
      });
    }

    // Check existing submission
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        enrollmentId: enrollment.id,
        taskId
      },
      include: {
        resubmissionOpportunities: {
          where: { 
            isUsed: false,
            allowedUntil: { gte: new Date() }
          }
        }
      }
    });

    // Check if resubmission or new submission
    const isResubmission = existingSubmission && 
      existingSubmission.status === 'REJECTED' &&
      existingSubmission.resubmissionOpportunities.length > 0;

    if (existingSubmission && !isResubmission) {
      return res.status(400).json({
        success: false,
        message: existingSubmission.status === 'PENDING' 
          ? 'Task submission is pending review'
          : 'Task already submitted and approved'
      });
    }

    // Check if task is unlocked
    if (task.taskNumber > 1) {
      const previousTask = await prisma.task.findFirst({
        where: {
          internshipId: task.internshipId,
          taskNumber: task.taskNumber - 1
        }
      });

      if (previousTask) {
        const previousSubmission = await prisma.submission.findFirst({
          where: {
            taskId: previousTask.id,
            internId: userId,
            status: 'APPROVED'
          }
        });

        if (!previousSubmission) {
          return res.status(403).json({
            success: false,
            message: 'Previous task must be completed and approved first'
          });
        }

        // Check wait time
        const taskUnlock = await prisma.taskUnlock.findFirst({
          where: {
            enrollmentId: enrollment.id,
            taskId
          }
        });

        if (taskUnlock && !taskUnlock.isUnlocked && new Date() < taskUnlock.unlocksAt) {
          const hoursLeft = Math.ceil((taskUnlock.unlocksAt - new Date()) / (1000 * 60 * 60));
          return res.status(403).json({
            success: false,
            message: `Task is locked. You can submit in ${hoursLeft} hours`
          });
        }
      }
    }

    // Check attempt limits
    const attemptNumber = isResubmission ? existingSubmission.attemptNumber + 1 : 1;
    if (attemptNumber > task.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: `Maximum submission attempts (${task.maxAttempts}) exceeded`
      });
    }

    // Prepare submission data
    const submissionData = {
      enrollmentId: enrollment.id,
      taskId,
      internId: userId,
      submissionType,
      githubRepoUrl: githubRepoUrl || null,
      googleFormUrl: googleFormUrl || null,
      additionalNotes: additionalNotes || null,
      attemptNumber,
      status: 'PENDING',
      isLate: false // We'll calculate this based on deadlines if needed
    };

    // Add file information if file upload
    if (req.file) {
      submissionData.fileUrl = `/uploads/task-submissions/${req.file.filename}`;
      submissionData.fileName = req.file.originalname;
    }

    // Create or update submission
    let submission;
    if (isResubmission) {
      // Mark resubmission opportunity as used
      await prisma.resubmissionOpportunity.updateMany({
        where: {
          originalSubmissionId: existingSubmission.id,
          isUsed: false
        },
        data: { isUsed: true }
      });

      // Update existing submission
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          ...submissionData,
          status: 'RESUBMITTED',
          submissionDate: new Date()
        }
      });
    } else {
      // Create new submission
      submission = await prisma.submission.create({
        data: {
          ...submissionData,
          submissionDate: new Date()
        }
      });
    }

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: isResubmission ? 'Task Resubmitted' : 'Task Submitted',
        message: `Your submission for "${task.title}" has been received and is under review by admin`,
        type: 'SUCCESS'
      }
    });

    // Notify admin
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Task Submission',
          message: `${req.user.name} submitted "${task.title}" - Task ${task.taskNumber}`,
          type: 'INFO'
        }
      });
    }

    // Audit log
    await createAuditLog('TASK_SUBMITTED', userId, {
      taskId,
      taskTitle: task.title,
      submissionType,
      isResubmission,
      attemptNumber
    });

    res.status(201).json({
      success: true,
      message: isResubmission 
        ? 'Task resubmitted successfully' 
        : 'Task submitted successfully',
      data: { 
        submission: {
          id: submission.id,
          status: submission.status,
          submissionDate: submission.submissionDate,
          attemptNumber: submission.attemptNumber
        }
      }
    });

  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get submission details
 */
router.get('/submissions/:submissionId', auth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          select: {
            id: true,
            taskNumber: true,
            title: true,
            description: true,
            points: true
          }
        },
        intern: {
          select: {
            name: true,
            userId: true,
            email: true
          }
        },
        enrollment: {
          include: {
            internship: {
              select: {
                title: true
              }
            }
          }
        },
        resubmissionOpportunities: true
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check authorization
    if (submission.internId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { submission }
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// ADMIN ROUTES - SUBMISSION REVIEW
// ==========================

/**
 * Get all submissions for review with filters
 */
router.get('/admin/submissions', adminOnly, async (req, res) => {
  try {
    const { 
      status, 
      internshipId, 
      taskId,
      internId,
      submissionType,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (internId) where.internId = internId;
    if (taskId) where.taskId = taskId;
    if (submissionType) where.submissionType = submissionType;
    
    if (internshipId) {
      where.task = {
        internshipId: internshipId
      };
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { submissionDate: 'desc' },
        include: {
          intern: {
            select: {
              id: true,
              name: true,
              userId: true,
              email: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              taskNumber: true,
              points: true,
              maxAttempts: true
            }
          },
          enrollment: {
            include: {
              internship: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.submission.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get admin submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Review submission - Mark as OPEN (Approved) or CLOSE (Rejected)
 * OPEN = Task completed correctly
 * CLOSE = Task incorrect, may allow resubmission
 */
router.put('/admin/submissions/:submissionId/review', adminOnly, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { 
      action, // 'OPEN' or 'CLOSE'
      score, 
      adminFeedback,
      allowResubmission = true
    } = req.body;

    if (!['OPEN', 'CLOSE'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either OPEN (approve) or CLOSE (reject)'
      });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        intern: { select: { name: true, email: true } },
        task: {
          select: {
            id: true,
            title: true,
            taskNumber: true,
            waitTimeHours: true,
            internshipId: true,
            points: true,
            maxAttempts: true
          }
        },
        enrollment: {
          include: {
            internship: {
              select: {
                passPercentage: true
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const status = action === 'OPEN' ? 'APPROVED' : 'REJECTED';

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        score: score ? parseFloat(score) : (action === 'OPEN' ? submission.task.points : 0),
        adminFeedback,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    if (action === 'OPEN') {
      // Task OPENED (Approved) - Unlock next task
      const nextTask = await prisma.task.findFirst({
        where: {
          internshipId: submission.task.internshipId,
          taskNumber: submission.task.taskNumber + 1
        }
      });

      if (nextTask) {
        // Calculate unlock time (12 hours or admin-configured wait time)
        const unlockTime = new Date(Date.now() + (submission.task.waitTimeHours * 60 * 60 * 1000));

        // Create or update task unlock record
        await prisma.taskUnlock.upsert({
          where: {
            enrollmentId_taskId: {
              enrollmentId: submission.enrollmentId,
              taskId: nextTask.id
            }
          },
          create: {
            enrollmentId: submission.enrollmentId,
            taskId: nextTask.id,
            unlocksAt: unlockTime,
            isUnlocked: false
          },
          update: {
            unlocksAt: unlockTime,
            isUnlocked: false
          }
        });

        // Notify user about next task
        await prisma.notification.create({
          data: {
            userId: submission.internId,
            title: 'Task Approved - Next Task Unlocking',
            message: `Your submission for "${submission.task.title}" has been approved with score ${updatedSubmission.score}! Next task "${nextTask.title}" will unlock at ${unlockTime.toLocaleString()}`,
            type: 'SUCCESS'
          }
        });
      } else {
        // This was the last task - Check completion
        await checkInternshipCompletion(submission.enrollmentId);
      }
    } else {
      // Task CLOSED (Rejected) - Handle resubmission
      await prisma.notification.create({
        data: {
          userId: submission.internId,
          title: 'Task Rejected',
          message: `Your submission for "${submission.task.title}" was marked as incorrect. ${adminFeedback || 'Please review the feedback and resubmit.'}`,
          type: 'ERROR'
        }
      });

      // Create resubmission opportunity if allowed
      if (allowResubmission && submission.attemptNumber < submission.task.maxAttempts) {
        await prisma.resubmissionOpportunity.create({
          data: {
            originalSubmissionId: submissionId,
            enrollmentId: submission.enrollmentId,
            taskId: submission.taskId,
            allowedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isUsed: false
          }
        });

        await prisma.notification.create({
          data: {
            userId: submission.internId,
            title: 'Resubmission Allowed',
            message: `You can resubmit "${submission.task.title}" within 7 days. Attempt ${submission.attemptNumber}/${submission.task.maxAttempts}`,
            type: 'INFO'
          }
        });
      }
    }

    // Audit log
    await createAuditLog('SUBMISSION_REVIEWED', req.user.id, {
      submissionId,
      internId: submission.internId,
      taskId: submission.taskId,
      action,
      status,
      score: updatedSubmission.score
    });

    res.json({
      success: true,
      message: `Submission ${action === 'OPEN' ? 'approved' : 'rejected'} successfully`,
      data: { submission: updatedSubmission }
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Helper function to check internship completion and show payment option
 */
async function checkInternshipCompletion(enrollmentId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      internship: {
        select: {
          title: true,
          passPercentage: true,
          certificatePrice: true
        },
        include: {
          tasks: { select: { id: true } }
        }
      },
      submissions: {
        where: { status: 'APPROVED' },
        select: { score: true }
      }
    }
  });

  const totalTasks = enrollment.internship.tasks.length;
  const completedTasks = enrollment.submissions.length;

  // Check if all tasks completed
  if (completedTasks >= totalTasks) {
    // Calculate final score
    const totalScore = enrollment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const finalScore = totalScore / completedTasks;
    const isEligible = finalScore >= enrollment.internship.passPercentage;

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        isCompleted: true,
        completionDate: new Date(),
        finalScore: finalScore,
        certificateEligible: isEligible
      }
    });

    // Notify user about completion and payment
    if (isEligible) {
      await prisma.notification.create({
        data: {
          userId: enrollment.internId,
          title: '🎉 Internship Completed!',
          message: `Congratulations! You completed "${enrollment.internship.title}" with ${finalScore.toFixed(1)}% score. Proceed to payment (₹${enrollment.internship.certificatePrice}) to get your certificate!`,
          type: 'SUCCESS'
        }
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: enrollment.internId,
          title: 'Internship Completed',
          message: `You completed all tasks with ${finalScore.toFixed(1)}% score. However, you need ${enrollment.internship.passPercentage}% to be eligible for certificate.`,
          type: 'WARNING'
        }
      });
    }
  }
}

/**
 * Bulk review submissions
 */
router.post('/admin/submissions/bulk-review', adminOnly, async (req, res) => {
  try {
    const { submissionIds, action, score, adminFeedback } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Submission IDs array is required'
      });
    }

    if (!['OPEN', 'CLOSE'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either OPEN or CLOSE'
      });
    }

    const status = action === 'OPEN' ? 'APPROVED' : 'REJECTED';
    const results = [];
    const errors = [];

    for (const submissionId of submissionIds) {
      try {
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status,
            score: score ? parseFloat(score) : null,
            adminFeedback,
            reviewedAt: new Date(),
            reviewedBy: req.user.id
          }
        });
        results.push(submissionId);
      } catch (error) {
        errors.push({ submissionId, error: error.message });
      }
    }

    // Audit log
    await createAuditLog('BULK_SUBMISSION_REVIEW', req.user.id, {
      total: submissionIds.length,
      successful: results.length,
      failed: errors.length,
      action
    });

    res.json({
      success: true,
      message: `Reviewed ${results.length} submissions`,
      data: { results, errors }
    });

  } catch (error) {
    console.error('Bulk review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Get submission statistics for dashboard
 */
router.get('/admin/submission-stats', adminOnly, async (req, res) => {
  try {
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      resubmissions,
      averageReviewTime
    ] = await Promise.all([
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.submission.count({ where: { status: 'APPROVED' } }),
      prisma.submission.count({ where: { status: 'REJECTED' } }),
      prisma.submission.count({ where: { status: 'RESUBMITTED' } }),
      prisma.submission.aggregate({
        where: { 
          reviewedAt: { not: null },
          submissionDate: { not: null }
        },
        _avg: {
          // This would need a computed field in production
          // For now, return null
        }
      })
    ]);

    // Submission by type
    const submissionsByType = await prisma.submission.groupBy({
      by: ['submissionType'],
      _count: true
    });

    res.json({
      success: true,
      data: {
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        resubmissions,
        submissionsByType: submissionsByType.map(item => ({
          type: item.submissionType,
          count: item._count
        })),
        approvalRate: totalSubmissions > 0 
          ? Math.round((approvedSubmissions / totalSubmissions) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('Get submission stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;