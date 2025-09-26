const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  googleId: {
    type: String,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student'
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
    },
    dateOfBirth: {
      type: Date
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    bio: {
      type: String,
      maxlength: 500
    }
  },
  profileImage: {
    type: String // URL to profile image
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // Internship-specific fields
  internshipProgress: {
    currentDay: {
      type: Number,
      default: 0,
      min: 0,
      max: 35
    },
    completedTasks: [{
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      wasSkipped: {
        type: Boolean,
        default: false
      }
    }],
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    certificateEligible: {
      type: Boolean,
      default: false
    },
    certificateIssued: {
      type: Boolean,
      default: false
    },
    certificateUrl: String,
    enrollmentDate: Date,
    completionDate: Date
  },
  // Payment and monetization
  paymentInfo: {
    hasPurchasedCertificate: {
      type: Boolean,
      default: false
    },
    certificatePurchaseDate: Date,
    paidTasksAccess: [{
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
      },
      purchasedAt: {
        type: Date,
        default: Date.now
      },
      paymentId: String
    }],
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  }],
  notifications: [{
    title: String,
    message: String,
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'error'],
      default: 'info'
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  // Activity tracking
  streakInfo: {
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ userId: 1 });
userSchema.index({ 'profile.email': 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'internshipProgress.currentDay': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for progress percentage
userSchema.virtual('progressPercentage').get(function() {
  return Math.round((this.internshipProgress.currentDay / 35) * 100);
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed attempts');
  }
  
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  
  if (isMatch) {
    // Reset login attempts on successful login
    if (this.loginAttempts > 0) {
      this.loginAttempts = 0;
      this.lockUntil = undefined;
      this.lastLogin = new Date();
      await this.save();
    }
    return true;
  } else {
    // Increment login attempts
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
    
    await this.save();
    return false;
  }
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      userId: this.userId, 
      role: this.role,
      email: this.profile.email
    },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Update progress method
userSchema.methods.updateProgress = function(taskId, score = 0, wasSkipped = false) {
  const existingTask = this.internshipProgress.completedTasks.find(
    task => task.taskId.toString() === taskId.toString()
  );
  
  if (!existingTask) {
    this.internshipProgress.completedTasks.push({
      taskId,
      score,
      wasSkipped,
      completedAt: new Date()
    });
    
    this.internshipProgress.currentDay = Math.min(35, this.internshipProgress.currentDay + 1);
  }
  
  // Recalculate overall score
  this.calculateOverallScore();
  
  // Check certificate eligibility
  if (this.internshipProgress.currentDay >= 35) {
    this.internshipProgress.certificateEligible = this.internshipProgress.overallScore >= 75;
    if (!this.internshipProgress.completionDate) {
      this.internshipProgress.completionDate = new Date();
    }
  }
  
  return this.save();
};

// Calculate overall score
userSchema.methods.calculateOverallScore = function() {
  const completedTasks = this.internshipProgress.completedTasks;
  if (completedTasks.length === 0) {
    this.internshipProgress.overallScore = 0;
    return;
  }
  
  let totalScore = 0;
  let scoreReduction = 0;
  
  completedTasks.forEach(task => {
    totalScore += task.score;
    if (task.wasSkipped) {
      scoreReduction += 5; // 5% reduction for each skipped task
    }
  });
  
  const averageScore = totalScore / completedTasks.length;
  this.internshipProgress.overallScore = Math.max(0, averageScore - scoreReduction);
};

// Add notification method
userSchema.methods.addNotification = function(title, message, type = 'info') {
  this.notifications.unshift({
    title,
    message,
    type,
    createdAt: new Date()
  });
  
  // Keep only last 50 notifications
  if (this.notifications.length > 50) {
    this.notifications = this.notifications.slice(0, 50);
  }
  
  return this.save();
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(identifier) {
  const user = await this.findOne({
    $or: [
      { userId: identifier },
      { 'profile.email': identifier }
    ]
  });
  
  return user;
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = async function(limit = 10) {
  return this.find({ 
    role: 'student',
    status: 'active',
    'internshipProgress.overallScore': { $gt: 0 }
  })
  .sort({ 'internshipProgress.overallScore': -1 })
  .limit(limit)
  .select('profile.firstName profile.lastName internshipProgress.overallScore internshipProgress.currentDay profileImage');
};

module.exports = mongoose.model('User', userSchema);