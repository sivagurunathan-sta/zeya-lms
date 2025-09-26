// utils/helpers.js
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;

const prisma = new PrismaClient();

// Configure Cloudinary (you'll need to set these env variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Generate unique intern ID
 */
async function generateUserId() {
  const currentYear = new Date().getFullYear();
  const prefix = `INT${currentYear}`;
  
  // Find the latest user ID with current year
  const latestUser = await prisma.user.findFirst({
    where: {
      userId: {
        startsWith: prefix
      }
    },
    orderBy: { userId: 'desc' }
  });

  let nextNumber = 1;
  if (latestUser) {
    const lastNumber = parseInt(latestUser.userId.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Generate QR code for payments
 */
async function generatePaymentQR(paymentData) {
  try {
    // You can customize this based on your payment gateway
    const paymentInfo = {
      upi_id: process.env.UPI_ID || 'company@upi',
      amount: paymentData.amount,
      note: `Payment for ${paymentData.type}`,
      reference: `${paymentData.internId}-${Date.now()}`
    };

    // Generate UPI payment URL
    const upiUrl = `upi://pay?pa=${paymentInfo.upi_id}&am=${paymentInfo.amount}&tn=${encodeURIComponent(paymentInfo.note)}&tr=${paymentInfo.reference}`;

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2
    });

    // Upload to Cloudinary (or save locally)
    const uploadResult = await cloudinary.uploader.upload(qrCodeDataURL, {
      folder: 'lms/qrcodes',
      public_id: `payment_${paymentInfo.reference}`,
      resource_type: 'image'
    });

    return uploadResult.secure_url;

  } catch (error) {
    console.error('Generate payment QR error:', error);
    throw new Error('Failed to generate payment QR code');
  }
}

/**
 * Generate certificate PDF
 */
async function generateCertificate(intern, internship) {
  try {
    // This is a simplified version. You'd want to use a proper PDF library like jsPDF or PDFKit
    const certificateData = {
      internName: intern.name,
      internId: intern.userId,
      internshipTitle: internship.title,
      completionDate: new Date().toLocaleDateString('en-IN'),
      issueDate: new Date().toLocaleDateString('en-IN')
    };

    // For now, we'll create a simple HTML template and convert to PDF
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(45deg, #f0f8ff, #e6f3ff);
          }
          .certificate {
            border: 5px solid #1e3a8a;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .header { 
            font-size: 36px; 
            color: #1e3a8a; 
            margin-bottom: 20px;
            font-weight: bold;
          }
          .subheader {
            font-size: 18px;
            color: #666;
            margin-bottom: 40px;
          }
          .name {
            font-size: 28px;
            color: #059669;
            font-weight: bold;
            margin: 20px 0;
            text-decoration: underline;
          }
          .course {
            font-size: 20px;
            color: #1e3a8a;
            margin: 20px 0;
            font-style: italic;
          }
          .date {
            font-size: 14px;
            color: #666;
            margin-top: 40px;
          }
          .id {
            font-size: 12px;
            color: #999;
            position: absolute;
            bottom: 20px;
            right: 20px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">CERTIFICATE OF COMPLETION</div>
          <div class="subheader">This is to certify that</div>
          <div class="name">${certificateData.internName}</div>
          <div class="subheader">has successfully completed</div>
          <div class="course">${certificateData.internshipTitle}</div>
          <div class="subheader">with dedication and excellence</div>
          <div class="date">
            Completed on: ${certificateData.completionDate}<br>
            Certificate issued on: ${certificateData.issueDate}
          </div>
          <div class="id">Intern ID: ${certificateData.internId}</div>
        </div>
      </body>
      </html>
    `;

    // In a real implementation, you'd convert this HTML to PDF using puppeteer or similar
    // For now, we'll upload the HTML as a file
    const fileName = `certificate_${intern.userId}_${Date.now()}.html`;
    
    const uploadResult = await cloudinary.uploader.upload(`data:text/html;base64,${Buffer.from(certificateHTML).toString('base64')}`, {
      folder: 'lms/certificates',
      public_id: fileName,
      resource_type: 'raw'
    });

    return uploadResult.secure_url;

  } catch (error) {
    console.error('Generate certificate error:', error);
    throw new Error('Failed to generate certificate');
  }
}

/**
 * Calculate intern progress
 */
async function calculateProgress(internId, internshipId) {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        internId_internshipId: {
          internId,
          internshipId
        }
      },
      include: {
        submissions: {
          include: {
            task: {
              select: {
                points: true
              }
            }
          }
        },
        internship: {
          select: {
            passPercentage: true
          }
        }
      }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Get total tasks and points for the internship
    const totalTasks = await prisma.task.count({
      where: { internshipId }
    });

    const totalPointsQuery = await prisma.task.aggregate({
      where: { internshipId },
      _sum: { points: true }
    });

    const totalPoints = totalPointsQuery._sum.points || 0;

    // Calculate progress
    const completedTasks = enrollment.submissions.length;
    const earnedPoints = enrollment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    
    const isEligible = progressPercentage >= 100 && scorePercentage >= enrollment.internship.passPercentage;

    // Update enrollment if completed
    if (progressPercentage >= 100 && !enrollment.isCompleted) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          isCompleted: true,
          completionDate: new Date(),
          finalScore: scorePercentage,
          certificateEligible: isEligible
        }
      });
    }

    return {
      totalTasks,
      completedTasks,
      progressPercentage: Math.round(progressPercentage),
      earnedPoints,
      totalPoints,
      scorePercentage: Math.round(scorePercentage),
      isEligible,
      isCompleted: progressPercentage >= 100
    };

  } catch (error) {
    console.error('Calculate progress error:', error);
    throw new Error('Failed to calculate progress');
  }
}

/**
 * Send notification to user
 */
async function sendNotification(userId, title, message, type = 'INFO') {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      }
    });

    // Here you could also send email, SMS, or push notifications
    // Example: await sendEmail(userId, title, message);

    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
    throw new Error('Failed to send notification');
  }
}

/**
 * Upload file to Cloudinary
 */
async function uploadFile(file, folder = 'lms/files') {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto', // Automatically detect file type
      public_id: `${folder}/${Date.now()}_${file.originalname}`,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Upload file error:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Delete file from Cloudinary
 */
async function deleteFile(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Delete file error:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Format date for Indian locale
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate random password
 */
function generatePassword(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Validate GitHub URL
 */
function isValidGitHubUrl(url) {
  const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
  return githubUrlRegex.test(url);
}

/**
 * Calculate time remaining for task submission
 */
function getTimeRemaining(deadline) {
  const now = new Date();
  const diff = deadline - now;
  
  if (diff <= 0) {
    return { expired: true, message: 'Deadline passed' };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    expired: false,
    hours,
    minutes,
    message: `${hours}h ${minutes}m remaining`
  };
}

/**
 * Generate analytics data
 */
async function generateAnalytics(startDate, endDate) {
  try {
    const [
      enrollmentStats,
      submissionStats,
      paymentStats,
      completionStats
    ] = await Promise.all([
      // Enrollment statistics
      prisma.enrollment.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Submission statistics
      prisma.submission.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Payment statistics
      prisma.payment.groupBy({
        by: ['paymentStatus', 'paymentType'],
        _sum: { amount: true },
        _count: { id: true },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Completion statistics
      prisma.enrollment.groupBy({
        by: ['isCompleted'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ]);

    return {
      enrollments: enrollmentStats,
      submissions: submissionStats,
      payments: paymentStats,
      completions: completionStats
    };

  } catch (error) {
    console.error('Generate analytics error:', error);
    throw new Error('Failed to generate analytics');
  }
}

module.exports = {
  generateUserId,
  generatePaymentQR,
  generateCertificate,
  calculateProgress,
  sendNotification,
  uploadFile,
  deleteFile,
  formatDate,
  generatePassword,
  isValidGitHubUrl,
  getTimeRemaining,
  generateAnalytics
};