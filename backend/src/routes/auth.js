const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { generateUserId } = require('../utils/helpers');

const router = express.Router();
const prisma = new PrismaClient();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Validation
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID and password are required'
      });
    }

    // Find user by userId (case-insensitive)
    const user = await prisma.user.findFirst({
      where: { 
        userId: {
          equals: userId,
          mode: 'insensitive'
        },
        isActive: true 
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        userId: user.userId, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login (optional)
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin creates new intern account
router.post('/create-intern', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create intern accounts'
      });
    }

    const { name, email } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate unique user ID
    const userId = await generateUserId();
    
    // Generate temporary password (can be userId for simplicity)
    const tempPassword = userId.toLowerCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create new intern
    const newIntern = await prisma.user.create({
      data: {
        userId,
        name,
        email,
        role: 'INTERN',
        passwordHash: hashedPassword
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Intern account created successfully',
      data: {
        intern: newIntern,
        temporaryPassword: tempPassword,
        loginInstructions: `Intern can login with ID: ${userId} and password: ${tempPassword}`
      }
    });

  } catch (error) {
    console.error('Create intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk create interns
router.post('/bulk-create-interns', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create intern accounts'
      });
    }

    const { interns } = req.body; // Array of {name, email}

    if (!Array.isArray(interns) || interns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Interns array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const internData of interns) {
      try {
        const { name, email } = internData;

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          errors.push({ email, error: 'Email already exists' });
          continue;
        }

        // Generate unique user ID and password
        const userId = await generateUserId();
        const tempPassword = userId.toLowerCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create new intern
        const newIntern = await prisma.user.create({
          data: {
            userId,
            name,
            email,
            role: 'INTERN',
            passwordHash: hashedPassword
          },
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            createdAt: true
          }
        });

        results.push({
          intern: newIntern,
          temporaryPassword: tempPassword
        });

      } catch (error) {
        errors.push({ 
          email: internData.email, 
          error: error.message 
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.length} intern accounts`,
      data: {
        created: results,
        errors: errors,
        summary: {
          total: interns.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Bulk create interns error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password (for interns to change from temporary password)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hashedNewPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout (client-side mainly, but can blacklist tokens if needed)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;