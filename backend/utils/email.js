const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.verifyConnection();
  }

  createTransporter() {
    // If no SMTP configured, fallback to JSON transport (no external connection)
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.info('Email: Using JSON transport (no SMTP configured)');
      return nodemailer.createTransport({ jsonTransport: true });
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service is ready');
    } catch (error) {
      logger.error('Email service configuration error:', error);
    }
  }

  async sendEmail(to, subject, text, html = null) {
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Student LMS'}" <${process.env.SMTP_USER || 'noreply@studentlms.com'}>`,
        to,
        subject,
        text,
        html: html || this.generateHtmlFromText(text)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('Preview URL: ' + nodemailer.getTestMessageUrl(info));
      }

      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return info;
    } catch (error) {
      logger.error('Email sending failed:', { error: error.message, to, subject });
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Student LMS!';
    const html = this.generateWelcomeEmailHtml(user);
    const text = `Welcome to Student LMS, ${user.firstName}! Your account has been created successfully.`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendEmailVerification(user) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = this.generateEmailVerificationHtml(user, verificationUrl);
    const text = `Please verify your email by clicking: ${verificationUrl}`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const html = this.generatePasswordResetHtml(user, resetUrl);
    const text = `Reset your password by clicking: ${resetUrl}`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendEnrollmentConfirmation(user, internship) {
    const subject = `Enrollment Confirmed - ${internship.title}`;
    const html = this.generateEnrollmentConfirmationHtml(user, internship);
    const text = `You have successfully enrolled in ${internship.title}. Complete payment to start learning.`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendPaymentConfirmation(user, internship, paymentDetails) {
    const subject = 'Payment Successful';
    const html = this.generatePaymentConfirmationHtml(user, internship, paymentDetails);
    const text = `Your payment of ₹${paymentDetails.amount} for ${internship.title} has been processed successfully.`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendTaskReviewNotification(user, task, status, feedback) {
    const subject = `Task ${status} - ${task.title}`;
    const html = this.generateTaskReviewHtml(user, task, status, feedback);
    const text = `Your submission for "${task.title}" has been ${status.toLowerCase()}.`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  async sendCertificateNotification(user, internship, certificateUrl) {
    const subject = 'Certificate Ready for Download';
    const html = this.generateCertificateNotificationHtml(user, internship, certificateUrl);
    const text = `Your certificate for "${internship.title}" is ready for download.`;
    
    return this.sendEmail(user.email, subject, text, html);
  }

  // HTML template generators
  generateHtmlFromText(text) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${text.replace(/\n/g, '<br>')}
      </div>
    `;
  }

  generateWelcomeEmailHtml(user) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Welcome to Student LMS!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            Thank you for joining our Learning Management System. We're excited to have you on board!
          </p>
          
          <div style="margin: 25px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">What you can do now:</h3>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li>Browse our internship programs</li>
              <li>Enroll in courses that interest you</li>
              <li>Complete tasks and assignments</li>
              <li>Earn certificates upon completion</li>
              <li>Build your professional portfolio</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Get Started
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p>Best regards,<br>The Student LMS Team</p>
        </div>
      </div>
    `;
  }

  generateEmailVerificationHtml(user, verificationUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Verify Your Email</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            Please verify your email address to complete your account setup.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If you can't click the button, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p>This link will expire in 24 hours.</p>
        </div>
      </div>
    `;
  }

  generatePasswordResetHtml(user, resetUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin: 0;">Reset Your Password</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If you didn't request this password reset, please ignore this email.<br>
            Your password will remain unchanged.
          </p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p>This link will expire in 10 minutes for security reasons.</p>
        </div>
      </div>
    `;
  }

  generateEnrollmentConfirmationHtml(user, internship) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #059669; margin: 0;">Enrollment Confirmed!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            You have successfully enrolled in:
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #059669; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">${internship.title}</h3>
            <p style="color: #6b7280; margin: 5px 0;">Duration: ${internship.duration} weeks</p>
            <p style="color: #6b7280; margin: 5px 0;">Category: ${internship.category}</p>
            <p style="color: #6b7280; margin: 5px 0;">Price: ₹${internship.price}</p>
          </div>
          
          <h3 style="color: #1f2937; margin: 25px 0 15px 0;">Next Steps:</h3>
          <ol style="color: #4b5563; padding-left: 20px;">
            <li>Complete the payment to unlock course materials</li>
            <li>Start with the first task</li>
            <li>Submit assignments for review</li>
            <li>Earn your certificate upon completion</li>
          </ol>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/courses" 
               style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Go to My Courses
            </a>
          </div>
        </div>
      </div>
    `;
  }

  generatePaymentConfirmationHtml(user, internship, paymentDetails) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #059669; margin: 0;">Payment Successful!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            Your payment has been processed successfully.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Course:</td>
                <td style="padding: 8px 0; color: #1f2937;">${internship.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Amount:</td>
                <td style="padding: 8px 0; color: #1f2937;">₹${paymentDetails.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Payment ID:</td>
                <td style="padding: 8px 0; color: #1f2937;">${paymentDetails.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0; color: #1f2937;">${new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #4b5563; margin: 20px 0;">
            You can now access all course materials and start your learning journey!
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/courses" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Start Learning
            </a>
          </div>
        </div>
      </div>
    `;
  }

  generateTaskReviewHtml(user, task, status, feedback) {
    const statusColors = {
      APPROVED: '#059669',
      REJECTED: '#dc2626',
      NEEDS_REVISION: '#f59e0b'
    };

    const statusMessages = {
      APPROVED: 'Congratulations! Your submission has been approved. You can now proceed to the next task.',
      REJECTED: 'Your submission has been rejected. Please review the feedback and try again.',
      NEEDS_REVISION: 'Your submission needs some revisions. Please make the suggested changes and resubmit.'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: ${statusColors[status]}; margin: 0;">Task ${status}</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            Your submission for "${task.title}" has been reviewed.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid ${statusColors[status]}; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">Review Details</h3>
            <p style="margin: 5px 0;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColors[status]};">${status}</span></p>
            ${feedback ? `<p style="margin: 15px 0 5px 0;"><strong>Feedback:</strong></p><p style="color: #4b5563; margin: 5px 0;">${feedback}</p>` : ''}
          </div>
          
          <p style="color: #4b5563; margin: 20px 0;">
            ${statusMessages[status]}
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/courses" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Course
            </a>
          </div>
        </div>
      </div>
    `;
  }

  generateCertificateNotificationHtml(user, internship, certificateUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">🎓 Certificate Ready!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Congratulations ${user.firstName}!</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">
            Your certificate for "${internship.title}" is now ready for download.
          </p>
          
          <div style="background-color: white; padding: 30px; border-radius: 6px; margin: 20px 0; text-align: center; border: 2px dashed #7c3aed;">
            <h3 style="color: #7c3aed; margin: 0 0 10px 0;">🏆 Certificate of Completion</h3>
            <p style="color: #6b7280; font-size: 18px; margin: 0;">${internship.title}</p>
          </div>
          
          <p style="color: #4b5563; margin: 20px 0;">
            You have successfully completed all requirements and demonstrated mastery of the course material.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${certificateUrl}" 
               style="background-color: #7c3aed; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
              Download Certificate
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
            Share your achievement with the world and add it to your professional portfolio!
          </p>
        </div>
      </div>
    `;
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
module.exports = {
  sendEmail: (...args) => emailService.sendEmail(...args),
  sendWelcomeEmail: (...args) => emailService.sendWelcomeEmail(...args),
  sendEmailVerification: (...args) => emailService.sendEmailVerification(...args),
  sendPasswordReset: (...args) => emailService.sendPasswordReset(...args),
  sendEnrollmentConfirmation: (...args) => emailService.sendEnrollmentConfirmation(...args),
  sendPaymentConfirmation: (...args) => emailService.sendPaymentConfirmation(...args),
  sendTaskReviewNotification: (...args) => emailService.sendTaskReviewNotification(...args),
  sendCertificateNotification: (...args) => emailService.sendCertificateNotification(...args),
};
