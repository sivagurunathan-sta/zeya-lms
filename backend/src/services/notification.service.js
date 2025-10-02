const { prisma } = require('../config/database');

class NotificationService {
  static async create(userId, title, message, type = 'INFO') {
    try {
      return await prisma.notification.create({
        data: { userId, title, message, type }
      });
    } catch (error) {
      console.error('Notification creation error:', error);
    }
  }

  static async createBulk(userIds, title, message, type = 'INFO') {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title,
        message,
        type
      }));
      
      return await prisma.notification.createMany({
        data: notifications
      });
    } catch (error) {
      console.error('Bulk notification error:', error);
    }
  }
}

module.exports = NotificationService;