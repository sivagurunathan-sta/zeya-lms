// backend/src/routes/admin-chat.js - COMPLETE CHAT & PRIVATE TASK API
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

// Apply authentication
router.use(authenticateToken);

// Configure multer for file uploads in chat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// ==================== CREATE OR GET CHAT ROOM ====================
router.post('/chat/create/:userId', authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Check if chat permission is enabled
    const permission = await prisma.chatPermission.findUnique({
      where: { userId }
    });

    if (!permission || !permission.isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Chat is not enabled for this user. Please verify certificate first.'
      });
    }

    // Check if chat room already exists
    let chatRoom = await prisma.chatRoom.findFirst({
      where: {
        type: 'PRIVATE',
        participants: {
          every: {
            userId: { in: [adminId, userId] }
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                userId: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    // Create new chat room if doesn't exist
    if (!chatRoom) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      chatRoom = await prisma.chatRoom.create({
        data: {
          name: `Chat with ${user.name}`,
          type: 'PRIVATE',
          createdBy: adminId,
          isActive: true,
          participants: {
            create: [
              {
                userId: adminId,
                role: 'ADMIN',
                isActive: true
              },
              {
                userId: userId,
                role: 'MEMBER',
                isActive: true
              }
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  userId: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      });

      // Send welcome message
      await prisma.chatMessage.create({
        data: {
          chatRoomId: chatRoom.id,
          senderId: adminId,
          content: 'Hello! Welcome to private chat. I can assign you private tasks here.',
          messageType: 'SYSTEM'
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: userId,
          title: 'Chat Room Created',
          message: 'Admin has started a private chat with you. You can now receive private tasks.',
          type: 'INFO'
        }
      });
    }

    res.json({
      success: true,
      message: 'Chat room ready',
      data: chatRoom
    });

  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: error.message
    });
  }
});

// ==================== GET CHAT MESSAGES ====================
router.get('/chat/:chatRoomId/messages', async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId,
        userId: req.user.id,
        isActive: true
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
        where: {
          chatRoomId,
          isDeleted: false
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              userId: true,
              name: true,
              email: true,
              role: true
            }
          },
          readBy: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.chatMessage.count({
        where: {
          chatRoomId,
          isDeleted: false
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// ==================== SEND CHAT MESSAGE ====================
router.post('/chat/:chatRoomId/send', upload.single('file'), async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { content, messageType = 'TEXT', replyToId } = req.body;
    const senderId = req.user.id;

    // Verify user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId,
        userId: senderId,
        isActive: true
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    // Prepare attachments if file uploaded
    let attachments = null;
    if (req.file) {
      attachments = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/chat/${req.file.filename}`,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      };
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId,
        senderId,
        content: content || 'Sent a file',
        messageType,
        attachments,
        replyToId: replyToId || null
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Update chat room last activity
    await prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastActivityAt: new Date() }
    });

    // Get other participant for notification
    const otherParticipant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId,
        userId: { not: senderId },
        isActive: true
      }
    });

    if (otherParticipant) {
      await prisma.notification.create({
        data: {
          userId: otherParticipant.userId,
          title: 'New Message',
          message: `${req.user.name}: ${content?.substring(0, 50)}${content?.length > 50 ? '...' : ''}`,
          type: 'INFO'
        }
      });
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// ==================== ASSIGN PRIVATE TASK ====================
router.post('/chat/:chatRoomId/assign-task', authorizeAdmin, upload.array('files', 5), async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { title, description, deadline, points = 100 } = req.body;
    const adminId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Get the intern user from chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        participants: {
          where: {
            userId: { not: adminId },
            isActive: true
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!chatRoom || chatRoom.participants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat room or participant not found'
      });
    }

    const internUser = chatRoom.participants[0].user;

    // Prepare files data
    let filesData = [];
    if (req.files && req.files.length > 0) {
      filesData = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/chat/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype
      }));
    }

    // Create private task
    const privateTask = await prisma.privateTask.create({
      data: {
        title,
        description,
        instructions: description,
        assignedTo: internUser.id,
        assignedBy: adminId,
        chatRoomId,
        deadline: deadline ? new Date(deadline) : null,
        points: parseInt(points),
        files: filesData,
        status: 'ASSIGNED'
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Send task message in chat
    const taskMessage = await prisma.chatMessage.create({
      data: {
        chatRoomId,
        senderId: adminId,
        content: `📋 **Private Task Assigned**\n\n**${title}**\n\n${description}\n\n${deadline ? `⏰ Deadline: ${new Date(deadline).toLocaleDateString()}` : ''}`,
        messageType: 'TASK_ASSIGNMENT',
        taskId: privateTask.id
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: internUser.id,
        title: '📋 New Private Task Assigned',
        message: `You have been assigned a new task: "${title}". Check your chat for details.`,
        type: 'INFO'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PRIVATE_TASK_ASSIGNED',
        userId: adminId,
        details: `Assigned private task "${title}" to ${internUser.name} (${internUser.userId})`,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Private task assigned successfully',
      data: {
        task: privateTask,
        message: taskMessage
      }
    });

  } catch (error) {
    console.error('Assign private task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign private task',
      error: error.message
    });
  }
});

// ==================== GET PRIVATE TASKS FOR USER ====================
router.get('/private-tasks/:userId', authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const privateTasks = await prisma.privateTask.findMany({
      where: {
        OR: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true
          }
        },
        assignedByUser: {
          select: {
            id: true,
            userId: true,
            name: true,
            role: true
          }
        },
        chatRoom: {
          select: {
            id: true,
            name: true
          }
        },
        submission: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: privateTasks
    });

  } catch (error) {
    console.error('Get private tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch private tasks',
      error: error.message
    });
  }
});

// ==================== REVIEW PRIVATE TASK SUBMISSION ====================
router.post('/private-tasks/:taskId/review', authorizeAdmin, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, score, feedback } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be APPROVED or REJECTED'
      });
    }

    const privateTask = await prisma.privateTask.findUnique({
      where: { id: taskId },
      include: {
        submission: true,
        assignedToUser: true
      }
    });

    if (!privateTask || !privateTask.submission) {
      return res.status(404).json({
        success: false,
        message: 'Task or submission not found'
      });
    }

    // Update submission
    await prisma.privateTaskSubmission.update({
      where: { id: privateTask.submission.id },
      data: {
        status,
        score: status === 'APPROVED' ? parseInt(score) : 0,
        feedback,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    // Update task status
    await prisma.privateTask.update({
      where: { id: taskId },
      data: {
        status: status === 'APPROVED' ? 'COMPLETED' : 'REJECTED',
        completedAt: status === 'APPROVED' ? new Date() : null
      }
    });

    // Send message in chat
    await prisma.chatMessage.create({
      data: {
        chatRoomId: privateTask.chatRoomId,
        senderId: req.user.id,
        content: `📝 **Task Review: ${privateTask.title}**\n\nStatus: ${status}\n${score ? `Score: ${score}/${privateTask.points}` : ''}\n\n${feedback || ''}`,
        messageType: 'TASK_REVIEW'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: privateTask.assignedTo,
        title: status === 'APPROVED' ? '✅ Task Approved!' : '❌ Task Rejected',
        message: `Your private task "${privateTask.title}" has been ${status.toLowerCase()}. ${feedback ? `Feedback: ${feedback}` : ''}`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR'
      }
    });

    res.json({
      success: true,
      message: 'Task reviewed successfully'
    });

  } catch (error) {
    console.error('Review private task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review task',
      error: error.message
    });
  }
});

// ==================== MARK MESSAGES AS READ ====================
router.post('/chat/:chatRoomId/read', async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'messageIds must be an array'
      });
    }

    // Create read receipts
    const readReceipts = messageIds.map(messageId => ({
      messageId,
      userId,
      readAt: new Date()
    }));

    await prisma.messageRead.createMany({
      data: readReceipts,
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
});

// ==================== DELETE MESSAGE ====================
router.delete('/chat/messages/:messageId', async (req, res) => {
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

    // Only sender or admin can delete
    if (message.senderId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId
      }
    });

    res.json({
      success: true,
      message: 'Message deleted'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

// ==================== GET ALL CHAT ROOMS (ADMIN) ====================
router.get('/chat/rooms', authorizeAdmin, async (req, res) => {
  try {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        type: 'PRIVATE',
        isActive: true
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                userId: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: { lastActivityAt: 'desc' }
    });

    res.json({
      success: true,
      data: chatRooms
    });

  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
});

module.exports = router;