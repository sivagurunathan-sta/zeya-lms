const { prisma } = require('../config/database');

class AuditService {
  static async log(action, userId, details, ipAddress) {
    try {
      return await prisma.auditLog.create({
        data: {
          action,
          userId,
          details,
          ipAddress: ipAddress || 'unknown'
        }
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }
}

module.exports = AuditService;