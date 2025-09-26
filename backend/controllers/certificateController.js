const PDFDocument = require('pdfkit');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Generate certificate
const generateCertificate = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const db = getDB();

    // Get enrollment details
    const enrollment = await db.collection('enrollments').aggregate([
      { $match: { _id: new ObjectId(enrollmentId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: '$internship' },
      {
        $lookup: {
          from: 'taskSubmissions',
          localField: '_id',
          foreignField: 'enrollmentId',
          as: 'taskSubmissions',
          pipeline: [
            { $match: { status: 'APPROVED' } }
          ]
        }
      }
    ]).toArray();

    if (!enrollment.length) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const enrollmentData = enrollment[0];

    if (enrollmentData.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if all requirements are met
    if (enrollmentData.paymentStatus !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    if (enrollmentData.taskSubmissions.length < enrollmentData.internship.totalTasks) {
      return res.status(400).json({
        success: false,
        message: 'All tasks must be completed'
      });
    }

    // Check if certificate already exists
    const existingCertificate = await db.collection('certificates').findOne({
      enrollmentId: new ObjectId(enrollmentId)
    });

    if (existingCertificate) {
      return res.json({
        success: true,
        message: 'Certificate already exists',
        data: {
          ...existingCertificate,
          id: existingCertificate._id.toString()
        }
      });
    }

    // Generate PDF certificate
    const pdfBuffer = await generateCertificatePDF(enrollmentData);

    // For now, just store locally - you can implement S3 upload later
    const certificateUrl = `/certificates/${enrollmentId}-${Date.now()}.pdf`;

    // Save certificate record
    const certificateDoc = {
      enrollmentId: new ObjectId(enrollmentId),
      studentId: new ObjectId(enrollmentData.student._id),
      certificateUrl,
      issuedAt: new Date(),
      blockchainHash: null // For future blockchain integration
    };

    const result = await db.collection('certificates').insertOne(certificateDoc);

    // Update enrollment
    await db.collection('enrollments').updateOne(
      { _id: new ObjectId(enrollmentId) },
      { 
        $set: { 
          certificateIssued: true,
          updatedAt: new Date()
        } 
      }
    );

    // Send notification email
    try {
      await sendEmail(
        enrollmentData.student.email,
        'Certificate Issued - Student LMS',
        `Dear ${enrollmentData.student.firstName},

Congratulations! Your certificate for "${enrollmentData.internship.title}" is now ready.

You can download your certificate from your dashboard.

Best regards,
Student LMS Team`
      );
    } catch (emailError) {
      logger.error('Failed to send certificate notification email:', emailError);
    }

    res.json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        ...certificateDoc,
        id: result.insertedId.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get my certificates
const getMyCertificates = async (req, res, next) => {
  try {
    const db = getDB();
    
    const certificates = await db.collection('certificates').aggregate([
      { $match: { studentId: new ObjectId(req.user.id) } },
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { issuedAt: -1 } }
    ]).toArray();

    res.json({
      success: true,
      data: certificates.map(cert => ({
        ...cert,
        id: cert._id.toString()
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Get certificate by ID
const getCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const certificate = await db.collection('certificates').aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
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
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1 } }
          ]
        }
      },
      { $unwind: '$internship' }
    ]).toArray();

    if (!certificate.length) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    const certData = certificate[0];

    // Check if user owns this certificate
    if (certData.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      data: {
        ...certData,
        id: certData._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify certificate
const verifyCertificate = async (req, res, next) => {
  try {
    const { hash } = req.params;
    const db = getDB();

    // For now, just find by ID - you can implement proper hash verification later
    const certificate = await db.collection('certificates').aggregate([
      { $match: { _id: new ObjectId(hash) } },
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
          pipeline: [
            { $project: { firstName: 1, lastName: 1 } }
          ]
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1, duration: 1 } }
          ]
        }
      },
      { $unwind: '$internship' }
    ]).toArray();

    if (!certificate.length) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid'
      });
    }

    res.json({
      success: true,
      data: {
        isValid: true,
        certificate: {
          ...certificate[0],
          id: certificate[0]._id.toString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Download certificate
const downloadCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const certificate = await db.collection('certificates').findOne({
      _id: new ObjectId(id),
      studentId: new ObjectId(req.user.id)
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // For now, return the URL - implement actual file serving later
    res.json({
      success: true,
      data: {
        downloadUrl: certificate.certificateUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// Revoke certificate (Admin only)
const revokeCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getDB();

    const result = await db.collection('certificates').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revocationReason: reason,
          revokedBy: new ObjectId(req.user.id)
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Certificate revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get all certificates (Admin only)
const getAllCertificates = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const certificates = await db.collection('certificates').aggregate([
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
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { issuedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('certificates').countDocuments({});

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
};

// Get certificate statistics (Admin only)
const getCertificateStats = async (req, res, next) => {
  try {
    const db = getDB();

    const stats = await db.collection('certificates').aggregate([
      {
        $group: {
          _id: null,
          totalCertificates: { $sum: 1 },
          activeCertificates: {
            $sum: { $cond: [{ $ne: ['$isRevoked', true] }, 1, 0] }
          },
          revokedCertificates: {
            $sum: { $cond: [{ $eq: ['$isRevoked', true] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const monthlyStats = await db.collection('certificates').aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$issuedAt' },
            month: { $month: '$issuedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]).toArray();

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalCertificates: 0,
          activeCertificates: 0,
          revokedCertificates: 0
        },
        monthlyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Resend certificate
const resendCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const certificate = await db.collection('certificates').aggregate([
      { $match: { _id: new ObjectId(id), studentId: new ObjectId(req.user.id) } },
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: '$internship' }
    ]).toArray();

    if (!certificate.length) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    const certData = certificate[0];

    // Send notification email
    try {
      await sendEmail(
        certData.student.email,
        'Certificate - Student LMS',
        `Dear ${certData.student.firstName},

Your certificate for "${certData.internship.title}" has been resent.

You can download your certificate from your dashboard.

Certificate URL: ${certData.certificateUrl}

Best regards,
Student LMS Team`
      );
    } catch (emailError) {
      logger.error('Failed to resend certificate email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send certificate email'
      });
    }

    res.json({
      success: true,
      message: 'Certificate email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Generate certificate PDF
async function generateCertificatePDF(enrollment) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4'
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Certificate design
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      // Background
      doc.rect(0, 0, pageWidth, pageHeight)
         .fill('#f8f9fa');

      // Border
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
         .lineWidth(3)
         .stroke('#2563eb');

      // Inner border
      doc.rect(margin + 20, margin + 20, pageWidth - 2 * margin - 40, pageHeight - 2 * margin - 40)
         .lineWidth(1)
         .stroke('#6b7280');

      // Title
      doc.fontSize(36)
         .fillColor('#1f2937')
         .font('Helvetica-Bold')
         .text('CERTIFICATE OF COMPLETION', margin, margin + 80, {
           align: 'center',
           width: pageWidth - 2 * margin
         });

      // Subtitle
      doc.fontSize(16)
         .fillColor('#6b7280')
         .font('Helvetica')
         .text('This is to certify that', margin, margin + 150, {
           align: 'center',
           width: pageWidth - 2 * margin
         });

      // Student name
      doc.fontSize(28)
         .fillColor('#2563eb')
         .font('Helvetica-Bold')
         .text(`${enrollment.student.firstName} ${enrollment.student.lastName}`, margin, margin + 200, {
           align: 'center',
           width: pageWidth - 2 * margin
         });

      // Course details
      doc.fontSize(16)
         .fillColor('#1f2937')
         .font('Helvetica')
         .text('has successfully completed the internship program', margin, margin + 260, {
           align: 'center',
           width: pageWidth - 2 * margin
         });

      doc.fontSize(24)
         .fillColor('#059669')
         .font('Helvetica-Bold')
         .text(enrollment.internship.title, margin, margin + 300, {
           align: 'center',
           width: pageWidth - 2 * margin
         });

      // Date and duration
      const issueDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(14)
         .fillColor('#6b7280')
         .font('Helvetica')
         .text(`Issued on ${issueDate}`, margin, margin + 380, {
           align: 'center',
           width: pageWidth - 2 * margin
         });

      // Signature section
      doc.fontSize(12)
         .fillColor('#1f2937')
         .text('Director, Student LMS', pageWidth - margin - 200, pageHeight - margin - 80, {
           align: 'center',
           width: 150
         });

      // Certificate ID
      doc.fontSize(10)
         .fillColor('#9ca3af')
         .text(`Certificate ID: ${enrollment._id.toString()}`, margin, pageHeight - margin - 30);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateCertificate,
  getMyCertificates,
  getCertificateById,
  verifyCertificate,
  downloadCertificate,
  revokeCertificate,
  getAllCertificates,
  getCertificateStats,
  resendCertificate
};