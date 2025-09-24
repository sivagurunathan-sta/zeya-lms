const twilio = require('twilio');
const logger = require('../utils/logger');
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      logger.warn('Twilio credentials not configured. SMS service disabled.');
    }
  }

  // Send SMS
  async sendSMS(to, message, options = {}) {
    if (!this.client) {
      logger.warn('SMS service not configured');
      return { success: false, message: 'SMS service not available' };
    }

    try {
      // Format phone number for Indian numbers
      const formattedNumber = this.formatPhoneNumber(to);
      
      const messageOptions = {
        body: message,
        from: this.fromNumber,
        to: formattedNumber,
        ...options
      };

      const result = await this.client.messages.create(messageOptions);

      // Log SMS for tracking
      await this.logSMS({
        to: formattedNumber,
        message,
        twilioSid: result.sid,
        status: result.status,
        sentAt: new Date()
      });

      logger.info(`SMS sent successfully to ${formattedNumber}: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      logger.error('SMS sending failed:', error);
      
      // Log failed SMS
      await this.logSMS({
        to: this.formatPhoneNumber(to),
        message,
        error: error.message,
        status: 'failed',
        sentAt: new Date()
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send OTP SMS
  async sendOTP(phoneNumber, otp, expiresIn = 10) {
    const message = `Your Student LMS verification code is: ${otp}. Valid for ${expiresIn} minutes. Do not share this code with anyone.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  // Send welcome SMS
  async sendWelcomeSMS(user) {
    if (!user.phone) return { success: false, message: 'No phone number provided' };

    const message = `Welcome to Student LMS, ${user.firstName}! Your account has been created successfully. Start your learning journey today. Login at ${process.env.FRONTEND_URL}`;
    
    return this.sendSMS(user.phone, message);
  }

  // Send enrollment confirmation SMS
  async sendEnrollmentSMS(user, internship) {
    if (!user.phone) return { success: false, message: 'No phone number provided' };

    const message = `Hi ${user.firstName}, you've successfully enrolled in "${internship.title}". Complete payment to start learning. Student LMS`;
    
    return this.sendSMS(user.phone, message);
  }

  // Send payment confirmation SMS
  async sendPaymentConfirmationSMS(user, internship, amount) {
    if (!user.phone) return { success: false, message: 'No phone number provided' };

    const message = `Payment of ₹${amount} for "${internship.title}" successful! You can now access course materials. Happy learning! - Student LMS`;
    
    return this.sendSMS(user.phone, message);
  }

  // Send task reminder SMS
  async sendTaskReminderSMS(user, task, daysLeft) {
    if (!user.phone) return { success: false, message: 'No phone number provided' };

    const message = `Reminder: Task "${task.title}" is due in ${daysLeft} days. Submit your work to stay on track. - Student LMS`;
    
    return this.sendSMS(user.phone, message);
  }

  // Send certificate notification SMS
  async sendCertificateSMS(user, internshipTitle) {
    if (!user.phone) return { success: false, message: 'No phone number provided' };

    const message = `Congratulations ${user.firstName}! Your certificate for "${internshipTitle}" is ready for download. Check your dashboard. - Student LMS`;
    
    return this.sendSMS(user.phone, message);
  }

  // Send bulk SMS
  async sendBulkSMS(recipients, message, options = {}) {
    const results = [];
    const batchSize = 10; // Process in batches to avoid rate limits

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(recipient => {
        const phoneNumber = typeof recipient === 'string' ? recipient : recipient.phone;
        const personalizedMessage = typeof recipient === 'object' && recipient.name 
          ? message.replace('{name}', recipient.name)
          : message;
        
        return this.sendSMS(phoneNumber, personalizedMessage, options);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map((result, index) => ({
        recipient: batch[index],
        ...result.value
      })));

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`Bulk SMS completed: ${successful} successful, ${failed} failed`);

    return {
      total: recipients.length,
      successful,
      failed,
      results
    };
  }

  // Send promotional SMS
  async sendPromotionalSMS(phoneNumbers, message) {
    // Add promotional disclaimer
    const promoMessage = `${message}\n\nReply STOP to opt out. Student LMS`;
    
    return this.sendBulkSMS(phoneNumbers, promoMessage);
  }

  // Verify phone number
  async verifyPhoneNumber(phoneNumber) {
    if (!this.client) {
      return { success: false, message: 'SMS service not available' };
    }

    try {
      const lookup = await this.client.lookups.v1.phoneNumbers(
        this.formatPhoneNumber(phoneNumber)
      ).fetch();

      return {
        success: true,
        isValid: true,
        phoneNumber: lookup.phoneNumber,
        countryCode: lookup.countryCode,
        carrier: lookup.carrier
      };
    } catch (error) {
      return {
        success: false,
        isValid: false,
        error: error.message
      };
    }
  }

  // Format phone number for Indian numbers
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle Indian phone numbers
    if (digits.length === 10 && !digits.startsWith('91')) {
      return `+91${digits}`;
    }
    
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    
    if (digits.length === 13 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    
    // Return as-is if already formatted or international
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }

  // Log SMS for tracking and analytics
  async logSMS(smsData) {
    try {
      const db = getDB();
      await db.collection('smsLogs').insertOne({
        ...smsData,
        createdAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to log SMS:', error);
    }
  }

  // Get SMS analytics
  async getSMSAnalytics(dateRange = {}) {
    const db = getDB();
    const { startDate, endDate } = dateRange;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.sentAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await db.collection('smsLogs').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSMS: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    // SMS by day
    const dailyStats = await db.collection('smsLogs').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$sentAt' },
            month: { $month: '$sentAt' },
            day: { $dayOfMonth: '$sentAt' }
          },
          count: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]).toArray();

    return {
      overview: analytics[0] || {
        totalSMS: 0,
        successful: 0,
        failed: 0,
        pending: 0
      },
      dailyStats
    };
  }

  // Handle SMS webhooks from Twilio
  async handleWebhook(webhookData) {
    const { MessageSid, MessageStatus, To, From, Body } = webhookData;

    try {
      const db = getDB();
      
      // Update SMS log with delivery status
      await db.collection('smsLogs').updateOne(
        { twilioSid: MessageSid },
        {
          $set: {
            status: MessageStatus,
            deliveredAt: MessageStatus === 'delivered' ? new Date() : null,
            updatedAt: new Date()
          }
        }
      );

      // Handle opt-out requests
      if (Body && Body.toUpperCase().includes('STOP')) {
        await this.handleOptOut(To);
      }

      logger.info(`SMS webhook processed: ${MessageSid} - ${MessageStatus}`);
    } catch (error) {
      logger.error('SMS webhook processing failed:', error);
    }
  }

  // Handle opt-out requests
  async handleOptOut(phoneNumber) {
    try {
      const db = getDB();
      
      // Add to opt-out list
      await db.collection('smsOptOuts').insertOne({
        phoneNumber: this.formatPhoneNumber(phoneNumber),
        optedOutAt: new Date()
      });

      // Update user record if exists
      await db.collection('users').updateOne(
        { phone: this.formatPhoneNumber(phoneNumber) },
        {
          $set: {
            smsOptOut: true,
            smsOptOutAt: new Date()
          }
        }
      );

      logger.info(`SMS opt-out processed for: ${phoneNumber}`);
    } catch (error) {
      logger.error('SMS opt-out processing failed:', error);
    }
  }

  // Check if number is opted out
  async isOptedOut(phoneNumber) {
    try {
      const db = getDB();
      const optOut = await db.collection('smsOptOuts').findOne({
        phoneNumber: this.formatPhoneNumber(phoneNumber)
      });

      return !!optOut;
    } catch (error) {
      logger.error('Opt-out check failed:', error);
      return false;
    }
  }

  // Send SMS with opt-out check
  async sendSMSWithOptOutCheck(phoneNumber, message, options = {}) {
    const isOptedOut = await this.isOptedOut(phoneNumber);
    
    if (isOptedOut) {
      return {
        success: false,
        message: 'Recipient has opted out of SMS notifications'
      };
    }

    return this.sendSMS(phoneNumber, message, options);
  }

  // Schedule SMS for later delivery
  async scheduleSMS(phoneNumber, message, scheduleTime, options = {}) {
    const db = getDB();

    const scheduledSMS = {
      phoneNumber: this.formatPhoneNumber(phoneNumber),
      message,
      scheduleTime: new Date(scheduleTime),
      options,
      status: 'scheduled',
      attempts: 0,
      createdAt: new Date()
    };

    const result = await db.collection('scheduledSMS').insertOne(scheduledSMS);

    logger.info(`SMS scheduled for ${scheduleTime}: ${result.insertedId}`);

    return {
      success: true,
      scheduledId: result.insertedId.toString(),
      scheduleTime
    };
  }

  // Process scheduled SMS (to be called by a cron job)
  async processScheduledSMS() {
    const db = getDB();
    const now = new Date();

    const scheduledSMS = await db.collection('scheduledSMS').find({
      status: 'scheduled',
      scheduleTime: { $lte: now },
      attempts: { $lt: 3 }
    }).toArray();

    const results = [];

    for (const sms of scheduledSMS) {
      try {
        const result = await this.sendSMSWithOptOutCheck(
          sms.phoneNumber,
          sms.message,
          sms.options
        );

        const updateData = {
          attempts: sms.attempts + 1,
          lastAttemptAt: now
        };

        if (result.success) {
          updateData.status = 'sent';
          updateData.sentAt = now;
          updateData.twilioSid = result.messageId;
        } else {
          updateData.status = sms.attempts + 1 >= 3 ? 'failed' : 'scheduled';
          updateData.error = result.error || result.message;
        }

        await db.collection('scheduledSMS').updateOne(
          { _id: sms._id },
          { $set: updateData }
        );

        results.push({
          id: sms._id.toString(),
          phoneNumber: sms.phoneNumber,
          success: result.success,
          error: result.error || result.message
        });
      } catch (error) {
        logger.error(`Failed to process scheduled SMS ${sms._id}:`, error);
        results.push({
          id: sms._id.toString(),
          phoneNumber: sms.phoneNumber,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new SMSService();