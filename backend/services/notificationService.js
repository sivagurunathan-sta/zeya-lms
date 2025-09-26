const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

class NotificationService {
  // Create notification
  async createNotification(userId, title, message, type = 'INFO', metadata = {}) {
    const db = getDB();

    const notificationDoc = {
      userId: new ObjectId(userId),
      title,
      message,
      type,
      metadata,
      isRead: false,
      createdAt: new Date(),
      readAt: null
    };

    const result = await db.collection('notifications').insertOne(notificationDoc);

    // Emit real-time notification if socket.io is available
    const io = global.io;
    if (io) {
      io.to(`user-${userId}`).emit('notification', {
        id: result.insertedId.toString(),
        ...notificationDoc
      });
    }

    logger.info(`Notification created for user ${userId}: ${title}`);

    return {
      ...notificationDoc,
      id: result.insertedId.toString()
    };
  }

  // Get notifications for user
  async getUserNotifications(userId, filters = {}, pagination = {}) {
    const db = getDB();
    const { isRead, type } = filters;
    const { page = 1, limit = 20 } = pagination;

    const filter = { userId: new ObjectId(userId) };
    if (isRead !== undefined) filter.isRead = isRead;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('notifications').countDocuments(filter);
    const unreadCount = await db.collection('notifications').countDocuments({
      userId: new ObjectId(userId),
      isRead: false
    });

    return {
      notifications: notifications.map(notification => ({
        ...notification,
        id: notification._id.toString()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    };
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const db = getDB();

    const result = await db.collection('notifications').findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        userId: new ObjectId(userId),
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Notification not found or already read');
    }

    return {
      ...result.value,
      id: result.value._id.toString()
    };
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    const db = getDB();

    const result = await db.collection('notifications').updateMany(
      {
        userId: new ObjectId(userId),
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} notifications marked as read`
    };
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const db = getDB();

    const result = await db.collection('notifications').deleteOne({
      _id: new ObjectId(notificationId),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }

    return { message: 'Notification deleted successfully' };
  }

  // Create welcome notification
  async createWelcomeNotification(userId, userName) {
    return this.createNotification(
      userId,
      'Welcome to Student LMS!',
      `Hi ${userName}! Welcome to our learning platform. Start exploring courses and begin your learning journey.`,
      'WELCOME',
      { isWelcome: true }
    );
  }

  // Create enrollment notification
  async createEnrollmentNotification(userId, internshipTitle) {
    return this.createNotification(
      userId,
      'Enrollment Successful',
      `You have successfully enrolled in "${internshipTitle}". Complete your payment to access course materials.`,
      'ENROLLMENT',
      { internshipTitle }
    );
  }

  // Create payment notification
  async createPaymentNotification(userId, internshipTitle, amount) {
    return this.createNotification(
      userId,
      'Payment Successful',
      `Your payment of ₹${amount} for "${internshipTitle}" has been processed successfully. You can now access all course materials.`,
      'PAYMENT',
      { internshipTitle, amount }
    );
  }

  // Create task submission notification
  async createTaskSubmissionNotification(userId, taskTitle) {
    return this.createNotification(
      userId,
      'Task Submitted',
      `Your submission for "${taskTitle}" has been received and is under review.`,
      'TASK_SUBMISSION',
      { taskTitle }
    );
  }

  // Create task review notification
  async createTaskReviewNotification(userId, taskTitle, status, feedback = null) {
    const statusMessages = {
      APPROVED: 'Your task has been approved! Great work.',
      REJECTED: 'Your task needs improvement. Please check the feedback.',
      NEEDS_REVISION: 'Your task needs some revisions. Please review the feedback and resubmit.'
    };

    return this.createNotification(
      userId,
      `Task ${status}`,
      `"${taskTitle}": ${statusMessages[status]}${feedback ? ` Feedback: ${feedback}` : ''}`,
      'TASK_REVIEW',
      { taskTitle, status, feedback }
    );
  }

  // Create certificate notification
  async createCertificateNotification(userId, internshipTitle, certificateUrl) {
    return this.createNotification(
      userId,
      'Certificate Ready!',
      `Congratulations! Your certificate for "${internshipTitle}" is now ready for download.`,
      'CERTIFICATE',
      { internshipTitle, certificateUrl }
    );
  }

  // Create task reminder notification
  async createTaskReminderNotification(userId, taskTitle, dueDate) {
    const daysLeft = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    return this.createNotification(
      userId,
      'Task Reminder',
      `"${taskTitle}" is due in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Don't forget to submit your work!`,
      'REMINDER',
      { taskTitle, dueDate, daysLeft }
    );
  }

  // Create deadline notification
  async createDeadlineNotification(userId, taskTitle) {
    return this.createNotification(
      userId,
      'Task Deadline Passed',
      `The deadline for "${taskTitle}" has passed. You can still submit, but it may affect your score.`,
      'DEADLINE',
      { taskTitle }
    );
  }

  // Create system notification
  async createSystemNotification(userId, title, message, metadata = {}) {
    return this.createNotification(
      userId,
      title,
      message,
      'SYSTEM',
      metadata
    );
  }

  // Create bulk notifications
  async createBulkNotifications(userIds, title, message, type = 'INFO', metadata = {}) {
    const db = getDB();
    
    const notifications = userIds.map(userId => ({
      userId: new ObjectId(userId),
      title,
      message,
      type,
      metadata,
      isRead: false,
      createdAt: new Date(),
      readAt: null
    }));

    const result = await db.collection('notifications').insertMany(notifications);

    // Emit real-time notifications
    const io = global.io;
    if (io) {
      userIds.forEach((userId, index) => {
        io.to(`user-${userId}`).emit('notification', {
          id: result.insertedIds[index].toString(),
          ...notifications[index]
        });
      });
    }

    logger.info(`Bulk notifications created for ${userIds.length} users: ${title}`);

    return {
      created: result.insertedCount,
      notifications: Object.values(result.insertedIds).map((id, index) => ({
        id: id.toString(),
        ...notifications[index]
      }))
    };
  }

  // Send notifications to all students in an internship
  async notifyInternshipStudents(internshipId, title, message, type = 'INFO', metadata = {}) {
    const db = getDB();

    // Get all enrolled students
    const enrollments = await db.collection('enrollments').find({
      internshipId: new ObjectId(internshipId),
      status: { $in: ['ACTIVE', 'COMPLETED'] }
    }).toArray();

    const userIds = enrollments.map(enrollment => enrollment.studentId.toString());

    if (userIds.length === 0) {
      return { created: 0, notifications: [] };
    }

    return this.createBulkNotifications(userIds, title, message, type, {
      ...metadata,
      internshipId
    });
  }

  // Send notifications to all active students
  async notifyAllStudents(title, message, type = 'INFO', metadata = {}) {
    const db = getDB();

    const activeStudents = await db.collection('users').find({
      role: 'STUDENT',
      isActive: true
    }).toArray();

    const userIds = activeStudents.map(student => student._id.toString());

    return this.createBulkNotifications(userIds, title, message, type, metadata);
  }

  // Get notification statistics
  async getNotificationStats(userId = null) {
    const db = getDB();

    const filter = userId ? { userId: new ObjectId(userId) } : {};

    const stats = await db.collection('notifications').aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          read: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    // Notifications by type
    const byType = await db.collection('notifications').aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Recent activity (last 7 days)
    const recentActivity = await db.collection('notifications').aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]).toArray();

    return {
      overview: stats[0] || { total: 0, read: 0, unread: 0 },
      byType,
      recentActivity
    };
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysToKeep = 90) {
    const db = getDB();
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await db.collection('notifications').deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });

    logger.info(`Cleaned up ${result.deletedCount} old notifications`);

    return {
      deletedCount: result.deletedCount,
      cutoffDate
    };
  }

  // Get notification preferences for user
  async getNotificationPreferences(userId) {
    const db = getDB();

    const preferences = await db.collection('notificationPreferences').findOne({
      userId: new ObjectId(userId)
    });

    return preferences || {
      userId,
      email: true,
      sms: true,
      push: true,
      types: {
        ENROLLMENT: true,
        PAYMENT: true,
        TASK_REVIEW: true,
        TASK_SUBMISSION: true,
        CERTIFICATE: true,
        REMINDER: true,
        SYSTEM: true,
        WELCOME: true
      }
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    const db = getDB();

    const result = await db.collection('notificationPreferences').findOneAndUpdate(
      { userId: new ObjectId(userId) },
      {
        $set: {
          ...preferences,
          userId: new ObjectId(userId),
          updatedAt: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    return {
      ...result.value,
      id: result.value._id.toString()
    };
  }

  // Check if user wants notifications of specific type
  async shouldNotifyUser(userId, notificationType) {
    const preferences = await this.getNotificationPreferences(userId);
    return preferences.types[notificationType] !== false;
  }

  // Schedule notification for later delivery
  async scheduleNotification(userId, title, message, scheduleTime, type = 'INFO', metadata = {}) {
    const db = getDB();

    const scheduledNotification = {
      userId: new ObjectId(userId),
      title,
      message,
      type,
      metadata,
      scheduleTime: new Date(scheduleTime),
      status: 'scheduled',
      attempts: 0,
      createdAt: new Date()
    };

    const result = await db.collection('scheduledNotifications').insertOne(scheduledNotification);

    logger.info(`Notification scheduled for ${scheduleTime}: ${result.insertedId}`);

    return {
      id: result.insertedId.toString(),
      ...scheduledNotification
    };
  }

  // Process scheduled notifications (to be called by cron job)
  async processScheduledNotifications() {
    const db = getDB();
    const now = new Date();

    const scheduledNotifications = await db.collection('scheduledNotifications').find({
      status: 'scheduled',
      scheduleTime: { $lte: now },
      attempts: { $lt: 3 }
    }).toArray();

    const results = [];

    for (const scheduled of scheduledNotifications) {
      try {
        // Check if user still wants this type of notification
        const shouldNotify = await this.shouldNotifyUser(
          scheduled.userId.toString(),
          scheduled.type
        );

        if (shouldNotify) {
          await this.createNotification(
            scheduled.userId.toString(),
            scheduled.title,
            scheduled.message,
            scheduled.type,
            scheduled.metadata
          );
        }

        // Mark as sent
        await db.collection('scheduledNotifications').updateOne(
          { _id: scheduled._id },
          {
            $set: {
              status: 'sent',
              sentAt: now,
              attempts: scheduled.attempts + 1
            }
          }
        );

        results.push({
          id: scheduled._id.toString(),
          success: true,
          sent: shouldNotify
        });
      } catch (error) {
        // Mark as failed or retry
        const newStatus = scheduled.attempts + 1 >= 3 ? 'failed' : 'scheduled';
        
        await db.collection('scheduledNotifications').updateOne(
          { _id: scheduled._id },
          {
            $set: {
              status: newStatus,
              attempts: scheduled.attempts + 1,
              lastError: error.message,
              lastAttemptAt: now
            }
          }
        );

        results.push({
          id: scheduled._id.toString(),
          success: false,
          error: error.message
        });

        logger.error(`Failed to process scheduled notification ${scheduled._id}:`, error);
      }
    }

    return results;
  }
}

module.exports = new NotificationService();