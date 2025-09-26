const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  // GitHub repository link (main requirement)
  githubRepo: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/.test(v);
      },
      message: 'Please provide a valid GitHub repository URL'
    }
  },
  // Live demo link (optional)
  liveDemoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL for live demo'
    }
  },
  // Submission description/notes
  submissionText: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  // Additional files (screenshots, docs, etc.)
  additionalFiles: [{
    filename: String,
    originalName: String,
    url: String,
    fileType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Completion details
  completionTime: {
    type: Number, // hours taken to complete
    min: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Status and review
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'revision_required'],
    default: 'submitted'
  },
  // Scoring
  score: {
    points: {
      type: Number,
      min: 0,
      max: 100
    },
    breakdown: [{
      criterion: String,
      points: Number,
      maxPoints: Number,
      comment: String
    }]
  },
  // Review and feedback
  review: {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    overallFeedback: String,
    strengths: [String],
    improvements: [String],
    codeQualityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    functionalityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    documentationScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  // Automated analysis (future feature)
  automaticAnalysis: {
    codeComplexity: Number,
    testCoverage: Number,
    linesOfCode: Number,
    filesCount: Number,
    technologies: [String],
    lastCommitDate: Date
  },
  // Timing and deadlines
  dueDate: Date,
  isLate: {
    type: Boolean,
    default: false
  },
  lateBy: {
    type: Number, // hours late
    default: 0
  },
  // Resubmission tracking
  attempt: {
    type: Number,
    default: 1,
    min: 1
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  previousSubmissions: [{
    githubRepo: String,
    submittedAt: Date,
    score: Number,
    feedback: String,
    status: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
submissionSchema.index({ student: 1, task: 1 });
submissionSchema.index({ status: 1, submittedAt: -1 });
submissionSchema.index({ task: 1, status: 1 });
submissionSchema.index({ dueDate: 1, isLate: 1 });
submissionSchema.index({ 'review.reviewer': 1 });

// Virtual for grade letter
submissionSchema.virtual('gradeLetter').get(function() {
  if (!this.score.points) return 'N/A';
  
  const percentage = this.score.points;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
});

// Virtual for days late
submissionSchema.virtual('daysLate').get(function() {
  if (!this.isLate || !this.dueDate) return 0;
  return Math.ceil(this.lateBy / 24);
});

// Virtual for can resubmit
submissionSchema.virtual('canResubmit').get(function() {
  return this.attempt < this.maxAttempts && this.status === 'revision_required';
});

// Pre-save middleware to check if late
submissionSchema.pre('save', function(next) {
  if (this.dueDate && this.submittedAt > this.dueDate) {
    this.isLate = true;
    this.lateBy = Math.ceil((this.submittedAt - this.dueDate) / (1000 * 60 * 60)); // hours
  }
  next();
});

// Method to add review
submissionSchema.methods.addReview = function(reviewerId, overallFeedback, scores, breakdown) {
  this.review = {
    reviewer: reviewerId,
    reviewedAt: new Date(),
    overallFeedback,
    ...scores
  };
  
  if (breakdown) {
    this.score.breakdown = breakdown;
  }
  
  // Calculate final score
  const totalPoints = breakdown ? breakdown.reduce((sum, item) => sum + item.points, 0) : 0;
  this.score.points = totalPoints;
  
  return this.save();
};

// Method to resubmit
submissionSchema.methods.resubmit = function(newGithubRepo, newSubmissionText) {
  // Store previous submission
  this.previousSubmissions.push({
    githubRepo: this.githubRepo,
    submittedAt: this.submittedAt,
    score: this.score.points,
    feedback: this.review.overallFeedback,
    status: this.status
  });
  
  // Update with new submission
  this.githubRepo = newGithubRepo;
  this.submissionText = newSubmissionText;
  this.submittedAt = new Date();
  this.status = 'submitted';
  this.attempt += 1;
  
  // Clear previous review
  this.review = {};
  this.score = {};
  
  return this.save();
};

module.exports = mongoose.model('Submission', submissionSchema);