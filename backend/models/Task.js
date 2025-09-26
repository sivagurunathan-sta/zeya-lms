const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskNumber: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 35,
    unique: true
  },
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true
  },
  instructions: {
    type: String,
    required: true
  },
  // Enhanced resource structure
  resources: {
    videos: [{
      title: String,
      url: String,
      duration: Number, // in minutes
      thumbnail: String
    }],
    articles: [{
      title: String,
      url: String,
      readTime: Number // estimated reading time in minutes
    }],
    documents: [{
      title: String,
      url: String,
      fileType: {
        type: String,
        enum: ['pdf', 'doc', 'docx', 'txt', 'md']
      }
    }],
    tools: [String], // Array of tools/technologies needed
    githubRepos: [{
      title: String,
      url: String,
      description: String
    }]
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  estimatedTime: { 
    type: Number, // in hours
    default: 4,
    min: 0.5,
    max: 24
  },
  category: {
    type: String,
    enum: ['frontend', 'backend', 'fullstack', 'database', 'api', 'testing', 'deployment', 'devops', 'design'],
    required: true
  },
  prerequisites: [{ 
    type: Number, // task numbers that should be completed first
    min: 1,
    max: 35
  }],
  // Submission requirements
  submissionRequirements: {
    requiresGithubRepo: {
      type: Boolean,
      default: true
    },
    requiresLiveDemo: {
      type: Boolean,
      default: false
    },
    requiresDocumentation: {
      type: Boolean,
      default: false
    },
    allowedFileTypes: [{
      type: String,
      enum: ['zip', 'pdf', 'doc', 'docx', 'txt', 'md']
    }],
    maxFiles: {
      type: Number,
      default: 3
    },
    submissionTemplate: String // Template or format for submissions
  },
  // Scoring criteria
  scoringCriteria: [{
    criterion: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    description: String
  }],
  maxScore: {
    type: Number,
    default: 100
  },
  passingScore: {
    type: Number,
    default: 60
  },
  // Task status and metadata
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isPaid: {
    type: Boolean,
    default: false // true for paid tasks after certificate
  },
  price: {
    type: Number,
    default: 1000 // ₹1000 for paid tasks
  },
  // Learning outcomes
  learningOutcomes: [String],
  skills: [String], // Skills that will be learned/practiced
  
  // Auto-grading (future feature)
  autoGrading: {
    enabled: {
      type: Boolean,
      default: false
    },
    testCases: [{
      input: String,
      expectedOutput: String,
      weight: Number
    }],
    gradingScript: String
  },
  
  // Statistics
  stats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    successfulCompletions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    averageCompletionTime: {
      type: Number,
      default: 0
    }
  },
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
taskSchema.index({ taskNumber: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ difficulty: 1 });
taskSchema.index({ isActive: 1 });
taskSchema.index({ isPaid: 1 });
taskSchema.index({ 'stats.averageScore': -1 });

// Virtual for completion rate
taskSchema.virtual('completionRate').get(function() {
  if (this.stats.totalAttempts === 0) return 0;
  return Math.round((this.stats.successfulCompletions / this.stats.totalAttempts) * 100);
});

// Virtual for difficulty level description
taskSchema.virtual('difficultyDescription').get(function() {
  const descriptions = {
    easy: 'Beginner level - Basic concepts and simple implementation',
    medium: 'Intermediate level - Moderate complexity with some challenges',
    hard: 'Advanced level - Complex concepts requiring deep understanding'
  };
  return descriptions[this.difficulty] || 'Not specified';
});

// Method to update task statistics
taskSchema.methods.updateStats = async function(score, completionTime, wasSuccessful = true) {
  this.stats.totalAttempts += 1;
  
  if (wasSuccessful) {
    this.stats.successfulCompletions += 1;
  }
  
  // Update average score
  const totalScore = this.stats.averageScore * (this.stats.totalAttempts - 1) + score;
  this.stats.averageScore = Math.round(totalScore / this.stats.totalAttempts);
  
  // Update average completion time
  const totalTime = this.stats.averageCompletionTime * (this.stats.totalAttempts - 1) + completionTime;
  this.stats.averageCompletionTime = Math.round(totalTime / this.stats.totalAttempts);
  
  return this.save();
};

// Method to check if user can access this task
taskSchema.methods.canUserAccess = function(user) {
  // Check if task is active
  if (!this.isActive) return { canAccess: false, reason: 'Task is not active' };
  
  // Check if it's a paid task and user has certificate
  if (this.isPaid && !user.internshipProgress.certificateIssued) {
    return { canAccess: false, reason: 'Certificate required for paid tasks' };
  }
  
  // Check if user has completed prerequisites
  const userCompletedTasks = user.internshipProgress.completedTasks.map(t => t.taskId);
  const unmetPrereqs = this.prerequisites.filter(prereq => {
    // Find the prerequisite task and check if user completed it
    return !userCompletedTasks.some(completedTaskId => {
      // This would need to be enhanced with actual task lookup
      return true; // Simplified for now
    });
  });
  
  if (unmetPrereqs.length > 0) {
    return { 
      canAccess: false, 
      reason: `Complete prerequisite tasks: ${unmetPrereqs.join(', ')}` 
    };
  }
  
  return { canAccess: true };
};

// Static method to get tasks for a specific day/range
taskSchema.statics.getTasksForDay = function(dayNumber) {
  return this.find({ 
    taskNumber: dayNumber,
    isActive: true 
  }).populate('createdBy', 'profile.firstName profile.lastName');
};

// Static method to get tasks by category
taskSchema.statics.getTasksByCategory = function(category) {
  return this.find({ 
    category,
    isActive: true 
  }).sort({ taskNumber: 1 });
};

// Static method to get paid tasks
taskSchema.statics.getPaidTasks = function() {
  return this.find({ 
    isPaid: true,
    isActive: true 
  }).sort({ taskNumber: 1 });
};

module.exports = mongoose.model('Task', taskSchema);