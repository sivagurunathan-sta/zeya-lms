// src/routes/certificates.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

router.use(authenticateToken);

// ===========================
// CERTIFICATE GENERATION
// ===========================

// Check certificate eligibility
router.get('/eligibility/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const internId = req.user.id;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        internId
      },
      include: {
        internship: true,
        submissions: {
          where: { status: 'APPROVED' }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Calculate eligibility
    const totalTasks = await prisma.task.count({
      where: { internshipId: enrollment.internshipId }
    });

    const completedTasks = enrollment.submissions.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const isEligible = progress >= enrollment.internship.passPercentage;

    res.json({
      success: true,
      data: {
        isEligible,
        progress,
        requiredPercentage: enrollment.internship.passPercentage,
        completedTasks,
        totalTasks,
        certificatePrice: enrollment.internship.certificatePrice,
        alreadyPurchased: enrollment.certificatePurchased
      }
    });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check eligibility',
      error: error.message
    });
  }
});

// Get certificate (if purchased)
router.get('/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const internId = req.user.id;

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        internId,
        certificatePurchased: true
      },
      include: {
        internship: true,
        intern: { select: { name: true, userId: true } }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or not purchased'
      });
    }

    res.json({
      success: true,
      data: {
        certificateUrl: enrollment.certificateUrl,
        certificateNumber: enrollment.certificateNumber,
        issuedAt: enrollment.certificateIssuedAt,
        internName: enrollment.intern.name,
        internshipTitle: enrollment.internship.title
      }
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
});

// Validate certificate (public endpoint - no auth required)
router.post('/validate', async (req, res) => {
  try {
    const { certificateNumber } = req.body;

    if (!certificateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Certificate number is required'
      });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        certificateNumber,
        certificatePurchased: true
      },
      include: {
        intern: { select: { name: true, userId: true } },
        internship: { select: { title: true } }
      }
    });

    if (!enrollment) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          message: 'Certificate not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        isValid: true,
        internName: enrollment.intern.name,
        internId: enrollment.intern.userId,
        internshipTitle: enrollment.internship.title,
        issuedAt: enrollment.certificateIssuedAt,
        certificateUrl: enrollment.certificateUrl
      }
    });

  } catch (error) {
    console.error('Validate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate certificate',
      error: error.message
    });
  }
});

module.exports = router;