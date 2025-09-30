// Add to backend/src/routes/admin.js
const taskUnlockService = require('../services/taskUnlockService');
const scoreCalculationService = require('../services/scoreCalculationService');

// Replace the existing review submission route with this enhanced version:

router.put('/submissions/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score, adminFeedback, allowResubmission = true } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either APPROVED or REJECTED'
      });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        intern: { select: { name: true } },
        task: {
          select: {
            title: true,
            taskNumber: true,
            waitTimeHours: true,
            internshipId: true,
            points: true
          }
        },
        enrollment: {
          include: {
            internship: true
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

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        status,
        score: score ? parseFloat(score) : null,
        adminFeedback,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    if (status === 'APPROVED') {
      // Unlock next task automatically
      const unlockResult = await taskUnlockService.unlockNextTask(id);

      // Recalculate enrollment score
      await scoreCalculationService.updateEnrollmentScore(submission.enrollmentId);

      // Get updated performance metrics
      const metrics = await scoreCalculationService.calculatePerformanceMetrics(
        submission.enrollmentId
      );

      // Additional success notification
      await prisma.notification.create({
        data: {
          userId: submission.internId,
          title: '✅ Task Approved!',
          message: `Excellent work on "${submission.task.title}"! You scored ${score || 'N/A'}/100. ${unlockResult.nextTask ? `Next task unlocks at ${new Date(unlockResult.nextTask.unlocksAt).toLocaleString('en-IN')}` : 'All tasks completed!'}`,
          type: 'SUCCESS'
        }
      });

      // Audit log
      await createAuditLog('SUBMISSION_APPROVED', req.user.id, {
        submissionId: id,
        internId: submission.internId,
        taskId: submission.taskId,
        score,
        currentScore: metrics.finalScore
      });

      return res.json({
        success: true,
        message: 'Submission approved and next task unlocked',
        data: {
          submission: updatedSubmission,
          nextTask: unlockResult.nextTask || null,
          performanceMetrics: metrics,
          allTasksCompleted: !unlockResult.nextTask
        }
      });

    } else if (status === 'REJECTED') {
      // Create resubmission opportunity if allowed
      if (allowResubmission) {
        // Check max attempts
        const attemptCount = await prisma.submission.count({
          where: {
            enrollmentId: submission.enrollmentId,
            taskId: submission.taskId
          }
        });

        if (attemptCount < submission.task.maxAttempts) {
          await prisma.resubmissionOpportunity.create({
            data: {
              originalSubmissionId: id,
              enrollmentId: submission.enrollmentId,
              taskId: submission.taskId,
              allowedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              isUsed: false
            }
          });

          // Delete the rejected submission to allow resubmission
          await prisma.submission.delete({
            where: { id }
          });

          await prisma.notification.create({
            data: {
              userId: submission.internId,
              title: '❌ Submission Rejected',
              message: `Your submission for "${submission.task.title}" needs improvement. ${adminFeedback || ''} You have ${submission.task.maxAttempts - attemptCount} attempts remaining. Please resubmit within 7 days.`,
              type: 'WARNING'
            }
          });

          // Audit log
          await createAuditLog('SUBMISSION_REJECTED_RESUBMIT', req.user.id, {
            submissionId: id,
            internId: submission.internId,
            taskId: submission.taskId,
            attemptsRemaining: submission.task.maxAttempts - attemptCount
          });

          return res.json({
            success: true,
            message: 'Submission rejected. Resubmission opportunity created.',
            data: {
              canResubmit: true,
              attemptsRemaining: submission.task.maxAttempts - attemptCount,
              resubmitBefore: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }

      // No resubmission allowed or max attempts reached
      await prisma.notification.create({
        data: {
          userId: submission.internId,
          title: '❌ Submission Rejected',
          message: `Your submission for "${submission.task.title}" has been rejected. ${adminFeedback || ''} No resubmission allowed.`,
          type: 'ERROR'
        }
      });

      // Audit log
      await createAuditLog('SUBMISSION_REJECTED_FINAL', req.user.id, {
        submissionId: id,
        internId: submission.internId,
        taskId: submission.taskId
      });

      return res.json({
        success: true,
        message: 'Submission rejected',
        data: {
          submission: updatedSubmission,
          canResubmit: false
        }
      });
    }

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add new route for enrollment performance
router.get('/enrollments/:enrollmentId/performance', async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const metrics = await scoreCalculationService.calculatePerformanceMetrics(
      enrollmentId
    );

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        intern: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true
          }
        },
        internship: {
          select: {
            title: true,
            passPercentage: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        enrollment,
        performance: metrics
      }
    });

  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add leaderboard route
router.get('/leaderboard', async (req, res) => {
  try {
    const { internshipId, limit = 10 } = req.query;

    const leaderboard = await scoreCalculationService.getLeaderboard(
      internshipId || null,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: { leaderboard }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});