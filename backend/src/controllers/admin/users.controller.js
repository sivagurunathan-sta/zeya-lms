// src/controllers/admin/users.controller.js
const { prisma } = require('../../config/database');
const bcrypt = require('bcryptjs');
const NotificationService = require('../../services/notification.service');
const AuditService = require('../../services/audit.service');

class UsersController {
  
  // Get all users with filters and pagination
  static async getAllUsers(req, res) {
    try {
      const { search, status, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        role: 'INTERN',
        ...(status && status !== 'all' && {
          isActive: status === 'active'
        }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { userId: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            enrollments: {
              include: {
                internship: {
                  select: { title: true, coverImage: true }
                },
                submissions: {
                  where: { status: 'APPROVED' }
                }
              }
            },
            payments: {
              select: {
                amount: true,
                paymentStatus: true,
                paymentType: true,
                createdAt: true,
                transactionId: true
              }
            },
            chatPermission: true,
            _count: {
              select: {
                enrollments: true,
                submissions: true,
                payments: true,
                notifications: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      // Enrich user data with computed fields
      const enrichedUsers = users.map(user => {
        const completedCourses = user.enrollments.filter(e => e.isCompleted).length;
        const totalSpent = user.payments
          .filter(p => p.paymentStatus === 'VERIFIED')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        return {
          ...user,
          status: user.isActive ? 'active' : 'revoked',
          lastActive: user.updatedAt,
          chatEnabled: user.chatPermission?.isEnabled || false,
          certificateSubmitted: user.chatPermission?.isEnabled || false,
          stats: {
            totalEnrollments: user._count.enrollments,
            coursesCompleted: completedCourses,
            certificatesEarned: user.enrollments.filter(e => e.certificatePurchased).length,
            totalSpent,
            averageScore: user.enrollments.length > 0
              ? user.enrollments.reduce((sum, e) => sum + (e.finalScore || 0), 0) / user.enrollments.length
              : 0,
            currentStreak: 0
          }
        };
      });

      res.json({
        success: true,
        data: {
          users: enrichedUsers,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

  // Get single user complete profile
  static async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              internship: {
                select: {
                  id: true,
                  title: true,
                  coverImage: true,
                  durationDays: true
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
                orderBy: { submissionDate: 'desc' }
              }
            }
          },
          payments: {
            include: {
              internship: {
                select: { title: true }
              },
              paidTask: {
                select: { title: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          chatPermission: true,
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Format response with all details
      const formattedUser = {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone || 'Not provided',
        status: user.isActive ? 'active' : 'revoked',
        isActive: user.isActive,
        joinedDate: user.createdAt,
        lastActive: user.updatedAt,
        chatEnabled: user.chatPermission?.isEnabled || false,
        certificateSubmitted: user.chatPermission?.isEnabled || false,
        
        enrollments: user.enrollments.map(enrollment => ({
          id: enrollment.id,
          courseName: enrollment.internship.title,
          status: enrollment.isCompleted ? 'completed' : 'in_progress',
          progress: enrollment.finalScore || 0,
          startDate: enrollment.enrollmentDate,
          completedDate: enrollment.completionDate,
          tasksCompleted: enrollment.submissions.filter(s => s.status === 'APPROVED').length,
          totalTasks: enrollment.internship.durationDays,
          currentDay: enrollment.submissions.length
        })),
        
        completedCourses: user.enrollments
          .filter(e => e.isCompleted)
          .map(e => ({
            id: e.id,
            name: e.internship.title,
            completedDate: e.completionDate,
            score: e.finalScore || 0,
            certificateIssued: e.certificatePurchased
          })),
        
        certificates: user.enrollments
          .filter(e => e.certificatePurchased)
          .map(e => ({
            id: e.id,
            courseName: e.internship.title,
            issueDate: e.certificateIssuedAt,
            certificateNumber: e.certificateNumber,
            downloadUrl: e.certificateUrl
          })),
        
        payments: user.payments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount),
          type: p.paymentType,
          status: p.paymentStatus.toLowerCase(),
          date: p.createdAt,
          transactionId: p.transactionId || p.verifiedTransactionId
        })),
        
        submissions: user.enrollments.flatMap(e =>
          e.submissions.slice(0, 5).map(s => ({
            id: s.id,
            taskNumber: s.task.taskNumber,
            taskName: s.task.title,
            status: s.status.toLowerCase(),
            submittedDate: s.submissionDate,
            score: s.score,
            feedback: s.adminFeedback
          }))
        ),
        
        stats: {
          totalEnrollments: user.enrollments.length,
          coursesCompleted: user.enrollments.filter(e => e.isCompleted).length,
          certificatesEarned: user.enrollments.filter(e => e.certificatePurchased).length,
          totalSpent: user.payments
            .filter(p => p.paymentStatus === 'VERIFIED')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0),
          averageScore: user.enrollments.length > 0
            ? user.enrollments.reduce((sum, e) => sum + (e.finalScore || 0), 0) / user.enrollments.length
            : 0,
          currentStreak: 0
        }
      };

      res.json({
        success: true,
        data: formattedUser
      });

    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: error.message
      });
    }
  }

  // Bulk add users
  static async bulkAddUsers(req, res) {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'User IDs array is required'
        });
      }

      const createdUsers = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          const trimmedId = userId.trim();
          if (!trimmedId) continue;

          // Check if user already exists
          const existing = await prisma.user.findUnique({
            where: { userId: trimmedId }
          });

          if (existing) {
            errors.push({ userId: trimmedId, error: 'User already exists' });
            continue;
          }

          // Generate email from userId
          const email = `${trimmedId.toLowerCase()}@lms.com`;
          const name = `User ${trimmedId}`;

          // Hash default password (same as userId in lowercase)
          const hashedPassword = await bcrypt.hash(trimmedId.toLowerCase(), 10);

          // Create user
          const user = await prisma.user.create({
            data: {
              userId: trimmedId,
              name,
              email,
              role: 'INTERN',
              passwordHash: hashedPassword,
              isActive: true
            }
          });

          // Create welcome notification
          await NotificationService.create(
            user.id,
            'Welcome to LMS!',
            `Your account has been created. Login with User ID: ${trimmedId} and password: ${trimmedId.toLowerCase()}`,
            'INFO'
          );

          createdUsers.push(user);

        } catch (error) {
          errors.push({ userId, error: error.message });
        }
      }

