// routes/certificates.js - CERTIFICATE MANAGEMENT SYSTEM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');
const { generateCertificateNumber } = require('../utils/helpers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/certificates/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadCertificate = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed for certificates'));
    }
  }
});

// User certificate uploads
const userCertStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/user-certificates/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadUserCertificate = multer({ 
  storage: userCertStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// ==========================
// USER CERTIFICATE ROUTES
// ==========================

// Get my certificates
router.get('/my-certificates', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const certificates = await prisma.enrollment.findMany({
      where: {
        internId: userId,
        certificatePurchased: true
      },
      include: {
        internship: {
          select: {
            title: true,
            coverImage: true
          }
        }
      },
      orderBy: {
        certificateIssuedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: { certificates }
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Download certificate
router.get('/download/:enrollmentId', auth, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        id: enrollmentId,
        internId: userId,
        certificatePurchased: true
      }
    });

    if (!enrollment || !enrollment.certificateUrl) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    const certificatePath = path.join(__dirname, '..', enrollment.certificateUrl);
    
    if (!fs.existsSync(certificatePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }

    res.download(certificatePath, `certificate-${enrollment.certificateNumber}.pdf`);

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload certificate for validation (for paid tasks access)
router.post('/validate-certificate', auth, uploadUserCertificate.single('certificate'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { certificateNumber, internshipTitle } = req.body;

    if (!req.file || !certificateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Certificate file and certificate number are required'
      });
    }

    // Check if already submitted for validation
    const existingValidation = await prisma.certificateValidation.findFirst({
      where: {
        userId,
        certificateNumber,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingValidation) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already submitted for validation'
      });
    }

    // Create validation request
    const validation = await prisma.certificateValidation.create({
      data: {
        userId,
        certificateUrl: `/uploads/user-certificates/${req.file.filename}`,
        certificateNumber,
        internshipTitle: internshipTitle || 'Unknown',
        status: 'PENDING',
        submittedAt: new Date()
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: 'Certificate Validation Submitted',
        message: 'Your certificate has been submitted for validation. You will be notified once verified.',
        type: 'INFO'
      }
    });

    // Notify admin
    const firstAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (firstAdmin) {
      await prisma.notification.create({
        data: {
          userId: firstAdmin.id,
          title: 'New Certificate Validation Request',
          message: `${req.user.name} has submitted a certificate for validation`,
          type: 'WARNING'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Certificate submitted for validation',
      data: { validation }
    });

  } catch (error) {
    console.error('Certificate validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get validation status
router.get('/validation-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const validations = await prisma.certificateValidation.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({
      success: true,
      data: { validations }
    });

  } catch (error) {
    console.error('Get validation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==========================
// ADMIN CERTIFICATE ROUTES
// ==========================

// Get certificate sessions (pending certificate uploads)
router.get('/admin/certificate-sessions', adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const [sessions, total] = await Promise.all([
      prisma.certificateSession.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { sessionStartedAt: 'desc' },
        include: {
          intern: {
            select: {
              id: true,
              name: true,
              userId: true,
              email: true
            }
          },
          enrollment: {
            include: {
              internship: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.certificateSession.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get certificate sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload certificate for session
router.post('/admin/upload-certificate/:sessionId', adminOnly, uploadCertificate.single('certificate'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { adminNotes } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Certificate file is required'
      });
    }

    const session = await prisma.certificateSession.findUnique({
      where: { id: sessionId },
      include: {
        enrollment: {
          include: {
            internship: { select: { title: true } }
          }
        },
        intern: { select: { name: true } }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Certificate session not found'
      });
    }

    // Generate certificate number
    const certificateNumber = generateCertificateNumber();
    const certificateUrl = `/uploads/certificates/${req.file.filename}`;

    // Update session
    await prisma.certificateSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        certificateUrl,
        certificateNumber,
        issuedAt: new Date(),
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        adminNotes
      }
    });

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: session.enrollmentId },
      data: {
        certificateUrl,
        certificateNumber,
        certificateIssuedAt: new Date()
      }
    });

    // Notify intern
    await prisma.notification.create({
      data: {
        userId: session.internId,
        title: 'Certificate Issued',
        message: `Your certificate for "${session.enrollment.internship.title}" has been issued! Certificate Number: ${certificateNumber}`,
        type: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Certificate uploaded and issued successfully',
      data: {
        certificateNumber,
        certificateUrl
      }
    });

  } catch (error) {
    console.error('Upload certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get certificate validations (user-submitted certificates)
router.get('/admin/validations', adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const [validations, total] = await Promise.all([
      prisma.certificateValidation.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { submittedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              userId: true,
              email: true
            }
          },
          reviewer: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.certificateValidation.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        validations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get validations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Review certificate validation
router.put('/admin/validations/:validationId/review', adminOnly, async (req, res) => {
  try {
    const { validationId } = req.params;
    const { status, reviewMessage, issueDate } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either APPROVED or REJECTED'
      });
    }

    const validation = await prisma.certificateValidation.findUnique({
      where: { id: validationId },
      include: {
        user: { select: { name: true } }
      }
    });

    if (!validation) {
      return res.status(404).json({
        success: false,
        message: 'Validation request not found'
      });
    }

    // Update validation
    await prisma.certificateValidation.update({
      where: { id: validationId },
      data: {
        status,
        isValid: status === 'APPROVED',
        reviewMessage,
        issueDate: issueDate ? new Date(issueDate) : null,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    if (status === 'APPROVED') {
      // Enable chat permission for user
      await prisma.chatPermission.upsert({
        where: { userId: validation.userId },
        update: {
          isEnabled: true,
          enabledAt: new Date(),
          enabledBy: req.user.id
        },
        create: {
          userId: validation.userId,
          isEnabled: true,
          enabledAt: new Date(),
          enabledBy: req.user.id
        }
      });

      // Notify user - approved
      await prisma.notification.create({
        data: {
          userId: validation.userId,
          title: 'Certificate Validated Successfully',
          message: `Your certificate has been validated! You now have access to chat with admin for paid tasks.`,
          type: 'SUCCESS'
        }
      });
    } else {
      // Notify user - rejected
      await prisma.notification.create({
        data: {
          userId: validation.userId,
          title: 'Certificate Validation Rejected',
          message: `Your certificate validation was rejected. ${reviewMessage || 'Please upload a valid certificate.'}`,
          type: 'ERROR'
        }
      });
    }

    res.json({
      success: true,
      message: `Certificate ${status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error('Review validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get certificate statistics (admin)
router.get('/admin/certificate-stats', adminOnly, async (req, res) => {
  try {
    const [
      totalIssued,
      pendingSessions,
      pendingValidations,
      approvedValidations,
      rejectedValidations
    ] = await Promise.all([
      prisma.enrollment.count({
        where: { certificatePurchased: true }
      }),
      prisma.certificateSession.count({
        where: { status: 'PENDING_UPLOAD' }
      }),
      prisma.certificateValidation.count({
        where: { status: 'PENDING' }
      }),
      prisma.certificateValidation.count({
        where: { status: 'APPROVED' }
      }),
      prisma.certificateValidation.count({
        where: { status: 'REJECTED' }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalIssued,
        pendingSessions,
        pendingValidations,
        approvedValidations,
        rejectedValidations,
        validationApprovalRate: pendingValidations + approvedValidations + rejectedValidations > 0 ?
          Math.round((approvedValidations / (approvedValidations + rejectedValidations)) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Get certificate stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk issue certificates (admin)
router.post('/admin/bulk-issue', adminOnly, async (req, res) => {
  try {
    const { sessionIds } = req.body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const sessionId of sessionIds) {
      try {
        const session = await prisma.certificateSession.findUnique({
          where: { id: sessionId },
          include: {
            enrollment: true,
            intern: { select: { name: true } }
          }
        });

        if (!session) {
          errors.push({ sessionId, error: 'Session not found' });
          continue;
        }

        if (session.status !== 'PENDING_UPLOAD') {
          errors.push({ sessionId, error: 'Session already processed' });
          continue;
        }

        const certificateNumber = generateCertificateNumber();

        // In production, generate actual certificate PDF here
        const certificateUrl = `/certificates/${certificateNumber}.pdf`;

        // Update session
        await prisma.certificateSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            certificateUrl,
            certificateNumber,
            issuedAt: new Date(),
            uploadedBy: req.user.id,
            uploadedAt: new Date()
          }
        });

        // Update enrollment
        await prisma.enrollment.update({
          where: { id: session.enrollmentId },
          data: {
            certificateUrl,
            certificateNumber,
            certificateIssuedAt: new Date()
          }
        });

        results.push({ sessionId, certificateNumber });

      } catch (error) {
        errors.push({ sessionId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Issued ${results.length} certificates`,
      data: { results, errors }
    });

  } catch (error) {
    console.error('Bulk issue certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;