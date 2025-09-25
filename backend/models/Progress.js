const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  overall: {
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
    completedAt: {
      type: Date
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    totalTimeSpent: {
      type: Number,
      default: 0 // in minutes
    }
  },
  modules: [{
    moduleId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    timeSpent: {
      type: Number,
      default: 0 // in minutes
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  assignments: [{
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    submitted: {
      type: Boolean,
      default: false
    },
    submittedAt: {
      type: Date
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'graded'],
      default: 'not_started'
    }
  }],
  certificates: [{
    type: {
      type: String,
      enum: ['completion', 'achievement', 'participation'],
      required: true
    },
issuedAt: {
      type: Date,
      default: Date.now
    },
    certificateUrl: {
      type: String
    },
    verificationCode: {
      type: String,
      unique: true
    }
  }],
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastActivityDate: {
      type: Date
    }
  },
  achievements: [{
    type: {
      type: String,
      enum: ['first_login', 'first_submission', 'course_completion', 'perfect_score', 'streak_milestone'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: {
      type: String
    }
  }]
}, {
  timestamps: true
});

// Indexes
progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ 'overall.percentageComplete': 1 });
progressSchema.index({ 'overall.completedAt': 1 });

// Method to update overall progress
progressSchema.methods.updateOverallProgress = function() {
  const completedModules = this.modules.filter(module => module.completed).length;
  const totalModules = this.modules.length;
  
  if (totalModules > 0) {
    this.overall.percentageComplete = Math.round((completedModules / totalModules) * 100);
  }
  
  if (this.overall.percentageComplete === 100 && !this.overall.completedAt) {
    this.overall.completedAt = new Date();
  }
  
  this.overall.lastAccessedAt = new Date();
  return this.save();
};

// Method to mark module as complete
progressSchema.methods.completeModule = function(moduleId, timeSpent = 0, score = null) {
  const module = this.modules.find(m => m.moduleId === moduleId);
  
  if (module) {
    module.completed = true;
    module.completedAt = new Date();
    module.timeSpent += timeSpent;
    if (score !== null) module.score = score;
  } else {
    this.modules.push({
      moduleId: moduleId,
      completed: true,
      completedAt: new Date(),
      timeSpent: timeSpent,
      score: score
    });
  }
  
  this.overall.totalTimeSpent += timeSpent;
  return this.updateOverallProgress();
};

// Method to update streak
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
  
  return this.save();
};

module.exports = mongoose.model('Progress', progressSchema);