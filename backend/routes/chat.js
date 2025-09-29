// routes/chat.js - ADMIN-USER CHAT SYSTEM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for chat file uploads
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat-files/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadChatFile = multer({ 
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('document') || file.mimetype.includes('text');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type for chat'));
    }
  }
});

// ==========================
// CHAT PERMISSION MANAGEMENT
// ==========================

// Check if user has chat permission
router.get('/check-permission', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const permission = await prisma.chatPermission.findUnique({
      where: { userId }
    });

    const hasPermission = permission && permission.isEnabled;

    if (!hasPermission) {
      return res.json({
        success: true,
        data: {
          hasPermission: false,
          message: 'Chat access requires certificate validation. Please upload your internship certificate for verification.'
        }
      });
    }

    // Get or create chat room
    let chatRoom = await prisma.chatRoom.findFirst({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!chatRoom) {
      // Create new chat room with admin
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (admin) {
        chatRoom = await prisma.chatRoom.create({
          data: {
            name: `Private Chat - ${req.user.name}`,
            type: 'PRIVATE',
            createdBy: userId,
            participants: {
              create: [
                { userId: userId, role: 'MEMBER' },
                { userId: admin.id, role: 'ADMIN' }
              ]
            }
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              }
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        hasPermission: true,
        chatRoom
      }
    });

  } catch (error) {
    console.error('Check chat permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// CHAT MESSAGES
// ==========================

// Get chat messages
router.get('/messages/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify user is participant in this room
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatRoomId: roomId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.chatMessage.count({ where: { chatRoomId: roomId } })
    ]);

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        chatRoomId: roomId,
        senderId: { not: userId },
        readBy: { none: { userId } }
      },
      data: { updatedAt: new Date() }
    });

    // Create read receipts
    const unreadMessages = messages.filter(msg => 
      msg.senderId !== userId && 
      !msg.readBy?.some(read => read.userId === userId)
    );

    if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessages.map(msg => ({
          messageId: msg.id,
          userId,
          readAt: new Date()
        })),
        skipDuplicates: true
      });
    }

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Show oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send message
router.post('/messages/:roomId', auth, uploadChatFile.single('attachment'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'TEXT', replyToId } = req.body;
    const userId = req.user.id;

    // Verify user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    // Validate message content
    if (!content && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Message content or file is required'
      });
    }

    // Prepare message data
    const messageData = {
      chatRoomId: roomId,
      senderId: userId,
      content: content || '',
      messageType,
      replyToId: replyToId || null
    };

    // Handle file attachment
    if (req.file) {
      messageData.attachments = [{
        name: req.file.originalname,
        url: `/uploads/chat-files/${req.file.filename}`,
        type: path.extname(req.file.originalname).substring(1),
        size: req.file.size
      }];
      messageData.messageType = 'FILE';
    }

    const message = await prisma.chatMessage.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Update room last activity
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() }
    });

    // Send notification to other participants
    const otherParticipants = await prisma.chatParticipant.findMany({
      where: {
        chatRoomId: roomId,
        userId: { not: userId }
      }
    });

    for (const participant of otherParticipants) {
      await prisma.notification.create({
        data: {
          userId: participant.userId,
          title: 'New Message',
          message: `${req.user.name}: ${content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'Sent a file'}`,
          type: 'INFO'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// ADMIN CHAT MANAGEMENT
// ==========================

// Get all active chat rooms (admin)
router.get('/admin/rooms', adminOnly, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status !== 'all') {
      where.status = status;
    }

    const [rooms, total] = await Promise.all([
      prisma.chatRoom.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { lastActivityAt: 'desc' },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  userId: true,
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        }
      }),
      prisma.chatRoom.count({ where })
    ]);

    // Get unread message counts for each room
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            chatRoomId: room.id,
            senderId: { not: req.user.id },
            readBy: { none: { userId: req.user.id } }
          }
        });

        return {
          ...room,
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        rooms: roomsWithUnread,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get admin chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create private task assignment through chat
router.post('/admin/assign-task/:roomId', adminOnly, uploadChatFile.fields([
  { name: 'taskFiles', maxCount: 10 },
  { name: 'attachment', maxCount: 1 }
]), async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      taskTitle,
      taskDescription,
      deadline,
      points,
      isPrivate = true,
      instructions
    } = req.body;

    // Verify room exists and get participant
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: {
            user: { role: 'INTERN' }
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!room || room.participants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room or participant not found'
      });
    }

    const intern = room.participants[0].user;

    // Process uploaded files
    const taskFiles = [];
    if (req.files?.taskFiles) {
      req.files.taskFiles.forEach(file => {
        taskFiles.push({
          name: file.originalname,
          url: `/uploads/chat-files/${file.filename}`,
          type: path.extname(file.originalname).substring(1),
          size: file.size
        });
      });
    }

    // Create private task assignment
    const privateTask = await prisma.privateTask.create({
      data: {
        title: taskTitle,
        description: taskDescription,
        instructions,
        assignedTo: intern.id,
        assignedBy: req.user.id,
        chatRoomId: roomId,
        deadline: deadline ? new Date(deadline) : null,
        points: points ? parseInt(points) : 100,
        files: taskFiles.length > 0 ? taskFiles : null,
        status: 'ASSIGNED'
      }
    });

    // Send message in chat about task assignment
    const taskMessage = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: req.user.id,
        content: `📋 **Private Task Assigned: ${taskTitle}**\n\n${taskDescription}\n\n${instructions ? `**Instructions:** ${instructions}\n\n` : ''}${deadline ? `**Deadline:** ${new Date(deadline).toLocaleDateString()}\n` : ''}**Points:** ${points || 100}`,
        messageType: 'TASK_ASSIGNMENT',
        taskId: privateTask.id,
        attachments: req.files?.attachment ? [{
          name: req.files.attachment[0].originalname,
          url: `/uploads/chat-files/${req.files.attachment[0].filename}`,
          type: path.extname(req.files.attachment[0].originalname).substring(1),
          size: req.files.attachment[0].size
        }] : null
      }
    });

    // Notify intern
    await prisma.notification.create({
      data: {
        userId: intern.id,
        title: 'New Private Task Assigned',
        message: `You have been assigned a private task: "${taskTitle}". Check your chat for details.`,
        type: 'INFO'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Private task assigned successfully',
      data: {
        privateTask,
        message: taskMessage
      }
    });

  } catch (error) {
    console.error('Assign private task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// PRIVATE TASK MANAGEMENT
// ==========================

// Get user's private tasks
router.get('/private-tasks', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { assignedTo: userId };
    if (status) where.status = status;

    const [tasks, total] = await Promise.all([
      prisma.privateTask.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          assignedBy: {
            select: {
              name: true,
              role: true
            }
          },
          submission: true
        }
      }),
      prisma.privateTask.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get private tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Submit private task
router.post('/private-tasks/:taskId/submit', auth, uploadChatFile.single('submission'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { submissionText, githubUrl } = req.body;
    const userId = req.user.id;

    const task = await prisma.privateTask.findUnique({
      where: {
        id: taskId,
        assignedTo: userId
      },
      include: {
        assignedBy: { select: { name: true } }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Private task not found'
      });
    }

    if (task.status !== 'ASSIGNED') {
      return res.status(400).json({
        success: false,
        message: 'Task already submitted or completed'
      });
    }

    // Check deadline
    if (task.deadline && new Date() > task.deadline) {
      return res.status(400).json({
        success: false,
        message: 'Submission deadline has passed'
      });
    }

    // Prepare submission data
    const submissionData = {
      privateTaskId: taskId,
      submittedBy: userId,
      submissionText: submissionText || '',
      githubUrl,
      status: 'PENDING'
    };

    if (req.file) {
      submissionData.fileUrl = `/uploads/chat-files/${req.file.filename}`;
      submissionData.fileName = req.file.originalname;
    }

    // Create submission
    const submission = await prisma.privateTaskSubmission.create({
      data: submissionData
    });

    // Update task status
    await prisma.privateTask.update({
      where: { id: taskId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    // Send message in chat about submission
    await prisma.chatMessage.create({
      data: {
        chatRoomId: task.chatRoomId,
        senderId: userId,
        content: `✅ **Task Submitted: ${task.title}**\n\n${submissionText || 'File submission'}${githubUrl ? `\n\n**GitHub:** ${githubUrl}` : ''}`,
        messageType: 'TASK_SUBMISSION',
        taskId: taskId,
        attachments: req.file ? [{
          name: req.file.originalname,
          url: `/uploads/chat-files/${req.file.filename}`,
          type: path.extname(req.file.originalname).substring(1),
          size: req.file.size
        }] : null
      }
    });

    // Notify admin
    await prisma.notification.create({
      data: {
        userId: task.assignedBy,
        title: 'Private Task Submitted',
        message: `${req.user.name} has submitted the private task: "${task.title}"`,
        type: 'INFO'
      }
    });

    res.json({
      success: true,
      message: 'Private task submitted successfully',
      data: { submission }
    });

  } catch (error) {
    console.error('Submit private task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Review private task submission (admin)
router.put('/admin/private-tasks/:taskId/review', adminOnly, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, feedback, score } = req.body;

    if (!['APPROVED', 'REJECTED', 'NEEDS_REVISION'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const task = await prisma.privateTask.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { name: true } },
        submission: true
      }
    });

    if (!task || !task.submission) {
      return res.status(404).json({
        success: false,
        message: 'Task or submission not found'
      });
    }

    // Update submission
    await prisma.privateTaskSubmission.update({
      where: { id: task.submission.id },
      data: {
        status,
        feedback,
        score: score ? parseInt(score) : null,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    // Update task status
    const taskStatus = status === 'APPROVED' ? 'COMPLETED' : 
                     status === 'REJECTED' ? 'REJECTED' : 'ASSIGNED';

    await prisma.privateTask.update({
      where: { id: taskId },
      data: { status: taskStatus }
    });

    // Send message in chat
    const statusEmoji = status === 'APPROVED' ? '✅' : status === 'REJECTED' ? '❌' : '🔄';
    await prisma.chatMessage.create({
      data: {
        chatRoomId: task.chatRoomId,
        senderId: req.user.id,
        content: `${statusEmoji} **Task Review: ${task.title}**\n\n**Status:** ${status}\n${score ? `**Score:** ${score}/100\n` : ''}${feedback ? `**Feedback:** ${feedback}` : ''}`,
        messageType: 'TASK_REVIEW',
        taskId: taskId
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: task.assignedTo,
        title: `Private Task ${status}`,
        message: `Your private task "${task.title}" has been ${status.toLowerCase()}. ${feedback || 'Check chat for details.'}`,
        type: status === 'APPROVED' ? 'SUCCESS' : status === 'REJECTED' ? 'ERROR' : 'WARNING'
      }
    });

    res.json({
      success: true,
      message: 'Private task reviewed successfully'
    });

  } catch (error) {
    console.error('Review private task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// CHAT UTILITIES
// ==========================

// Delete message
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender or admin can delete message
    if (message.senderId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId
      }
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get chat statistics (admin)
router.get('/admin/chat-stats', adminOnly, async (req, res) => {
  try {
    const [
      totalRooms,
      activeRooms,
      totalMessages,
      totalPrivateTasks,
      completedPrivateTasks
    ] = await Promise.all([
      prisma.chatRoom.count(),
      prisma.chatRoom.count({
        where: {
          lastActivityAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      prisma.chatMessage.count(),
      prisma.privateTask.count(),
      prisma.privateTask.count({ where: { status: 'COMPLETED' } })
    ]);

    res.json({
      success: true,
      data: {
        totalRooms,
        activeRooms,
        totalMessages,
        totalPrivateTasks,
        completedPrivateTasks,
        privateTaskCompletionRate: totalPrivateTasks > 0 ? 
          Math.round((completedPrivateTasks / totalPrivateTasks) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;