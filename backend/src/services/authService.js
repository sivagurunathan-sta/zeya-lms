const bcrypt = require('bcryptjs');
const jwtUtil = require('../utils/jwt');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const emailService = require('../utils/email');
const logger = require('../utils/logger');
const { generateOTP } = require('../utils/helpers');

class AuthService {
  // Generate JWT token
  generateToken(userId, expiresIn = '24h') {
    return jwtUtil.sign(
      { userId },
      { expiresIn }
    );
  }

  // Generate refresh token
  generateRefreshToken(userId) {
    return jwtUtil.signRefresh(
      { userId },
      { expiresIn: '7d' }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwtUtil.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Register new user
  async register(userData) {
    const db = getDB();
    const { email, password, firstName, lastName, phone, role = 'STUDENT' } = userData;

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const userDoc = {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      role,
      avatar: null,
      isActive: true,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      loginAttempts: 0,
      lockUntil: null
    };

    const result = await db.collection('users').insertOne(userDoc);
    const userId = result.insertedId.toString();

    // Generate tokens
    const token = this.generateToken(userId);
    const refreshToken = this.generateRefreshToken(userId);

    // Store refresh token
    await db.collection('refreshTokens').insertOne({
      userId: new ObjectId(userId),
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Send verification email
    try {
      await emailService.sendEmailVerification({
        ...userDoc,
        emailVerificationToken
      });
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(userDoc);
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
    }

    const user = {
      id: userId,
      email,
      firstName,
      lastName,
      role,
      emailVerified: false
    };

    return {
      user,
      token,
      refreshToken,
      message: 'User registered successfully. Please verify your email.'
    };
  }

  // Login user
  async login(email, password, ipAddress = null, userAgent = null) {
    const db = getDB();

    // Find user
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase() 
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const lockTimeLeft = Math.ceil((user.lockUntil - new Date()) / (1000 * 60));
      throw new Error(`Account locked. Try again in ${lockTimeLeft} minutes.`);
    }

    // Check password
    const isMatch = await this.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      // Increment login attempts
      await this.handleFailedLogin(user._id);
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Reset login attempts on successful login
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLoginAt: new Date(), updatedAt: new Date() }
      }
    );

    // Generate tokens
    const userId = user._id.toString();
    const token = this.generateToken(userId);
    const refreshToken = this.generateRefreshToken(userId);

    // Store refresh token
    await db.collection('refreshTokens').insertOne({
      userId: user._id,
      token: refreshToken,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Log login activity
    await db.collection('loginHistory').insertOne({
      userId: user._id,
      ipAddress,
      userAgent,
      loginAt: new Date(),
      success: true
    });

    const userData = {
      id: userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      avatar: user.avatar
    };

    return {
      user: userData,
      token,
      refreshToken,
      message: 'Login successful'
    };
  }

  // Handle failed login attempts
  async handleFailedLogin(userId) {
    const db = getDB();
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutes

    const user = await db.collection('users').findOne({ _id: userId });
    const attempts = (user.loginAttempts || 0) + 1;

    const updateData = { loginAttempts: attempts };

    if (attempts >= maxAttempts) {
      updateData.lockUntil = new Date(Date.now() + lockTime);
    }

    await db.collection('users').updateOne(
      { _id: userId },
      { $set: updateData }
    );

    // Log failed login
    await db.collection('loginHistory').insertOne({
      userId,
      loginAt: new Date(),
      success: false,
      attempts
    });
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    const db = getDB();

    try {
      // Verify refresh token
      const decoded = jwtUtil.verifyRefresh(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in database
      const storedToken = await db.collection('refreshTokens').findOne({
        token: refreshToken,
        userId: new ObjectId(decoded.userId)
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new Error('Refresh token expired or invalid');
      }

      // Generate new tokens
      const newToken = this.generateToken(decoded.userId);
      const newRefreshToken = this.generateRefreshToken(decoded.userId);

      // Update refresh token in database
      await db.collection('refreshTokens').updateOne(
        { _id: storedToken._id },
        {
          $set: {
            token: newRefreshToken,
            updatedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      );

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Logout user
  async logout(refreshToken) {
    const db = getDB();

    if (refreshToken) {
      await db.collection('refreshTokens').deleteOne({ token: refreshToken });
    }

    return { message: 'Logged out successfully' };
  }

  // Logout from all devices
  async logoutAll(userId) {
    const db = getDB();

    await db.collection('refreshTokens').deleteMany({
      userId: new ObjectId(userId)
    });

    return { message: 'Logged out from all devices' };
  }

  // Verify email
  async verifyEmail(token) {
    const db = getDB();

    const user = await db.collection('users').findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date()
        },
        $unset: {
          emailVerificationToken: 1,
          emailVerificationExpires: 1
        }
      }
    );

    return { message: 'Email verified successfully' };
  }

  // Resend email verification
  async resendEmailVerification(email) {
    const db = getDB();

    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase(),
      emailVerified: false
    });

    if (!user) {
      throw new Error('User not found or already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationToken,
          emailVerificationExpires,
          updatedAt: new Date()
        }
      }
    );

    // Send verification email
    await emailService.sendEmailVerification({
      ...user,
      emailVerificationToken
    });

    return { message: 'Verification email sent' };
  }

  // Request password reset
  async requestPasswordReset(email) {
    const db = getDB();

    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase() 
    });

    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
          updatedAt: new Date()
        }
      }
    );

    // Send reset email
    try {
      await emailService.sendPasswordReset(user, resetToken);
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      throw new Error('Failed to send reset email');
    }

    return { message: 'Password reset email sent' };
  }

  // Reset password
  async resetPassword(token, newPassword) {
    const db = getDB();

    const user = await db.collection('users').findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date()
        },
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1,
          loginAttempts: 1,
          lockUntil: 1
        }
      }
    );

    // Invalidate all refresh tokens
    await db.collection('refreshTokens').deleteMany({
      userId: user._id
    });

    return { message: 'Password reset successfully' };
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const db = getDB();

    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isMatch = await this.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date()
        }
      }
    );

    return { message: 'Password changed successfully' };
  }

  // Enable 2FA
  async enable2FA(userId) {
    const db = getDB();
    const speakeasy = require('speakeasy');

    const secret = speakeasy.generateSecret({
      name: 'Student LMS',
      length: 32
    });

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          twoFactorSecret: secret.base32,
          twoFactorEnabled: false, // Will be enabled after verification
          updatedAt: new Date()
        }
      }
    );

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      message: 'Scan the QR code with your authenticator app'
    };
  }

  // Verify and enable 2FA
  async verify2FA(userId, token) {
    const db = getDB();
    const speakeasy = require('speakeasy');

    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not initialized');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      throw new Error('Invalid 2FA token');
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          twoFactorEnabled: true,
          updatedAt: new Date()
        }
      }
    );

    return { message: '2FA enabled successfully' };
  }

  // Disable 2FA
  async disable2FA(userId, token) {
    const db = getDB();
    const speakeasy = require('speakeasy');

    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });

    if (!user || !user.twoFactorEnabled) {
      throw new Error('2FA not enabled');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      throw new Error('Invalid 2FA token');
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $unset: {
          twoFactorSecret: 1,
          twoFactorEnabled: 1
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    return { message: '2FA disabled successfully' };
  }

  // Get user security info
  async getSecurityInfo(userId) {
    const db = getDB();

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          lastLoginAt: 1,
          twoFactorEnabled: 1,
          createdAt: 1
        }
      }
    );

    const activeTokens = await db.collection('refreshTokens').countDocuments({
      userId: new ObjectId(userId),
      expiresAt: { $gt: new Date() }
    });

    const recentLogins = await db.collection('loginHistory')
      .find({ userId: new ObjectId(userId) })
      .sort({ loginAt: -1 })
      .limit(10)
      .toArray();

    return {
      lastLoginAt: user.lastLoginAt,
      twoFactorEnabled: user.twoFactorEnabled || false,
      activeDevices: activeTokens,
      recentLogins: recentLogins.map(login => ({
        loginAt: login.loginAt,
        ipAddress: login.ipAddress,
        userAgent: login.userAgent,
        success: login.success
      }))
    };
  }
}

module.exports = new AuthService();
