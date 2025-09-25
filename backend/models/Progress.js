const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Overall program progress
  overall: {
    currentDay: {
      type: Number,
      default: 1,
      min: 1,
      max: 35
    },
    percentageComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    totalTimeSpent: {
      type: Number,
      default: 0 // in minutes
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  // Task completion tracking
  tasks: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    taskNumber: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'completed', 'skipped'],
      default: 'not_started'
    },
    startedAt: Date,
    submittedAt: Date,
    completedAt: Date,
    timeSpent: {
      type: Number,
      default: 0 // in minutes
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    attempts: {
      type: Number,
      default: 0
    },
    wasSkipped: {
      type: Boolean,
      default: false
    },
    skipReason: String
  }],
  // Performance metrics
  performance: {
    averageScore: {
      type: Number,
      default: 0
    },
    tasksCompleted: {
      type: Number,
      default: 0
    },
    tasksSkipped: {
      type: Number,
      default: 0
    },
    onTimeSubmissions: {
      type: Number,
      default: 0
    },
    lateSubmissions: {
      type: Number,
      default: 0
    },
    consistencyScore: {
      type: Number,
      default: 100 // Starts at 100, decreases with skips and late submissions
    }
  },
  // Daily activity streaks
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date
  },
  // Milestones and achievements
  milestones: [{
    type: {
      type: String,
      enum: ['first_submission', 'week_complete', '10_tasks_done', 'perfect_score', 'streak_7', 'streak_14', 'halfway_point'],
      required: true
    },
    achievedAt: {
      type: Date,
      default: Date.now
    },
    taskNumber: Number, // Which task triggered this milestone
    description: String
  }],
  // Certificate eligibility tracking
  certificate: {
    isEligible: {
      type: Boolean,
      default: false
    },
    finalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    evaluationDate: Date,
    issued: {
      type: Boolean,
      default: false
    },
    issuedAt: Date,
    certificateUrl: String,
    verificationCode: String
  },
  // Weekly summaries
  weeklySummaries: [{
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    tasksCompleted: Number,
    averageScore: Number,
    timeSpent: Number, // minutes
    strengths: [String],
    improvements: [String],
    weekEndDate: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
progressSchema.index({ student: 1 });
progressSchema.index({ 'overall.currentDay': 1 });
progressSchema.index({ 'overall.percentageComplete': -1 });
progressSchema.index({ 'certificate.isEligible': 1 });

// Virtual for current week
progressSchema.virtual('currentWeek').get(function() {
  return Math.ceil(this.overall.currentDay / 7);
});

// Virtual for tasks remaining
progressSchema.virtual('tasksRemaining').get(function() {
  return 35 - this.performance.tasksCompleted;
});

// Method to update progress when task is completed
progressSchema.methods.completeTask = function(taskId, taskNumber, score, timeSpent, wasSkipped = false) {
  // Find or create task progress
  let taskProgress = this.tasks.find(t => t.taskId.toString() === taskId.toString());
  
  if (!taskProgress) {
    taskProgress = {
      taskId,
      taskNumber,
      status: 'not_started',
      attempts: 0,
      timeSpent: 0,
      wasSkipped: false
    };
    this.tasks.push(taskProgress);
  }
  
  // Update task progress
  if (wasSkipped) {
    taskProgress.status = 'skipped';
    taskProgress.wasSkipped = true;
    this.performance.tasksSkipped += 1;
    // Reduce consistency score for skipped tasks
    this.performance.consistencyScore = Math.max(0, this.performance.consistencyScore - 5);
  } else {
    taskProgress.status = 'completed';
    taskProgress.completedAt = new Date();
    taskProgress.score = score;
    this.performance.tasksCompleted += 1;
    
    // Update average score
    const totalScore = (this.performance.averageScore * (this.performance.tasksCompleted - 1)) + score;
    this.performance.averageScore = Math.round(totalScore / this.performance.tasksCompleted);
  }
  
  taskProgress.timeSpent += timeSpent;
  this.overall.totalTimeSpent += timeSpent;
  this.overall.lastAccessedAt = new Date();
  
  // Update current day and percentage
  this.overall.currentDay = Math.min(35, Math.max(this.overall.currentDay, taskNumber));
  this.overall.percentageComplete = Math.round((this.overall.currentDay / 35) * 100);
  
  // Check for completion
  if (this.overall.currentDay >= 35) {
    this.overall.completedAt = new Date();
    this.checkCertificateEligibility();
  }
  
  // Update streak
  this.updateStreak();
  
  // Check for milestones
  this.checkMilestones(taskNumber, score);
  
  return this.save();
};

// Method to update activity streak
progressSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivity = this.streaks.lastActivityDate;
  
  if (!lastActivity) {
    // First activity
    this.streaks.current = 1;
    this.streaks.longest = 1;
    this.streaks.lastActivityDate = today;
  } else {
    const lastActivityDate = new Date(lastActivity);
    lastActivityDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.streaks.current += 1;
      this.streaks.longest = Math.max(this.streaks.longest, this.streaks.current);
      this.streaks.lastActivityDate = today;
    } else if (daysDiff > 1) {
      // Streak broken
      this.streaks.current = 1;
      this.streaks.lastActivityDate = today;
    }
    // If daysDiff === 0, it's the same day, don't update
  }
};

