const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  taskNumber: {
    type: Number,
    required: true
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
  materials: [{
    type: String
  }],
  videos: [{
    type: String
  }],
  submissionType: {
    type: String,
    enum: ['GITHUB', 'FILE', 'FORM'],
    default: 'GITHUB'
  },
  formUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique task numbers per course
taskSchema.index({ course: 1, taskNumber: 1 }, { unique: true });

module.exports = mongoose.model('Task', taskSchema);