// backend/src/routes/admin-enhanced.js - Enhanced User Management Routes
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { adminOnly } = require('../middleware/auth');
const { createAuditLog } = require('../utils/helpers');

const router = express.Router();
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(adminOnly);

// ==========================
// BULK USER OPERATIONS
// ==========================

/**
 * Add multiple users at once
 * POST /api/admin/users/bulk-add
 * Body: { users: [{name, email}, ...] }
 */
router.post('/users/bulk-add-enhanced', async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Users array is required and cannot be empty'
      });
    }

    const results = [];
    const errors = [];
    const bcrypt = require('bcryptjs');

    for (const userData of users) {
      try {
        const { name, email } = userData;

        if (!name || !email) {
          errors.push({ 
            userData, 
            error: 'Name and email are required' 
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: { email: email.toLowerCase() }
        });

        if (existingUser) {
          errors.push({ 
            userData, 
            error: 'Email already exists',
            existingUserId: existingUser.userId
          });
          continue;
        }

        // Generate unique user ID
        const userId = await generateUserId();
        const tempPassword = userId.toLowerCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user
        const newUser = await prisma.user.create({
          data: {
            userId,
            name,
            email: email.toLowerCase(),
            role: 'INTERN',
            passwordHash: hashedPassword,
            isActive: true
          }
        });

        // Create welcome notification
        await prisma.notification.create({
          data: {
            userId: newUser.id,
            title: 'Welcome to LMS Platform',
            message: `Your account has been created. Login ID: ${userId}, Password: ${tempPassword}. Please change your password after first login.`,
            type: 'INFO'
          }
        });

        results.push({
          user: {
            id: newUser.id,
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email
          },
          credentials: {
            userId,
            temporaryPassword: tempPassword
          }
        });

        // Audit log
        await createAuditLog('USER_CREATED', req.user.id, {
          targetUserId: newUser.id,
          userName: name,
          email,
          createdInBulk: true
        });

      } catch (error) {
        console.error('Error creating user:', error);
        errors.push({ 
          userData, 
          error: error.message 
        });
      }
    }

    // Overall audit log for bulk operation
    await createAuditLog('BULK_USER_CREATION', req.user.id, {
      totalAttempted: users.length,
      successful: results.length,
      failed: errors.length
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${results.length} out of ${users.length} users`,
      data: {
        results,
        errors,
        summary: {
          total: users.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Bulk add users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get complete user list with filtering, searching, and pagination
 * GET /api/admin/users/list
 */
router.get('/users/list', async (req, res) => {
  try {
    const { 
      role, 
      status, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Apply filters
    if (role && role !== 'all') {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with counts
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              payments: true,
              submissions: true,
              notifications: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Enhance user data with additional info
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        // Get latest enrollment
        const latestEnrollment = await prisma.enrollment.findFirst({
          where: { internId: user.id },
          orderBy: { createdAt: 'desc' },
          include: {
            internship: {
              select: { title: true }
            }
          }
        });

        // Get chat permission status
        const chatPermission = await prisma.chatPermission.findUnique({
          where: { userId: user.id }
        });

        // Get total spent
        const paymentsSum = await prisma.payment.aggregate({
          where: {
            internId: user.id,
            paymentStatus: 'VERIFIED'
          },
          _sum: {
            amount: true
          }
        });

        return {
          ...user,
          latestEnrollment: latestEnrollment ? {
            internshipTitle: latestEnrollment.internship.title,
            enrolledAt: latestEnrollment.enrollmentDate,
            isCompleted: latestEnrollment.isCompleted
          } : null,
          chatEnabled: chatPermission?.isEnabled || false,
          totalSpent: paymentsSum._sum.amount || 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: enhancedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Get complete user profile with full history
 * GET /api/admin/users/:id/complete-profile
 */
router.get('/users/:id/complete-profile', async (req, res) => {
  try {
    const { id } = req.params;

    // Get user with all related data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        chatPermission: true,
        enrollments: {
          include: {
            internship: {
              select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
                durationDays: true,
                certificatePrice: true
              }
            },
            submissions: {
              include: {
                task: {
                  select: {
                    id: true,
                    taskNumber: true,
                    title: true,
                    points: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { enrollmentDate: 'desc' }
        },
        payments: {
          include: {
            internship: { select: { title: true } },
            paidTask: { select: { title: true } },
            verifier: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        certificateValidations: {
          orderBy: { submittedAt: 'desc' }
        },
        assignedPrivateTasks: {
          include: {
            assignedByUser: { select: { name: true } },
            submission: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate comprehensive statistics
    const totalEnrollments = user.enrollments.length;
    const completedCourses = user.enrollments.filter(e => e.isCompleted).length;
    const inProgressCourses = totalEnrollments - completedCourses;
    const certificates = user.enrollments.filter(e => e.certificatePurchased).length;
    
    const totalSpent = user.payments
      .filter(p => p.paymentStatus === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount, 0);

    // Task statistics
    const taskStats = {
      total: 0,
      completed: 0,
      pending: 0,
      rejected: 0,
      approved: 0
    };

    let totalScore = 0;
    let scoredTasks = 0;

    user.enrollments.forEach(enrollment => {
      enrollment.submissions.forEach(submission => {
        taskStats.total++;
        if (submission.status === 'APPROVED') {
          taskStats.approved++;
          taskStats.completed++;
        } else if (submission.status === 'REJECTED') {
          taskStats.rejected++;
        } else {
          taskStats.pending++;
        }

        if (submission.score) {
          totalScore += submission.score;
          scoredTasks++;
        }
      });
    });

    const averageScore = scoredTasks > 0 ? Math.round(totalScore / scoredTasks) : 0;

    // Private tasks statistics
    const privateTasks = {
      total: user.assignedPrivateTasks.length,
      completed: user.assignedPrivateTasks.filter(t => t.status === 'COMPLETED').length,
      pending: user.assignedPrivateTasks.filter(t => t.status === 'ASSIGNED').length,
      submitted: user.assignedPrivateTasks.filter(t => t.status === 'SUBMITTED').length
    };

    // Certificate validations summary
    const certificateValidationStats = {
      total: user.certificateValidations.length,
      approved: user.certificateValidations.filter(v => v.status === 'APPROVED').length,
      pending: user.certificateValidations.filter(v => v.status === 'PENDING').length,
      rejected: user.certificateValidations.filter(v => v.status === 'REJECTED').length
    };

    // Activity timeline
    const activityTimeline = [];

    // Add enrollments to timeline
    user.enrollments.forEach(enrollment => {
      activityTimeline.push({
        type: 'enrollment',
        date: enrollment.enrollmentDate,
        description: `Enrolled in ${enrollment.internship.title}`
      });
      if (enrollment.isCompleted) {
        activityTimeline.push({
          type: 'completion',
          date: enrollment.completionDate,
          description: `Completed ${enrollment.internship.title}`
        });
      }
    });

    // Add payments to timeline
    user.payments.forEach(payment => {
      activityTimeline.push({
        type: 'payment',
        date: payment.createdAt,
        description: `Payment of ₹${payment.amount} - ${payment.paymentStatus}`,
        status: payment.paymentStatus
      });
    });

    // Sort timeline by date
    activityTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    const profileData = {
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        chatEnabled: user.chatPermission?.isEnabled || false,
        chatEnabledAt: user.chatPermission?.enabledAt || null
      },
      statistics: {
        totalEnrollments,
        completedCourses,
        inProgressCourses,
        certificates,
        totalSpent,
        taskStats,
        averageScore,
        privateTasks,
        certificateValidationStats
      },
      enrollments: user.enrollments,
      payments: user.payments,
      notifications: user.notifications,
      certificateValidations: user.certificateValidations,
      privateTasks: user.assignedPrivateTasks,
      activityTimeline: activityTimeline.slice(0, 20) // Last 20 activities
    };

    // Audit log
    await createAuditLog('USER_PROFILE_VIEWED', req.user.id, {
      targetUserId: id,
      userName: user.name
    });

    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Get complete user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Edit user details
 * PUT /api/admin/users/:id/edit-details
 */
router.put('/users/:id/edit-details', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive, role } = req.body;

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== currentUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase(),
          id: { not: id }
        }
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    const changes = {};

    if (name && name !== currentUser.name) {
      updateData.name = name;
      changes.name = { old: currentUser.name, new: name };
    }

    if (email && email !== currentUser.email) {
      updateData.email = email.toLowerCase();
      changes.email = { old: currentUser.email, new: email.toLowerCase() };
    }

    if (typeof isActive === 'boolean' && isActive !== currentUser.isActive) {
      updateData.isActive = isActive;
      changes.isActive = { old: currentUser.isActive, new: isActive };
    }

    if (role && role !== currentUser.role) {
      updateData.role = role;
      changes.role = { old: currentUser.role, new: role };
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes detected'
      });
    }

    updateData.updatedAt = new Date();

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Audit log
    await createAuditLog('USER_UPDATED', req.user.id, {
      targetUserId: id,
      changes
    });

    // Notify user about profile update
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Profile Updated',
        message: 'Your profile has been updated by admin. Please review your account details.',
        type: 'INFO'
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { 
        user: updatedUser,
        changes
      }
    });

  } catch (error) {
    console.error('Edit user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Revoke user access with reason
 * PUT /api/admin/users/:id/revoke-access
 */
router.put('/users/:id/revoke-access', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User access already revoked'
      });
    }

    // Update user status
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Audit log
    await createAuditLog('USER_ACCESS_REVOKED', req.user.id, {
      targetUserId: id,
      userName: user.name,
      reason: reason || 'No reason provided'
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Access Revoked',
        message: reason || 'Your access to the LMS platform has been revoked by admin. Please contact support for more information.',
        type: 'ERROR'
      }
    });

    res.json({
      success: true,
      message: 'User access revoked successfully'
    });

  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Restore user access
 * PUT /api/admin/users/:id/restore-access
 */
router.put('/users/:id/restore-access', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User access is already active'
      });
    }

    // Restore access
    await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Audit log
    await createAuditLog('USER_ACCESS_RESTORED', req.user.id, {
      targetUserId: id,
      userName: user.name
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Access Restored',
        message: 'Your access to the LMS platform has been restored. You can now log in and continue your learning.',
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'User access restored successfully'
    });

  } catch (error) {
    console.error('Restore access error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Enable chat for user after certificate validation
 * PUT /api/admin/users/:id/enable-chat-access
 */
router.put('/users/:id/enable-chat-access', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has validated certificate
    const validatedCertificate = await prisma.certificateValidation.findFirst({
      where: {
        userId: id,
        status: 'APPROVED',
        isValid: true
      }
    });

    if (!validatedCertificate) {
      return res.status(400).json({
        success: false,
        message: 'User must have at least one validated certificate to enable chat access'
      });
    }

    // Enable chat permission
    const chatPermission = await prisma.chatPermission.upsert({
      where: { userId: id },
      update: {
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      },
      create: {
        userId: id,
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      }
    });

    // Create or get private chat room
    let chatRoom = await prisma.chatRoom.findFirst({
      where: {
        participants: {
          some: { userId: id }
        }
      }
    });

    if (!chatRoom) {
      chatRoom = await prisma.chatRoom.create({
        data: {
          name: `Private Chat - ${user.name}`,
          type: 'PRIVATE',
          createdBy: req.user.id,
          participants: {
            create: [
              { userId: id, role: 'MEMBER' },
              { userId: req.user.id, role: 'ADMIN' }
            ]
          }
        }
      });
    }

    // Audit log
    await createAuditLog('CHAT_ACCESS_ENABLED', req.user.id, {
      targetUserId: id,
      userName: user.name,
      chatRoomId: chatRoom.id
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Chat Access Enabled',
        message: 'Congratulations! Your certificate has been validated and you now have access to private chat with admin for premium tasks.',
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Chat access enabled successfully',
      data: {
        chatPermission,
        chatRoom: {
          id: chatRoom.id,
          name: chatRoom.name
        }
      }
    });

  } catch (error) {
    console.error('Enable chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to generate unique user ID
async function generateUserId() {
  const year = new Date().getFullYear();
  let userId;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    userId = `INT${year}${randomNum}`;
    
    const user = await prisma.user.findFirst({
      where: { userId }
    });
    
    exists = !!user;
  }

  return userId;
}

module.exports = router;