      // Audit log
      await AuditService.log(
        'BULK_USER_CREATION',
        req.user.id,
        `Created ${createdUsers.length} users, ${errors.length} errors`,
        req.ip
      );

      res.json({
        success: true,
        message: `Created ${createdUsers.length} users successfully`,
        data: {
          created: createdUsers.map(u => ({
            id: u.id,
            userId: u.userId,
            email: u.email,
            name: u.name,
            defaultPassword: u.userId.toLowerCase()
          })),
          errors
        }
      });

    } catch (error) {
      console.error('Bulk add users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk add users',
        error: error.message
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { name, email, phone } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          phone,
          updatedAt: new Date()
        }
      });

      // Audit log
      await AuditService.log(
        'USER_UPDATED',
        req.user.id,
        `Updated user ${user.userId}: ${user.name}`,
        req.ip
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  // Revoke user access
  static async revokeAccess(req, res) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Send notification
      await NotificationService.create(
        user.id,
        'Account Access Revoked',
        'Your LMS access has been revoked. Please contact admin for more information.',
        'ERROR'
      );

      // Audit log
      await AuditService.log(
        'USER_REVOKED',
        req.user.id,
        `Revoked access for user ${user.userId}: ${user.name}`,
        req.ip
      );

      res.json({
        success: true,
        message: 'User access revoked successfully',
        data: user
      });

    } catch (error) {
      console.error('Revoke user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke user access',
        error: error.message
      });
    }
  }

  // Restore user access
  static async restoreAccess(req, res) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          updatedAt: new Date()
        }
      });

      // Send notification
      await NotificationService.create(
        user.id,
        'Account Access Restored',
        'Your LMS access has been restored. You can now login and continue your courses.',
        'SUCCESS'
      );

      // Audit log
      await AuditService.log(
        'USER_RESTORED',
        req.user.id,
        `Restored access for user ${user.userId}: ${user.name}`,
        req.ip
      );

      res.json({
        success: true,
        message: 'User access restored successfully',
        data: user
      });

    } catch (error) {
      console.error('Restore user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore user access',
        error: error.message
      });
    }
  }

  // Verify certificate and enable chat
  static async verifyCertificate(req, res) {
    try {
      const { userId } = req.params;
      const { approved, notes } = req.body;

      if (approved) {
        // Enable chat permission
        const permission = await prisma.chatPermission.upsert({
          where: { userId },
          update: {
            isEnabled: true,
            enabledAt: new Date(),
            enabledBy: req.user.id
          },
          create: {
            userId,
            isEnabled: true,
            enabledAt: new Date(),
            enabledBy: req.user.id
          }
        });

        // Send success notification
        await NotificationService.create(
          userId,
          'Chat Access Enabled!',
          'Your internship certificate has been verified. You now have access to private chat with admin.',
          'SUCCESS'
        );

        // Audit log
        await AuditService.log(
          'CERTIFICATE_VERIFIED',
          req.user.id,
          `Verified certificate and enabled chat for user ${userId}. Notes: ${notes || 'None'}`,
          req.ip
        );

        res.json({
          success: true,
          message: 'Certificate verified and chat enabled',
          data: permission
        });
      } else {
        // Send rejection notification
        await NotificationService.create(
          userId,
          'Certificate Verification Failed',
          `Your certificate verification was rejected. Reason: ${notes || 'Please resubmit a valid internship certificate.'}`,
          'WARNING'
        );

        // Audit log
        await AuditService.log(
          'CERTIFICATE_REJECTED',
          req.user.id,
          `Rejected certificate for user ${userId}. Reason: ${notes || 'Not specified'}`,
          req.ip
        );

        res.json({
          success: true,
          message: 'Certificate rejected',
          data: { approved: false, reason: notes }
        });
      }

    } catch (error) {
      console.error('Verify certificate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify certificate',
        error: error.message
      });
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      const [
        totalUsers,
        activeUsers,
        revokedUsers,
        chatEnabledUsers,
        totalEnrollments,
        completedCourses,
        totalRevenue
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'INTERN' } }),
        prisma.user.count({ where: { role: 'INTERN', isActive: true } }),
        prisma.user.count({ where: { role: 'INTERN', isActive: false } }),
        prisma.chatPermission.count({ where: { isEnabled: true } }),
        prisma.enrollment.count(),
        prisma.enrollment.count({ where: { isCompleted: true } }),
        prisma.payment.aggregate({
          where: { paymentStatus: 'VERIFIED' },
          _sum: { amount: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          revokedUsers,
          chatEnabledUsers,
          totalEnrollments,
          completedCourses,
          totalRevenue: parseFloat(totalRevenue._sum.amount || 0),
          completionRate: totalEnrollments > 0 
            ? ((completedCourses / totalEnrollments) * 100).toFixed(2) 
            : 0
        }
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats',
        error: error.message
      });
    }
  }
}

module.exports = UsersController;