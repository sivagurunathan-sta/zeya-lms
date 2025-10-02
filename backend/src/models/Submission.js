const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  intern: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intern',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  githubLink: {
    type: String,
    default: ''
  },
  formUrl: {
    type: String,
    default: ''
  },
  files: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  feedback: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  nextTaskUnlockTime: {
    type: Date
  }
});

// Compound index to prevent duplicate submissions
submissionSchema.index({ intern: 1, task: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);