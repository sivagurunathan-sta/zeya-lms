const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { uploadToS3 } = require('../utils/upload');
const notificationService = require('./notificationService');
const emailService = require('../utils/email');
const logger = require('../utils/logger');

class CertificateService {
  // Generate certificate for completed enrollment
  async generateCertificate(enrollmentId, studentId) {
    const db = getDB();

    // Verify enrollment and completion status
    const enrollment = await this.getEnrollmentForCertificate(enrollmentId, studentId);
    
    // Check if certificate already exists
    const existingCertificate = await db.collection('certificates').findOne({
      enrollmentId: new ObjectId(enrollmentId)
    });

    if (existingCertificate) {
      return {
        ...existingCertificate,
        id: existingCertificate._id.toString(),
        message: 'Certificate already exists'
      };
    }

    // Generate certificate data and PDF
    const certificateData = await this.createCertificateData(enrollment);
    const pdfBuffer = await this.generateCertificatePDF(certificateData);
    
    // Upload to cloud storage
    const certificateUrl = await this.uploadCertificate(pdfBuffer, enrollmentId);
    
    // Generate verification hash and QR code
    const verificationHash = this.generateVerificationHash(certificateData);
    const qrCodeData = await this.generateQRCodeData(verificationHash);
    
    // Save certificate record
    const certificateDoc = {
      enrollmentId: new ObjectId(enrollmentId),
      studentId: new ObjectId(studentId),
      internshipId: new ObjectId(enrollment.internship._id),
      certificateNumber: this.generateCertificateNumber(),
      verificationHash,
      certificateUrl,
      qrCodeData,
      metadata: {
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        internshipTitle: enrollment.internship.title,
        completedDate: enrollment.completedAt,
        duration: enrollment.internship.duration,
        totalTasks: enrollment.internship.totalTasks,
        completedTasks: enrollment.taskSubmissions.length,
        finalScore: this.calculateFinalScore(enrollment),
        grade: this.calculateGrade(enrollment)
      },
      issuedAt: new Date(),
      isValid: true,
      revokedAt: null,
      revocationReason: null
    };

    const result = await db.collection('certificates').insertOne(certificateDoc);

    // Update enrollment
    await db.collection('enrollments').updateOne(
      { _id: new ObjectId(enrollmentId) },
      { 
        $set: { 
          certificateIssued: true,
          certificateId: result.insertedId,
          updatedAt: new Date()
        } 
      }
    );

    // Send notifications
    try {
      await emailService.sendCertificateNotification(
        enrollment.student,
        enrollment.internship,
        certificateUrl
      );

      await notificationService.createCertificateNotification(
        studentId,
        enrollment.internship.title,
        certificateUrl
      );
    } catch (notificationError) {
      logger.error('Failed to send certificate notifications:', notificationError);
    }

    logger.info(`Certificate generated for enrollment ${enrollmentId}`);

    return {
      ...certificateDoc,
      id: result.insertedId.toString(),
      message: 'Certificate generated successfully'
    };
  }

  // Get enrollment data for certificate generation
  async getEnrollmentForCertificate(enrollmentId, studentId) {
    const db = getDB();

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
      throw new Error('Enrollment not found');
    }

    const enrollmentData = enrollment[0];

    // Verify ownership
    if (enrollmentData.student._id.toString() !== studentId) {
      throw new Error('Unauthorized access to enrollment');
    }

    // Check eligibility requirements
    if (enrollmentData.paymentStatus !== 'COMPLETED') {
      throw new Error('Payment must be completed before certificate generation');
    }

    if (enrollmentData.status !== 'COMPLETED') {
      throw new Error('Course must be completed before certificate generation');
    }

    // Verify minimum completion requirements (75% of tasks)
    const completedTasks = enrollmentData.taskSubmissions.length;
    const totalTasks = enrollmentData.internship.totalTasks;
    const completionRate = (completedTasks / totalTasks) * 100;

    if (completionRate < 75) {
      throw new Error(`Minimum 75% task completion required for certificate (currently ${Math.round(completionRate)}%)`);
    }

