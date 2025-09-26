const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const {
  generateCertificate,
  getMyCertificates,
  getCertificateById,
  verifyCertificate,
  downloadCertificate,
  revokeCertificate,
  getAllCertificates,
  getCertificateStats,
  resendCertificate
} = require('../controllers/certificateController');

const router = express.Router();

// Generate certificate for completed enrollment (Student)
router.post('/generate/:enrollmentId', auth, generateCertificate);

// Get my certificates (Student)
router.get('/my', auth, getMyCertificates);

// Get certificate by ID (Student - own certificates only)
router.get('/:id', auth, getCertificateById);

// Download certificate PDF (Student)
router.get('/:id/download', auth, downloadCertificate);

// Resend certificate email (Student)
router.post('/:id/resend', auth, resendCertificate);

// Verify certificate by hash or ID (Public - no auth required)
router.get('/verify/:hash', verifyCertificate);

// Public certificate verification page (no auth required)
router.post('/verify', async (req, res, next) => {
  try {
    const { certificateId, verificationHash } = req.body;
    
    if (!certificateId && !verificationHash) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID or verification hash is required'
      });
    }

    // Use the verification hash if provided, otherwise use certificate ID
    const hashToVerify = verificationHash || certificateId;
    req.params.hash = hashToVerify;
    
    return verifyCertificate(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Admin routes
// Get all certificates with filters (Admin only)
router.get('/admin/all', [auth, adminAuth], getAllCertificates);

// Get certificate statistics (Admin only)
router.get('/admin/stats', [auth, adminAuth], getCertificateStats);

// Revoke certificate (Admin only)
router.put('/admin/:id/revoke', [auth, adminAuth], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Revocation reason is required'
      });
    }

    req.body.revokedBy = req.user.id;
    return revokeCertificate(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Get certificates by student (Admin only)
router.get('/admin/student/:studentId', [auth, adminAuth], async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { getDB } = require('../config/database');
    const { ObjectId } = require('mongodb');
    const db = getDB();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const certificates = await db.collection('certificates').aggregate([
      { $match: { studentId: new ObjectId(studentId) } },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1, duration: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { issuedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('certificates').countDocuments({
      studentId: new ObjectId(studentId)
    });

    res.json({
      success: true,
      data: {
        certificates: certificates.map(cert => ({
          ...cert,
          id: cert._id.toString()
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get certificates by internship (Admin only)
router.get('/admin/internship/:internshipId', [auth, adminAuth], async (req, res, next) => {
  try {
    const { internshipId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { getDB } = require('../config/database');
    const { ObjectId } = require('mongodb');
    const db = getDB();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const certificates = await db.collection('certificates').aggregate([
      { $match: { internshipId: new ObjectId(internshipId), isValid: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$student' },
      { $sort: { issuedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('certificates').countDocuments({
      internshipId: new ObjectId(internshipId),
      isValid: true
    });

    res.json({
      success: true,
      data: {
        certificates: certificates.map(cert => ({
          ...cert,
          id: cert._id.toString()
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Generate bulk certificates for completed students (Admin only)
router.post('/admin/bulk-generate', [auth, adminAuth], async (req, res, next) => {
  try {
    const { internshipId } = req.body;
    const { getDB } = require('../config/database');
    const { ObjectId } = require('mongodb');
    const certificateService = require('../services/certificateService');
    const db = getDB();

    // Get all completed enrollments for the internship
    const completedEnrollments = await db.collection('enrollments').find({
      internshipId: new ObjectId(internshipId),
      status: 'COMPLETED',
      paymentStatus: 'COMPLETED',
      certificateIssued: false
    }).toArray();

    const results = [];
    
    for (const enrollment of completedEnrollments) {
      try {
        const certificate = await certificateService.generateCertificate(
          enrollment._id.toString(),
          enrollment.studentId.toString()
        );
        results.push({
          enrollmentId: enrollment._id.toString(),
          studentId: enrollment.studentId.toString(),
          success: true,
          certificateId: certificate.id
        });
      } catch (error) {
        results.push({
          enrollmentId: enrollment._id.toString(),
          studentId: enrollment.studentId.toString(),
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Bulk certificate generation completed. ${successCount} certificates generated, ${failCount} failed.`,
      data: {
        totalProcessed: results.length,
        successCount,
        failCount,
        results
      }
    });
  } catch (error) {
    next(error);
  }
});

// Export certificates data (Admin only)
router.get('/admin/export', [auth, adminAuth], async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    const { getDB } = require('../config/database');
    const db = getDB();

    const filter = { isValid: true };
    if (startDate && endDate) {
      filter.issuedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const certificates = await db.collection('certificates').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1, duration: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { issuedAt: -1 } },
      {
        $project: {
          certificateNumber: 1,
          studentName: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
          studentEmail: '$student.email',
          internshipTitle: '$internship.title',
          internshipCategory: '$internship.category',
          duration: '$internship.duration',
          issuedAt: 1,
          finalScore: '$metadata.finalScore',
          grade: '$metadata.grade'
        }
      }
    ]).toArray();

    if (format === 'csv') {
      const csvData = certificates.map(cert => ({
        'Certificate Number': cert.certificateNumber,
        'Student Name': cert.studentName,
        'Student Email': cert.studentEmail,
        'Internship Title': cert.internshipTitle,
        'Category': cert.internshipCategory,
        'Duration (weeks)': cert.duration,
        'Final Score': cert.finalScore,
        'Grade': cert.grade,
        'Issued Date': cert.issuedAt.toISOString().split('T')[0]
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=certificates.csv');
      
      const csv = Object.keys(csvData[0]).join(',') + '\n' +
        csvData.map(row => Object.values(row).join(',')).join('\n');
      
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: certificates
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;