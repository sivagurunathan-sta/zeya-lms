// src/routes/chat.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

router.use(authenticateToken);

// ===========================
// CHAT PERMISSION
// ===========================

// Check if user has chat permission
router.get('/permission', async (req, res) => {
  try {
    const userId = req.user.id;

    const permission = await prisma.chatPermission.findUnique({
      where: { userId }
    });

    res.json({
      success: true,
      data: {
        hasPermission: permission?.isEnabled || false,
        enabledAt: permission?.enabledAt
      }
    });

  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check permission',
      error: error.message
    });
  }
});

// ===========================
// CHAT ROOMS
// ===========================

// Get all chat rooms for user
router.get('/rooms', async (req, res) => {
  try {
    const userId = req.user.id;

    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { messages: true }
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

// Get single chat room
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId,
        isActive: true
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: chatRoom
    });

  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat room',
      error: error.message
    });
  }
});

// ===========================
// MESSAGES
// ===========================

// Get messages for a chat room
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId,
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
          chatRoomId: roomId,
          isDeleted: false
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
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
          chatRoomId: roomId,
          isDeleted: false
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
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

// Send message
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'TEXT', attachments, replyToId } = req.body;
    const userId = req.user.id;

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId,
        isActive: true
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: userId,
        content,
        messageType,
        attachments,
        replyToId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Update chat room last activity
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent',
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

// Mark message as read
router.post('/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Check if already read
    const existingRead = await prisma.messageRead.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      }
    });

    if (existingRead) {
      return res.json({
        success: true,
        message: 'Already marked as read'
      });
    }

    // Mark as read
    await prisma.messageRead.create({
      data: {
        messageId,
        userId
      }
    });

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
});

// Delete message
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Check if user is sender or admin
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

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

// ===========================
// PRIVATE TASKS (within chat)
// ===========================

// Get private tasks
router.get('/private-tasks', async (req, res) => {
  try {
    const userId = req.user.id;

    const privateTasks = await prisma.privateTask.findMany({
      where: {
        OR: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      },
      include: {
        assignedToUser: {
          select: { name: true, email: true }
        },
        assignedByUser: {
          select: { name: true, email: true }
        },
        chatRoom: {
          select: { name: true }
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

// Submit private task
router.post('/private-tasks/:taskId/submit', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { submissionText, githubUrl } = req.body;
    const userId = req.user.id;

    // Check task ownership
    const task = await prisma.privateTask.findFirst({
      where: {
        id: taskId,
        assignedTo: userId
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
    }

    // Check if already submitted
    const existingSubmission = await prisma.privateTaskSubmission.findUnique({
      where: { privateTaskId: taskId }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Task already submitted'
      });
    }

    // Create submission
    const submission = await prisma.privateTaskSubmission.create({
      data: {
        privateTaskId: taskId,
        submittedBy: userId,
        submissionText,
        githubUrl,
        status: 'PENDING'
      }
    });

    // Update task status
    await prisma.privateTask.update({
      where: { id: taskId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Private task submitted',
      data: submission
    });

  } catch (error) {
    console.error('Submit private task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task',
      error: error.message
    });
  }
});

module.exports = router;