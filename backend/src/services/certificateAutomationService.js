// src/services/certificateAutomationService.js
const { PrismaClient } = require('@prisma/client');
const { generateCertificateNumber } = require('../utils/helpers');
const prisma = new PrismaClient();

class CertificateAutomationService {
  /**
   * Automatically create certificate session after payment verification
   */
  async createCertificateSession(paymentId) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          intern: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          internship: {
            select: {
              title: true
            }
          }
        }
      });

      if (!payment || payment.paymentType !== 'CERTIFICATE') {
        throw new Error('Invalid payment for certificate');
      }

      // Get enrollment
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          internId: payment.internId,
          internshipId: payment.internshipId
        }
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Check if session already exists
      const existingSession = await prisma.certificateSession.findFirst({
        where: {
          enrollmentId: enrollment.id,
          paymentId: payment.id
        }
      });

      if (existingSession) {
        return { existing: true, session: existingSession };
      }

      // Create certificate session
      const session = await prisma.certificateSession.create({
        data: {
          enrollmentId: enrollment.id,
          internId: payment.internId,
          paymentId: payment.id,
          status: 'PENDING_UPLOAD',
          sessionStartedAt: new Date(),
          expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Update enrollment
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          certificatePurchased: true,
          certificateSessionEnabled: true,
          certificateSessionEnabledAt: new Date()
        }
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: payment.internId,
          title: '🎉 Certificate Processing Started',
          message: `Your certificate for "${payment.internship.title}" is being prepared. Expected delivery: ${session.expectedDeliveryAt.toLocaleString('en-IN')}`,
          type: 'SUCCESS'
        }
      });

      // Notify admin
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (admin) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: '📜 Certificate Upload Required',
            message: `Certificate needs to be uploaded for ${payment.intern.name} - ${payment.internship.title}`,
            type: 'WARNING'
          }
        });
      }

      return { existing: false, session };

    } catch (error) {
      console.error('Create certificate session error:', error);
      throw error;
    }
  }

  /**
   * Check and notify about pending certificate uploads (24+ hours)
   */
  async checkPendingCertificates() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const pendingSessions = await prisma.certificateSession.findMany({
        where: {
          status: 'PENDING_UPLOAD',
          sessionStartedAt: {
            lt: twentyFourHoursAgo
          }
        },
        include: {
          intern: {
            select: {
              id: true,
              name: true
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
      });

      for (const session of pendingSessions) {
        // Notify admin
        const admin = await prisma.user.findFirst({
          where: { role: 'ADMIN' }
        });

        if (admin) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: '⚠️ Certificate Upload Overdue',
              message: `Certificate for ${session.intern.name} - ${session.enrollment.internship.title} is overdue by ${Math.floor((Date.now() - session.expectedDeliveryAt.getTime()) / (1000 * 60 * 60))} hours`,
              type: 'ERROR'
            }
          });
        }

        // Notify intern about delay
        await prisma.notification.create({
          data: {
            userId: session.internId,
            title: '⏰ Certificate Delayed',
            message: `We apologize for the delay in your certificate. Our team is working on it and you'll receive it soon.`,
            type: 'WARNING'
          }
        });
      }

      return {
        checked: pendingSessions.length,
        overdue: pendingSessions.length
      };

    } catch (error) {
      console.error('Check pending certificates error:', error);
      throw error;
    }
  }

  /**
   * Issue certificate with auto-generated number
   */
  async issueCertificate(sessionId, certificateUrl, uploadedBy) {
    try {
      const session = await prisma.certificateSession.findUnique({
        where: { id: sessionId },
        include: {
          intern: {
            select: {
              id: true,
              name: true,
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
      });

      if (!session) {
        throw new Error('Certificate session not found');
      }

      if (session.status === 'COMPLETED') {
        throw new Error('Certificate already issued');
      }

      // Generate certificate number
      const certificateNumber = generateCertificateNumber();

      // Update session
      await prisma.certificateSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          certificateUrl,
          certificateNumber,
          issuedAt: new Date(),
          uploadedBy,
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

      // Notify intern
      await prisma.notification.create({
        data: {
          userId: session.internId,
          title: '🎓 Certificate Ready!',
          message: `Congratulations! Your certificate for "${session.enrollment.internship.title}" is now available. Certificate Number: ${certificateNumber}. You can download it from your dashboard.`,
          type: 'SUCCESS'
        }
      });

      return {
        success: true,
        certificateNumber,
        certificateUrl
      };

    } catch (error) {
      console.error('Issue certificate error:', error);
      throw error;
    }
  }

  /**
   * Get certificate statistics for admin dashboard
   */
  async getCertificateStats() {
    try {
      const [
        totalIssued,
        pendingSessions,
        overdueSessionsCount,
        issuedToday,
        issuedThisWeek,
        issuedThisMonth
      ] = await Promise.all([
        prisma.certificateSession.count({
          where: { status: 'COMPLETED' }
        }),
        prisma.certificateSession.count({
          where: { status: 'PENDING_UPLOAD' }
        }),
        prisma.certificateSession.count({
          where: {
            status: 'PENDING_UPLOAD',
            expectedDeliveryAt: {
              lt: new Date()
            }
          }
        }),
        prisma.certificateSession.count({
          where: {
            status: 'COMPLETED',
            issuedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.certificateSession.count({
          where: {
            status: 'COMPLETED',
            issuedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.certificateSession.count({
          where: {
            status: 'COMPLETED',
            issuedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      // Get average time to issue
      const completedSessions = await prisma.certificateSession.findMany({
        where: { status: 'COMPLETED' },
        select: {
          sessionStartedAt: true,
          issuedAt: true
        }
      });

      let avgTimeToIssue = 0;
      if (completedSessions.length > 0) {
        const totalTime = completedSessions.reduce((sum, session) => {
          return sum + (session.issuedAt - session.sessionStartedAt);
        }, 0);
        avgTimeToIssue = Math.round(totalTime / completedSessions.length / (1000 * 60 * 60)); // hours
      }

      return {
        totalIssued,
        pendingSessions,
        overdueSessionsCount,
        issuedToday,
        issuedThisWeek,
        issuedThisMonth,
        avgTimeToIssueHours: avgTimeToIssue
      };

    } catch (error) {
      console.error('Get certificate stats error:', error);
      throw error;
    }
  }

  /**
   * Validate certificate by number
   */
  async validateCertificateByNumber(certificateNumber) {
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          certificateNumber,
          certificatePurchased: true
        },
        include: {
          intern: {
            select: {
              name: true,
              email: true
            }
          },
          internship: {
            select: {
              title: true,
              durationDays: true
            }
          }
        }
      });

      if (!enrollment) {
        return {
          valid: false,
          message: 'Certificate not found or invalid'
        };
      }

      return {
        valid: true,
        certificate: {
          certificateNumber: enrollment.certificateNumber,
          internName: enrollment.intern.name,
          internshipTitle: enrollment.internship.title,
          completionDate: enrollment.completionDate,
          finalScore: enrollment.finalScore,
          issuedAt: enrollment.certificateIssuedAt,
          durationDays: enrollment.internship.durationDays
        }
      };

    } catch (error) {
      console.error('Validate certificate error:', error);
      throw error;
    }
  }

  /**
   * Send certificate reminder to intern
   */
  async sendCertificateReminder(sessionId) {
    try {
      const session = await prisma.certificateSession.findUnique({
        where: { id: sessionId },
        include: {
          intern: true,
          enrollment: {
            include: {
              internship: true
            }
          }
        }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const hoursRemaining = Math.max(
        0,
        Math.ceil((session.expectedDeliveryAt - new Date()) / (1000 * 60 * 60))
      );

      await prisma.notification.create({
        data: {
          userId: session.internId,
          title: '⏰ Certificate Update',
          message: hoursRemaining > 0
            ? `Your certificate for "${session.enrollment.internship.title}" will be ready in approximately ${hoursRemaining} hours.`
            : `Your certificate is being finalized and will be available very soon!`,
          type: 'INFO'
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Send reminder error:', error);
      throw error;
    }
  }
}

module.exports = new CertificateAutomationService();