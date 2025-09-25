const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: {
    type: {
      type: String,
      enum: ['all', 'specific', 'course', 'role'],
      default: 'all'
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    roles: [{
      type: String,
      enum: ['admin', 'student']
    }]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['general', 'academic', 'technical', 'maintenance', 'event'],
    default: 'general'
  },
  attachments: [{
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
    }
  }],
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowComments: {
      type: Boolean,
      default: false
    },
    sendEmail: {
      type: Boolean,
      default: false
    },
    sendPush: {
      type: Boolean,
      default: true
    },
    pinned: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
announcementSchema.index({ sender: 1, createdAt: -1 });
announcementSchema.index({ 'recipients.type': 1, scheduledFor: 1 });
announcementSchema.index({ priority: 1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for read count
announcementSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for is expired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark as read by user
announcementSchema.methods.markAsReadBy = function(userId) {
  const alreadyRead = this.readBy.find(read => 
    read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to check if user has read
announcementSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => 
    read.user.toString() === userId.toString()
  );
};

// Static method to get announcements for user
announcementSchema.statics.getForUser = async function(userId, userRole, userCourses = []) {
  const now = new Date();
  
  const query = {
    isPublished: true,
    scheduledFor: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: now } }
    ],
    $or: [
      { 'recipients.type': 'all' },
      { 'recipients.users': userId },
      { 'recipients.roles': userRole },
      { 'recipients.courses': { $in: userCourses } }
    ]
  };
  
  return this.find(query)
    .populate('sender', 'profile.firstName profile.lastName')
    .sort({ 'settings.pinned': -1, priority: -1, createdAt: -1 });
};

// Static method to get unread count for user
announcementSchema.statics.getUnreadCountForUser = async function(userId, userRole, userCourses = []) {
  const announcements = await this.getForUser(userId, userRole, userCourses);
  return announcements.filter(announcement => !announcement.isReadBy(userId)).length;
};

module.exports = mongoose.model('Announcement', announcementSchema);