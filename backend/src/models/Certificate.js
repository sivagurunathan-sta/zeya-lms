const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
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
  certificateId: {
    type: String,
    unique: true,
    required: true
  },
  finalScore: {
    type: Number,
    required: true
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

module.exports = mongoose.model('Certificate', certificateSchema);