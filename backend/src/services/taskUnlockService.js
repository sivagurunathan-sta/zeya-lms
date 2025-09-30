// src/services/taskUnlockService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TaskUnlockService {
  /**
   * Automatically unlock next task after approval
   * Handles wait time and notification
   */
  async unlockNextTask(submissionId) {
    try {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          task: {
            include: {
              internship: true
            }
          },
          enrollment: {
            include: {
              intern: true
            }
          }
        }
      });

      if (!submission || submission.status !== 'APPROVED') {
        return { success: false, message: 'Invalid submission or not approved' };
      }

      // Find next task
      const nextTask = await prisma.task.findFirst({
        where: {
          internshipId: submission.task.internshipId,
          taskNumber: submission.task.taskNumber + 1
        }
      });

      if (!nextTask) {
        // No more tasks - check for completion
        await this.handleInternshipCompletion(submission.enrollmentId);
        return { success: true, message: 'All tasks completed!' };
      }

      // Calculate unlock time
      const waitHours = submission.task.waitTimeHours || 12;
      const unlockTime = new Date(Date.now() + waitHours * 60 * 60 * 1000);

      // Create or update task unlock record
      await prisma.taskUnlock.upsert({
        where: {
          enrollmentId_taskId: {
            enrollmentId: submission.enrollmentId,
            taskId: nextTask.id
          }
        },
        update: {
          unlocksAt: unlockTime,
          isUnlocked: false
        },
        create: {
          enrollmentId: submission.enrollmentId,
          taskId: nextTask.id,
          unlocksAt: unlockTime,
          isUnlocked: false
        }
      });

      // Schedule auto-unlock
      this.scheduleTaskUnlock(submission.enrollmentId, nextTask.id, unlockTime);

      // Notify user
      await prisma.notification.create({
        data: {
          userId: submission.internId,
          title: 'Next Task Unlocking Soon',
          message: `Great work on "${submission.task.title}"! Task ${nextTask.taskNumber}: "${nextTask.title}" will unlock at ${unlockTime.toLocaleString('en-IN')}`,
          type: 'SUCCESS'
        }
      });

      return {
        success: true,
        nextTask: {
          id: nextTask.id,
          title: nextTask.title,
          taskNumber: nextTask.taskNumber,
          unlocksAt: unlockTime
        }
      };

    } catch (error) {
      console.error('Unlock next task error:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic task unlock
   */
  scheduleTaskUnlock(enrollmentId, taskId, unlockTime) {
    const delay = unlockTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          // Mark task as unlocked
          await prisma.taskUnlock.update({
            where: {
              enrollmentId_taskId: {
                enrollmentId,
                taskId
              }
            },
            data: {
              isUnlocked: true
            }
          });

          // Get task and enrollment details
          const taskUnlock = await prisma.taskUnlock.findUnique({
            where: {
              enrollmentId_taskId: { enrollmentId, taskId }
            },
            include: {
              task: true,
              enrollment: {
                include: {
                  intern: true
                }
              }
            }
          });

          // Notify user
          await prisma.notification.create({
            data: {
              userId: taskUnlock.enrollment.internId,
              title: '🔓 New Task Unlocked!',
              message: `Task ${taskUnlock.task.taskNumber}: "${taskUnlock.task.title}" is now available. Start working on it within 24 hours!`,
              type: 'SUCCESS'
            }
          });

          console.log(`Task ${taskId} unlocked for enrollment ${enrollmentId}`);
        } catch (error) {
          console.error('Auto-unlock error:', error);
        }
      }, delay);
    }
  }

  /**
   * Check if task is unlocked for user
   */
  async isTaskUnlocked(enrollmentId, taskId) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      });

      // First task is always unlocked
      if (task.taskNumber === 1) {
        return { unlocked: true, reason: 'First task' };
      }

      // Check if task unlock record exists
      const taskUnlock = await prisma.taskUnlock.findUnique({
        where: {
          enrollmentId_taskId: { enrollmentId, taskId }
        }
      });

      if (!taskUnlock) {
        return { unlocked: false, reason: 'Previous task not completed' };
      }

      // Check if unlock time has passed
      if (new Date() < taskUnlock.unlocksAt) {
        return {
          unlocked: false,
          reason: 'Wait time not completed',
          unlocksAt: taskUnlock.unlocksAt
        };
      }

      // Update unlock status if not already done
      if (!taskUnlock.isUnlocked) {
        await prisma.taskUnlock.update({
          where: {
            enrollmentId_taskId: { enrollmentId, taskId }
          },
          data: { isUnlocked: true }
        });
      }

      return { unlocked: true, reason: 'Unlocked' };

    } catch (error) {
      console.error('Check task unlock error:', error);
      return { unlocked: false, reason: 'Error checking unlock status' };
    }
  }

  /**
   * Handle internship completion
   */
  async handleInternshipCompletion(enrollmentId) {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          submissions: {
            where: { status: 'APPROVED' },
            include: { task: true }
          },
          internship: true,
          intern: true
        }
      });

      // Calculate final score
      const totalPoints = enrollment.submissions.reduce(
        (sum, sub) => sum + (sub.task.points || 100), 0
      );
      const earnedPoints = enrollment.submissions.reduce(
        (sum, sub) => sum + (sub.score || 0), 0
      );
      
      const finalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const passPercentage = enrollment.internship.passPercentage || 75;
      const isEligible = finalScore >= passPercentage;

      // Update enrollment
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          isCompleted: true,
          completionDate: new Date(),
          finalScore: Math.round(finalScore * 100) / 100,
          certificateEligible: isEligible
        }
      });

      // Create completion notification
      const message = isEligible
        ? `🎉 Congratulations! You've completed "${enrollment.internship.title}" with ${finalScore.toFixed(1)}% score. You're eligible for the certificate. Proceed to payment section to claim your certificate for ₹${enrollment.internship.certificatePrice}.`
        : `You've completed all tasks with ${finalScore.toFixed(1)}% score, but you need ${passPercentage}% to be eligible for the certificate. Keep improving!`;

      await prisma.notification.create({
        data: {
          userId: enrollment.internId,
          title: isEligible ? '🎉 Internship Completed!' : '📋 Internship Completed',
          message,
          type: isEligible ? 'SUCCESS' : 'WARNING'
        }
      });

      return {
        completed: true,
        finalScore,
        certificateEligible: isEligible
      };

    } catch (error) {
      console.error('Handle completion error:', error);
      throw error;
    }
  }

  /**
   * Get task access info for intern
   */
  async getTaskAccessInfo(enrollmentId, taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return { error: 'Task not found' };
    }

    // Check if already submitted
    const submission = await prisma.submission.findUnique({
      where: {
        enrollmentId_taskId: { enrollmentId, taskId }
      }
    });

    if (submission) {
      return {
        submitted: true,
        submission,
        canResubmit: submission.status === 'REJECTED'
      };
    }

    // Check unlock status
    const unlockStatus = await this.isTaskUnlocked(enrollmentId, taskId);

    return {
      submitted: false,
      ...unlockStatus,
      task: {
        id: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        description: task.description,
        points: task.points
      }
    };
  }

  /**
   * Initialize task unlocks for new enrollment
   */
  async initializeEnrollmentTasks(enrollmentId, internshipId) {
    try {
      // Get first task
      const firstTask = await prisma.task.findFirst({
        where: {
          internshipId,
          taskNumber: 1
        }
      });

      if (!firstTask) {
        throw new Error('No tasks found for internship');
      }

      // Unlock first task immediately
      await prisma.taskUnlock.create({
        data: {
          enrollmentId,
          taskId: firstTask.id,
          unlocksAt: new Date(),
          isUnlocked: true
        }
      });

      // Notify about first task
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { intern: true }
      });

      await prisma.notification.create({
        data: {
          userId: enrollment.internId,
          title: '🚀 Your Journey Begins!',
          message: `Your first task "${firstTask.title}" is now available. You have 24 hours to submit it. Good luck!`,
          type: 'INFO'
        }
      });

      return { success: true, firstTask };

    } catch (error) {
      console.error('Initialize tasks error:', error);
      throw error;
    }
  }
}

module.exports = new TaskUnlockService();