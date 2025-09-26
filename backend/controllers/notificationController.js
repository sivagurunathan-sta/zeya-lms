const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

// Get notifications for user
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead, type } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { userId: new ObjectId(req.user.id) };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    const notifications = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('notifications').countDocuments(filter);
    const unreadCount = await db.collection('notifications').countDocuments({
      userId: new ObjectId(req.user.id),
      isRead: false
    });

    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const result = await db.collection('notifications').updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.id),
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    const db = getDB();

    const result = await db.collection('notifications').updateMany(
      {
        userId: new ObjectId(req.user.id),
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    next(error);
  }
};

// Create notification (Admin only)
const createNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type = 'INFO', metadata = {} } = req.body;
    const db = getDB();

    // If userId is provided, send to specific user, otherwise send to all users
    let targetUsers = [];
    
    if (userId) {
      targetUsers = [new ObjectId(userId)];
    } else {
      // Send to all active users
      const users = await db.collection('users').find(
        { isActive: true },
        { projection: { _id: 1 } }
      ).toArray();
      targetUsers = users.map(user => user._id);
    }

    const notifications = targetUsers.map(targetUserId => ({
      userId: targetUserId,
      title,
      message,
      type,
      metadata,
      isRead: false,
      createdAt: new Date()
    }));

    const result = await db.collection('notifications').insertMany(notifications);

    // Emit real-time notifications if socket.io is available
    const io = req.app.get('io');
    if (io) {
      targetUsers.forEach((targetUserId, index) => {
        io.to(`user-${targetUserId.toString()}`).emit('notification', {
          id: Object.values(result.insertedIds)[index].toString(),
          ...notifications[index]
        });
      });
    }

    logger.info(`Created ${notifications.length} notifications: ${title}`);

    res.status(201).json({
      success: true,
      message: `Notification sent to ${notifications.length} users`,
      data: {
        count: notifications.length,
        type,
        title
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const result = await db.collection('notifications').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get notification statistics (Admin only)
const getNotificationStats = async (req, res, next) => {
  try {
    const db = getDB();

    const stats = await db.collection('notifications').aggregate([
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

    res.json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, read: 0, unread: 0 },
        byType,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create specific notification types
const createWelcomeNotification = async (userId, userName) => {
  const db = getDB();
  
  const notification = {
    userId: new ObjectId(userId),
    title: 'Welcome to Student LMS!',
    message: `Hi ${userName}! Welcome to our learning platform. Start exploring courses and begin your learning journey.`,
    type: 'WELCOME',
    metadata: { isWelcome: true },
    isRead: false,
    createdAt: new Date()
  };

  await db.collection('notifications').insertOne(notification);
  logger.info(`Welcome notification created for user ${userId}`);
};

const createEnrollmentNotification = async (userId, internshipTitle) => {
  const db = getDB();
  
  const notification = {
    userId: new ObjectId(userId),
    title: 'Enrollment Successful',
    message: `You have successfully enrolled in "${internshipTitle}". Complete your payment to access course materials.`,
    type: 'ENROLLMENT',
    metadata: { internshipTitle },
    isRead: false,
    createdAt: new Date()
  };

  await db.collection('notifications').insertOne(notification);
  logger.info(`Enrollment notification created for user ${userId}`);
};

const createPaymentNotification = async (userId, internshipTitle, amount) => {
  const db = getDB();
  
  const notification = {
    userId: new ObjectId(userId),
    title: 'Payment Successful',
    message: `Your payment of ₹${amount} for "${internshipTitle}" has been processed successfully. You can now access all course materials.`,
    type: 'PAYMENT',
    metadata: { internshipTitle, amount },
    isRead: false,
    createdAt: new Date()
  };

  await db.collection('notifications').insertOne(notification);
  logger.info(`Payment notification created for user ${userId}`);
};

const createTaskReviewNotification = async (userId, taskTitle, status, feedback = null) => {
  const db = getDB();
  
  const statusMessages = {
    APPROVED: 'Your task has been approved! Great work.',
    REJECTED: 'Your task needs improvement. Please check the feedback.',
    NEEDS_REVISION: 'Your task needs some revisions. Please review the feedback and resubmit.'
  };

  const notification = {
    userId: new ObjectId(userId),
    title: `Task ${status}`,
    message: `"${taskTitle}": ${statusMessages[status]}${feedback ? ` Feedback: ${feedback}` : ''}`,
    type: 'TASK_REVIEW',
    metadata: { taskTitle, status, feedback },
    isRead: false,
    createdAt: new Date()
  };

  await db.collection('notifications').insertOne(notification);
  logger.info(`Task review notification created for user ${userId}`);
};

const createCertificateNotification = async (userId, internshipTitle, certificateUrl) => {
  const db = getDB();
  
  const notification = {
    userId: new ObjectId(userId),
    title: 'Certificate Ready!',
    message: `Congratulations! Your certificate for "${internshipTitle}" is now ready for download.`,
    type: 'CERTIFICATE',
    metadata: { internshipTitle, certificateUrl },
    isRead: false,
    createdAt: new Date()
  };

  await db.collection('notifications').insertOne(notification);
  logger.info(`Certificate notification created for user ${userId}`);
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  getNotificationStats,
  // Helper functions for creating specific notification types
  createWelcomeNotification,
  createEnrollmentNotification,
  createPaymentNotification,
  createTaskReviewNotification,
  createCertificateNotification
};