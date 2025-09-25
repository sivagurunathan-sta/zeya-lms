// backend/models/Task.js - Enhanced for 35-day internship program

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskNumber: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 35 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  instructions: {
    type: String,
    required: true
  },
  resources: [{
    name: String,
    url: String,
    type: { type: String, enum: ['document', 'video', 'link', 'image'] }
  }],
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  estimatedTime: { 
    type: Number, // in hours
    default: 4 
  },
  category: {
    type: String,
    enum: ['frontend', 'backend', 'fullstack', 'database', 'api', 'testing', 'deployment'],
    required: true
  },
  prerequisites: [{ 
    type: Number // task numbers that should be completed first
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  maxScore: {
    type: Number,
    default: 100
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure task numbers are unique
taskSchema.index({ taskNumber: 1 }, { unique: true });

module.exports = mongoose.model('Task', taskSchema);