// backend/src/utils/helpers.js
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateUserId = async () => {
  const year = new Date().getFullYear();
  let userId;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    userId = `INT${year}${randomNum}`;
    
    const user = await prisma.user.findFirst({
      where: { userId }
    });
    
    exists = !!user;
  }

  return userId;
};

const generatePaymentQR = async (paymentData) => {
  try {
    const { amount, type } = paymentData;
    const upiId = process.env.UPI_ID || 'merchant@upi';
    const merchantName = process.env.MERCHANT_NAME || 'LMS Platform';
    
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${type}`)}`;
    
    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

const generateCertificateNumber = () => {
  const prefix = 'CERT';
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}-${year}-${randomNum}`;
};

const calculateProgress = (totalTasks, completedTasks) => {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
};

const createAuditLog = async (action, userId, details = {}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        details: JSON.stringify(details),
        timestamp: new Date(),
        ipAddress: details.ipAddress || null
      }
    }).catch(() => {
      console.log(`[AUDIT] ${action} by ${userId}:`, details);
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = {
  generateUserId,
  generatePaymentQR,
  generateCertificateNumber,
  calculateProgress,
  createAuditLog
};