// Method to check milestones
progressSchema.methods.checkMilestones = function(taskNumber, score) {
  const milestoneTypes = {
    first_submission: () => this.performance.tasksCompleted === 1,
    week_complete: () => taskNumber % 7 === 0,
    '10_tasks_done': () => this.performance.tasksCompleted === 10,
    perfect_score: () => score === 100,
    streak_7: () => this.streaks.current === 7,
    streak_14: () => this.streaks.current === 14,
    halfway_point: () => this.performance.tasksCompleted === 18
  };
  
  Object.keys(milestoneTypes).forEach(type => {
    if (milestoneTypes[type]() && !this.milestones.find(m => m.type === type)) {
      this.milestones.push({
        type,
        taskNumber,
        description: this.getMilestoneDescription(type)
      });
    }
  });
};

// Get milestone description
progressSchema.methods.getMilestoneDescription = function(type) {
  const descriptions = {
    first_submission: 'Congratulations on your first task submission!',
    week_complete: 'Great job completing a full week of tasks!',
    '10_tasks_done': 'Amazing! You\'ve completed 10 tasks!',
    perfect_score: 'Perfect score! Outstanding work!',
    streak_7: '7-day streak! You\'re on fire!',
    streak_14: '14-day streak! Incredible consistency!',
    halfway_point: 'Halfway there! Keep up the great work!'
  };
  return descriptions[type] || 'Milestone achieved!';
};

// Method to check certificate eligibility
progressSchema.methods.checkCertificateEligibility = function() {
  const finalScore = this.calculateFinalScore();
  
  this.certificate.finalScore = finalScore;
  this.certificate.isEligible = finalScore >= 75;
  this.certificate.evaluationDate = new Date();
  
  if (this.certificate.isEligible) {
    // Generate verification code
    this.certificate.verificationCode = this.generateVerificationCode();
  }
};

// Calculate final score considering performance, consistency, and submission timing
progressSchema.methods.calculateFinalScore = function() {
  let score = this.performance.averageScore;
  
  // Apply consistency bonus/penalty
  if (this.performance.consistencyScore > 90) {
    score += 5; // Bonus for high consistency
  } else if (this.performance.consistencyScore < 70) {
    score -= 5; // Penalty for low consistency
  }
  
  // Apply timing bonus/penalty
  const onTimeRate = this.performance.onTimeSubmissions / 
                     (this.performance.onTimeSubmissions + this.performance.lateSubmissions);
  
  if (onTimeRate > 0.9) {
    score += 3; // Bonus for mostly on-time submissions
  } else if (onTimeRate < 0.7) {
    score -= 3; // Penalty for many late submissions
  }
  
  return Math.min(100, Math.max(0, Math.round(score)));
};

// Generate verification code for certificate
progressSchema.methods.generateVerificationCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'LMS-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Static method to get leaderboard
progressSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ 'overall.isActive': true })
    .populate('student', 'profile.firstName profile.lastName profileImage')
    .sort({ 'certificate.finalScore': -1, 'overall.percentageComplete': -1 })
    .limit(limit);
};

module.exports = mongoose.model('Progress', progressSchema);