const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
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
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    required: true // References assignment ID within course
  },
  submissionData: {
    text: {
      type: String
    },
    files: [{
      filename: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true
      },
      size: {
        type: Number
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    externalLinks: [{
      title: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      description: {
        type: String
      }
    }]
  },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'revision_required'],
    default: 'submitted'
  },
  score: {
    points: {
      type: Number,
      min: 0
    },
    maxPoints: {
      type: Number,
      required: true,
      default: 100
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  feedback: {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: {
      type: String
    },
    reviewedAt: {
      type: Date
    },
    rubric: [{
      criteria: {
        type: String,
        required: true
      },
      points: {
        type: Number,
        required: true
      },
      maxPoints: {
        type: Number,
        required: true
      },
      comment: {
        type: String
      }
    }]
  },
  submissionHistory: [{
    version: {
      type: Number,
      required: true
    },
    submittedAt: {
      type: Date,
      required: true
    },
    submissionData: {
      text: String,
      files: [{
        filename: String,
        originalName: String,
        url: String,
        fileType: String,
        size: Number
      }]
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'revision_required']
    }
  }],
  dueDate: {
    type: Date
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 1
  },
  maxAttempts: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ student: 1, course: 1 });
submissionSchema.index({ status: 1, submittedAt: -1 });
submissionSchema.index({ course: 1, assignment: 1 });
submissionSchema.index({ dueDate: 1, isLate: 1 });

// Pre-save middleware to calculate percentage and check if late
submissionSchema.pre('save', function(next) {
  // Calculate percentage if score is provided
  if (this.score.points !== undefined && this.score.maxPoints) {
    this.score.percentage = Math.round((this.score.points / this.score.maxPoints) * 100);
  }
  
  // Check if submission is late
  if (this.dueDate && this.submittedAt > this.dueDate) {
    this.isLate = true;
  }
  
  next();
});

// Virtual for grade letter
submissionSchema.virtual('gradeLetter').get(function() {
  if (!this.score.percentage) return 'N/A';
  
  const percentage = this.score.percentage;
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 65) return 'D';
  return 'F';
});

// Virtual for days late
submissionSchema.virtual('daysLate').get(function() {
  if (!this.isLate || !this.dueDate) return 0;
  
  const diffTime = this.submittedAt - this.dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to add feedback
submissionSchema.methods.addFeedback = function(reviewerId, comments, score, rubric = []) {
  this.feedback = {
    reviewer: reviewerId,
    comments: comments,
    reviewedAt: new Date(),
    rubric: rubric
  };
  
  if (score !== undefined) {
    this.score.points = score;
  }
  
  return this.save();
};

// Method to update status
submissionSchema.methods.updateStatus = function(newStatus, reviewerId) {
  this.status = newStatus;
  
  if (reviewerId && !this.feedback.reviewer) {
    this.feedback.reviewer = reviewerId;
    this.feedback.reviewedAt = new Date();
  }
  
  return this.save();
};

// Method to add new version
submissionSchema.methods.addVersion = function(submissionData) {
  const newVersion = {
    version: this.submissionHistory.length + 1,
    submittedAt: new Date(),
    submissionData: submissionData,
    status: 'submitted'
  };
  
  this.submissionHistory.push(newVersion);
  this.submissionData = submissionData;
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.attempts += 1;
  
  return this.save();
};

// Static method to get submissions by course
submissionSchema.statics.findByCourse = function(courseId, status = null) {
  const query = { course: courseId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('student', 'profile.firstName profile.lastName userId')
    .populate('feedback.reviewer', 'profile.firstName profile.lastName')
    .sort({ submittedAt: -1 });
};

// Static method to get submissions by student
submissionSchema.statics.findByStudent = function(studentId, courseId = null) {
  const query = { student: studentId };
  if (courseId) query.course = courseId;
  
  return this.find(query)
    .populate('course', 'title')
    .populate('feedback.reviewer', 'profile.firstName profile.lastName')
    .sort({ submittedAt: -1 });
};

module.exports = mongoose.model('Submission', submissionSchema);