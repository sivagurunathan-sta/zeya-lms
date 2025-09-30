// Add to backend/src/routes/intern.js
const taskUnlockService = require('../services/taskUnlockService');
const scoreCalculationService = require('../services/scoreCalculationService');

// Replace the existing enroll route with this enhanced version:

router.post('/enroll/:internshipId', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    // Check if internship exists and is active
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId, isActive: true }
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found or inactive'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this internship'
      });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        internId,
        internshipId,
        enrollmentDate: new Date()
      },
      include: {
        internship: {
          select: {
            title: true,
            description: true,
            durationDays: true,
            passPercentage: true
          }
        }
      }
    });

    // Initialize tasks (unlock first task)
    const taskInit = await taskUnlockService.initializeEnrollmentTasks(
      enrollment.id,
      internshipId
    );

    // Create welcome notification (already done in initializeEnrollmentTasks, but add journey details)
    await prisma.notification.create({
      data: {
        userId: internId,
        title: '🎓 Welcome to Your Internship!',
        message: `You've enrolled in "${internship.title}". This is a ${internship.durationDays}-day journey with 35 tasks. Pass score: ${internship.passPercentage}%. Let's get started!`,
        type: 'SUCCESS'
      }
    });

    // Audit log
    await createAuditLog('ENROLLMENT_CREATED', internId, {
      enrollmentId: enrollment.id,
      internshipId,
      internshipTitle: internship.title
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment successful! Your journey begins now.',
      data: {
        enrollment,
        firstTask: taskInit.firstTask,
        guidelines: {
          totalTasks: 35,
          durationDays: internship.durationDays,
          passPercentage: internship.passPercentage,
          taskDeadline: '24 hours per task',
          certificatePrice: internship.certificatePrice
        }
      }
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enhanced task submission with unlock checking
router.post('/tasks/:taskId/submit', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { githubRepoUrl } = req.body;
    const internId = req.user.id;

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
        message: 'Invalid GitHub repository URL format'
      });
    }

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

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId: task.internshipId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this internship'
      });
    }

    // Check if task is unlocked
    const unlockStatus = await taskUnlockService.isTaskUnlocked(
      enrollment.id,
      taskId
    );

    if (!unlockStatus.unlocked) {
      return res.status(403).json({
        success: false,
        message: unlockStatus.reason,
        unlocksAt: unlockStatus.unlocksAt
      });
    }

    // Check if already submitted
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        enrollmentId_taskId: {
          enrollmentId: enrollment.id,
          taskId
        }
      }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Task already submitted'
      });
    }

    // Calculate if submission is late
    const taskUnlock = await prisma.taskUnlock.findUnique({
      where: {
        enrollmentId_taskId: {
          enrollmentId: enrollment.id,
          taskId
        }
      }
    });

    const deadlineTime = new Date(taskUnlock.unlocksAt.getTime() + 24 * 60 * 60 * 1000);
    const isLate = new Date() > deadlineTime;

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        enrollmentId: enrollment.id,
        taskId,
        internId,
        githubRepoUrl,
        isLate,
        status: 'PENDING'
      },
      include: {
        task: {
          select: {
            title: true,
            taskNumber: true,
            points: true
          }
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: internId,
        title: '✅ Submission Received',
        message: `Your submission for "${task.title}" has been received ${isLate ? '(Late submission - 10% penalty)' : ''}. It will be reviewed by admin soon.`,
        type: isLate ? 'WARNING' : 'SUCCESS'
      }
    });

    // Notify admin
    const firstAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (firstAdmin) {
      await prisma.notification.create({
        data: {
          userId: firstAdmin.id,
          title: '📝 New Submission to Review',
          message: `${req.user.name} submitted Task ${task.taskNumber}: "${task.title}"`,
          type: 'INFO'
        }
      });
    }

    // Audit log
    await createAuditLog('TASK_SUBMITTED', internId, {
      submissionId: submission.id,
      taskId,
      taskNumber: task.taskNumber,
      isLate
    });

    res.status(201).json({
      success: true,
      message: 'Submission successful',
      data: {
        submission,
        isLate,
        penalty: isLate ? '10% score penalty applied' : null
      }
    });

  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enhanced progress endpoint
router.get('/progress/:internshipId', async (req, res) => {
  try {
    const { internshipId } = req.params;
    const internId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      },
      include: {
        internship: {
          select: {
            title: true,
            passPercentage: true,
            certificatePrice: true
          }
        },
        submissions: {
          include: {
            task: {
              select: {
                taskNumber: true,
                title: true,
                points: true
              }
            }
          },
          orderBy: {
            task: {
              taskNumber: 'asc'
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Get performance metrics
    const metrics = await scoreCalculationService.calculatePerformanceMetrics(
      enrollment.id
    );

    // Get next available task
    const allTasks = await prisma.task.findMany({
      where: { internshipId },
      orderBy: { taskNumber: 'asc' }
    });

    const submittedTaskIds = enrollment.submissions.map(s => s.taskId);
    const nextTask = allTasks.find(t => !submittedTaskIds.includes(t.id));

    let nextTaskInfo = null;
    if (nextTask) {
      const unlockStatus = await taskUnlockService.isTaskUnlocked(
        enrollment.id,
        nextTask.id
      );
      nextTaskInfo = {
        ...nextTask,
        unlockStatus
      };
    }

    res.json({
      success: true,
      data: {
        enrollment,
        performance: metrics,
        nextTask: nextTaskInfo,
        totalTasks: allTasks.length,
        remainingTasks: allTasks.length - enrollment.submissions.length
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get detailed task info with unlock status
router.get('/tasks/:taskId/details', async (req, res) => {
  try {
    const { taskId } = req.params;
    const internId = req.user.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        internship: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId: task.internshipId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this internship'
      });
    }

    // Get task access info
    const accessInfo = await taskUnlockService.getTaskAccessInfo(
      enrollment.id,
      taskId
    );

    res.json({
      success: true,
      data: {
        task,
        access: accessInfo
      }
    });

  } catch (error) {
    console.error('Get task details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});