    return enrollmentData;
  }

  // Create certificate data object
  async createCertificateData(enrollment) {
    return {
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      studentEmail: enrollment.student.email,
      internshipTitle: enrollment.internship.title,
      internshipCategory: enrollment.internship.category,
      duration: enrollment.internship.duration,
      completedDate: enrollment.completedAt,
      enrolledDate: enrollment.enrolledAt,
      totalTasks: enrollment.internship.totalTasks,
      completedTasks: enrollment.taskSubmissions.length,
      finalScore: this.calculateFinalScore(enrollment),
      grade: this.calculateGrade(enrollment),
      certificateId: crypto.randomUUID()
    };
  }

  // Generate PDF certificate
  async generateCertificatePDF(certificateData) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          layout: 'landscape',
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 40, right: 40 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Background and borders
        doc.rect(0, 0, pageWidth, pageHeight).fill('#f8fafc');
        doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
           .lineWidth(3)
           .stroke('#2563eb');
        doc.rect(45, 45, pageWidth - 90, pageHeight - 90)
           .lineWidth(1)
           .stroke('#6b7280');

        // Header section
        doc.fillColor('#1f2937')
           .fontSize(42)
           .font('Helvetica-Bold')
           .text('CERTIFICATE', 0, 80, {
             align: 'center',
             width: pageWidth
           });

        doc.fillColor('#6b7280')
           .fontSize(18)
           .font('Helvetica')
           .text('OF COMPLETION', 0, 135, {
             align: 'center',
             width: pageWidth
           });

        // Decorative line
        doc.moveTo(pageWidth * 0.3, 165)
           .lineTo(pageWidth * 0.7, 165)
           .lineWidth(2)
           .stroke('#2563eb');

        // Certificate content
        doc.fillColor('#1f2937')
           .fontSize(16)
           .font('Helvetica')
           .text('This is to certify that', 0, 195, {
             align: 'center',
             width: pageWidth
           });

        // Student name (prominent)
        doc.fillColor('#2563eb')
           .fontSize(36)
           .font('Helvetica-Bold')
           .text(certificateData.studentName, 0, 235, {
             align: 'center',
             width: pageWidth
           });

        // Course completion text
        doc.fillColor('#1f2937')
           .fontSize(16)
           .font('Helvetica')
           .text('has successfully completed the internship program', 0, 290, {
             align: 'center',
             width: pageWidth
           });

        // Course title
        doc.fillColor('#059669')
           .fontSize(26)
           .font('Helvetica-Bold')
           .text(certificateData.internshipTitle, 0, 325, {
             align: 'center',
             width: pageWidth
           });

        // Course details
        const detailsY = 380;
        doc.rect(pageWidth * 0.2, detailsY, pageWidth * 0.6, 85)
           .fillAndStroke('#f8fafc', '#d1d5db');

        doc.fillColor('#374151')
           .fontSize(12)
           .font('Helvetica');

        // Left column
        doc.text(`Duration: ${certificateData.duration} weeks`, pageWidth * 0.25, detailsY + 15)
           .text(`Category: ${certificateData.internshipCategory}`, pageWidth * 0.25, detailsY + 35)
           .text(`Tasks Completed: ${certificateData.completedTasks}/${certificateData.totalTasks}`, pageWidth * 0.25, detailsY + 55);

        // Right column
        doc.text(`Final Score: ${certificateData.finalScore}%`, pageWidth * 0.6, detailsY + 15)
           .text(`Grade: ${certificateData.grade}`, pageWidth * 0.6, detailsY + 35)
           .text(`Completed: ${new Date(certificateData.completedDate).toLocaleDateString()}`, pageWidth * 0.6, detailsY + 55);

        // Footer section
        const footerY = pageHeight - 120;

        // Certificate number
        doc.fillColor('#6b7280')
           .fontSize(10)
           .font('Helvetica')
           .text(`Certificate ID: ${certificateData.certificateId}`, 60, footerY + 60);

        // Issue date
        doc.text(`Issued: ${new Date().toLocaleDateString()}`, pageWidth - 200, footerY + 60);

        // Signature
        doc.fillColor('#1f2937')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('Director, Student LMS', pageWidth - 180, footerY, {
             align: 'center',
             width: 140
           });

        // Add QR code for verification
        try {
          const qrCodeBuffer = await QRCode.toBuffer(
            `${process.env.FRONTEND_URL}/verify-certificate?id=${certificateData.certificateId}`,
            {
              width: 80,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            }
          );

          doc.image(qrCodeBuffer, 70, footerY - 20, { width: 60, height: 60 });
          
          doc.fillColor('#6b7280')
             .fontSize(8)
             .text('Scan to verify', 75, footerY + 45);
        } catch (qrError) {
          logger.warn('Failed to generate QR code for certificate:', qrError);
        }

        // Watermark
        doc.fillColor('#f3f4f6')
           .fontSize(60)
           .font('Helvetica-Bold')
           .text('STUDENT LMS', 0, pageHeight / 2 - 30, {
             align: 'center',
             width: pageWidth,
             opacity: 0.1
           });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Upload certificate to cloud storage
  async uploadCertificate(pdfBuffer, enrollmentId) {
    try {
      const fileName = `certificate-${enrollmentId}-${Date.now()}.pdf`;
      const s3Key = `certificates/${fileName}`;

      return await uploadToS3(pdfBuffer, s3Key, 'application/pdf');
    } catch (error) {
      logger.error('Failed to upload certificate to S3:', error);
      throw new Error('Failed to upload certificate to cloud storage');
    }
  }

  // Generate unique certificate number
  generateCertificateNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp.slice(-8)}-${random}`;
  }

  // Generate verification hash
  generateVerificationHash(certificateData) {
    const dataString = JSON.stringify({
      studentName: certificateData.studentName,
      studentEmail: certificateData.studentEmail,
      internshipTitle: certificateData.internshipTitle,
      completedDate: certificateData.completedDate,
      finalScore: certificateData.finalScore,
      certificateId: certificateData.certificateId
    });

    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Generate QR code data for verification
  async generateQRCodeData(verificationHash) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-certificate?hash=${verificationHash}`;
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return {
        url: verifyUrl,
        hash: verificationHash,
        qrCode: qrCodeDataURL
      };
    } catch (error) {
      logger.warn('Failed to generate QR code data:', error);
      return {
        url: verifyUrl,
        hash: verificationHash,
        qrCode: null
      };
    }
  }

  // Calculate final score based on task submissions
  calculateFinalScore(enrollment) {
    if (!enrollment.taskSubmissions.length) return 0;

    const totalScore = enrollment.taskSubmissions.reduce((sum, submission) => {
      return sum + (submission.grade || 8); // Default grade of 8/10 if not provided
    }, 0);

    const avgScore = totalScore / enrollment.taskSubmissions.length;
    return Math.round(avgScore * 10); // Convert to percentage
  }

  // Calculate grade based on score
  calculateGrade(enrollment) {
    const score = this.calculateFinalScore(enrollment);
    
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    return 'D';
  }

  // Get student's certificates
  async getStudentCertificates(studentId, pagination = {}) {
    const db = getDB();
    const { page = 1, limit = 10 } = pagination;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const certificates = await db.collection('certificates').aggregate([
      { $match: { studentId: new ObjectId(studentId), isValid: true } },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1, category: 1, thumbnail: 1, duration: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { issuedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('certificates').countDocuments({
      studentId: new ObjectId(studentId),
      isValid: true
    });

    return {
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
    };
  }

  // Get certificate by ID
  async getCertificateById(certificateId) {
    const db = getDB();

    const certificate = await db.collection('certificates').aggregate([
      { $match: { _id: new ObjectId(certificateId), isValid: true } },
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
      { $unwind: '$internship' }
    ]).toArray();

    if (!certificate.length) {
      throw new Error('Certificate not found or invalid');
    }

    return {
      ...certificate[0],
      id: certificate[0]._id.toString()
    };
  }

  // Verify certificate by hash
  async verifyCertificate(verificationHash) {
    const db = getDB();

    const certificate = await db.collection('certificates').findOne({
      verificationHash,
      isValid: true
    });

    if (!certificate) {
      return {
        isValid: false,
        message: 'Certificate not found or has been revoked'
      };
    }

    // Get full certificate details
    const fullCertificate = await this.getCertificateById(certificate._id);

    return {
      isValid: true,
      certificate: fullCertificate,
      message: 'Certificate is valid and authentic',
      verifiedAt: new Date()
    };
  }

  // Revoke certificate (Admin only)
  async revokeCertificate(certificateId, reason, revokedBy) {
    const db = getDB();

    const result = await db.collection('certificates').updateOne(
      { _id: new ObjectId(certificateId) },
      {
        $set: {
          isValid: false,
          revokedAt: new Date(),
          revocationReason: reason,
          revokedBy: new ObjectId(revokedBy),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Certificate not found');
    }

    logger.info(`Certificate revoked: ${certificateId} by ${revokedBy}`);

    return { 
      success: true, 
      message: 'Certificate revoked successfully',
      revokedAt: new Date()
    };
  }

  // Get all certificates for admin with filters
  async getAllCertificates(filters = {}, pagination = {}) {
    const db = getDB();
    const { isValid, studentId, internshipId, startDate, endDate } = filters;
    const { page = 1, limit = 10, sortBy = 'issuedAt', sortOrder = 'desc' } = pagination;

    const filter = {};
    if (isValid !== undefined) filter.isValid = isValid;
    if (studentId) filter.studentId = new ObjectId(studentId);
    if (internshipId) filter.internshipId = new ObjectId(internshipId);
    if (startDate && endDate) {
      filter.issuedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

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
            { $project: { title: 1, category: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: sort },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('certificates').countDocuments(filter);

    return {
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
    };
  }

  // Get certificate statistics
  async getCertificateStats(period = 'month') {
    const db = getDB();

    const stats = await db.collection('certificates').aggregate([
      {
        $group: {
          _id: null,
          totalCertificates: { $sum: 1 },
          validCertificates: {
            $sum: { $cond: [{ $eq: ['$isValid', true] }, 1, 0] }
          },
          revokedCertificates: {
            $sum: { $cond: [{ $eq: ['$isValid', false] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    // Get certificates by period
    let groupBy;
    switch (period) {
      case 'day':
        groupBy = {
          year: { $year: '$issuedAt' },
          month: { $month: '$issuedAt' },
          day: { $dayOfMonth: '$issuedAt' }
        };
        break;
      case 'week':
        groupBy = {
          year: { $year: '$issuedAt' },
          week: { $week: '$issuedAt' }
        };
        break;
      case 'year':
        groupBy = {
          year: { $year: '$issuedAt' }
        };
        break;
      default: // month
        groupBy = {
          year: { $year: '$issuedAt' },
          month: { $month: '$issuedAt' }
        };
    }

    const periodStats = await db.collection('certificates').aggregate([
      { $match: { isValid: true } },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 12 }
    ]).toArray();

    return {
      overview: stats[0] || { 
        totalCertificates: 0, 
        validCertificates: 0, 
        revokedCertificates: 0 
      },
      periodStats,
      period
    };
  }

  // Resend certificate email
  async resendCertificate(certificateId, studentId) {
    const certificate = await this.getCertificateById(certificateId);

    if (certificate.student._id.toString() !== studentId) {
      throw new Error('Unauthorized access to certificate');
    }

    try {
      await emailService.sendCertificateNotification(
        certificate.student,
        certificate.internship,
        certificate.certificateUrl
      );

      logger.info(`Certificate email resent for certificate ${certificateId}`);

      return { 
        success: true, 
        message: 'Certificate email sent successfully' 
      };
    } catch (error) {
      logger.error('Failed to resend certificate email:', error);
      throw new Error('Failed to send certificate email');
    }
  }
}

module.exports = new CertificateService();
