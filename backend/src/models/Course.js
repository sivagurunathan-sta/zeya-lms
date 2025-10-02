const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    required: true,
    default: 35
  },
  price: {
    type: Number,
    required: true,
    default: 499
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalTasks: {
    type: Number,
    default: 0
  },
  enrolledInterns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intern'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Course', courseSchema);