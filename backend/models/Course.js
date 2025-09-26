const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    hours: {
      type: Number,
      default: 0
    },
    weeks: {
      type: Number,
      default: 0
    }
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    documents: [{
      title: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        enum: ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx'],
        required: true
      },
      size: {
        type: Number // in bytes
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    videos: [{
      title: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      duration: {
        type: Number // in seconds
      },
      thumbnail: {
        type: String
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
  assignments: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    submissionLink: {
      type: String,
      required: true
    },
    dueDate: {
      type: Date
    },
    maxScore: {
      type: Number,
      default: 100
    },
    instructions: {
      type: String
    }
  }],
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  requirements: [String],
  objectives: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  maxEnrollments: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  price: {
    type: Number,
    default: 0
  },
  certificateTemplate: {
    type: String // URL to certificate template
  }
}, {
  timestamps: true
});

// Indexes
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ isActive: 1 });
courseSchema.index({ instructor: 1 });

// Virtual for enrollment count
courseSchema.virtual('enrollmentCount').get(function() {
  return this.enrolledStudents.length;
});

// Virtual for available slots
courseSchema.virtual('availableSlots').get(function() {
  if (this.maxEnrollments === 0) return 'Unlimited';
  return Math.max(0, this.maxEnrollments - this.enrolledStudents.length);
});

// Method to check if user is enrolled
courseSchema.methods.isUserEnrolled = function(userId) {
  return this.enrolledStudents.some(enrollment => 
    enrollment.student.toString() === userId.toString()
  );
};

// Method to enroll student
courseSchema.methods.enrollStudent = function(studentId) {
  if (this.isUserEnrolled(studentId)) {
    throw new Error('Student is already enrolled in this course');
  }
  
  if (this.maxEnrollments > 0 && this.enrolledStudents.length >= this.maxEnrollments) {
    throw new Error('Course enrollment limit reached');
  }
  
  this.enrolledStudents.push({
    student: studentId,
    enrolledAt: new Date(),
    progress: 0
  });
  
  return this.save();
};

// Method to update student progress
courseSchema.methods.updateStudentProgress = function(studentId, progress) {
  const enrollment = this.enrolledStudents.find(e => 
    e.student.toString() === studentId.toString()
  );
  
  if (!enrollment) {
    throw new Error('Student is not enrolled in this course');
  }
  
  enrollment.progress = Math.min(100, Math.max(0, progress));
  return this.save();
};

// Static method to get courses by instructor
courseSchema.statics.findByInstructor = function(instructorId) {
  return this.find({ instructor: instructorId });
};

module.exports = mongoose.model('Course', courseSchema);