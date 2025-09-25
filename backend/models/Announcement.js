const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Enhanced recipient targeting
  recipients: {
    type: {
      type: String,
      enum: ['all', 'specific', 'role', 'progress_based', 'performance_based'],
      default: 'all'
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    roles: [{
      type: String,
      enum: ['admin', 'student']
    }],
    // Progress-based targeting
    progressCriteria: {
      minDay: Number,
      maxDay: Number,
      certificateStatus: {
        type: String,
        enum: ['eligible', 'not_eligible', 'issued', 'any']
      }
    },
    // Performance-based targeting
    performanceCriteria: {
      minScore: Number,
      maxScore: Number,
      consistency: {
        type: String,
        enum: ['high', 'medium', 'low', 'any']
      }
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['general', 'academic', 'technical', 'maintenance', 'event', 'reminder', 'congratulations'],
    default: 'general'
  },
  // Rich content support
  content: {
    type: {
      type: String,
      enum: ['text', 'html', 'markdown'],
      default: 'text'
    },
    attachments: [{
      filename: String,
      originalName: String,
      url: String,
      fileType: String,
      size: Number
    }],
    images: [{
      url: String,
      caption: String
    }],
    links: [{
      title: String,
      url: String,
      description: String
    }]
  },
  // Scheduling and expiration
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  isPublished: {
    type: Boolean,
    default: true
  },
  // Engagement tracking
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    },
    device: String,
    ipAddress: String
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'helpful', 'confused'],
      default: 'like'
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Display settings
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
    },
    showOnDashboard: {
      type: Boolean,
      default: true
    },
    autoArchive: {
      type: Boolean,
      default: true
    }
  },
  // Comments (if enabled)
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      maxlength: 1000
    },
    postedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    clickThroughs: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
announcementSchema.index({ sender: 1, createdAt: -1 });
announcementSchema.index({ 'recipients.type': 1, scheduledFor: 1 });
announcementSchema.index({ priority: 1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
announcementSchema.index({ 'settings.pinned': -1, createdAt: -1 });
announcementSchema.index({ category: 1, isPublished: 1 });

// Virtual for read count
announcementSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for is expired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for engagement rate calculation
announcementSchema.virtual('calculatedEngagementRate').get(function() {
  if (this.analytics.uniqueViews === 0) return 0;
  const engagements = this.readBy.length + this.reactions.length + this.comments.length;
  return Math.round((engagements / this.analytics.uniqueViews) * 100);
});

// Method to mark as read by user
announcementSchema.methods.markAsReadBy = function(userId, device, ipAddress) {
  const alreadyRead = this.readBy.find(read => 
    read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
      device,
      ipAddress
    });
    
    // Update analytics
    this.analytics.views += 1;
    this.analytics.uniqueViews += 1;
    this.analytics.engagementRate = this.calculatedEngagementRate;
    
    return this.save();
  } else {
    // Update view count but not unique views
    this.analytics.views += 1;
    return this.save();
  }
};

// Method to add reaction
announcementSchema.methods.addReaction = function(userId, reactionType) {
  const existingReaction = this.reactions.find(r => 
    r.user.toString() === userId.toString()
  );
  
  if (existingReaction) {
    existingReaction.type = reactionType;
    existingReaction.reactedAt = new Date();
  } else {
    this.reactions.push({
      user: userId,
      type: reactionType
    });
  }
  
  this.analytics.engagementRate = this.calculatedEngagementRate;
  return this.save();
};

// Method to add comment
announcementSchema.methods.addComment = function(userId, message) {
  if (!this.settings.allowComments) {
    throw new Error('Comments are not allowed on this announcement');
  }
  
  this.comments.push({
    user: userId,
    message: message.trim()
  });
  
  this.analytics.engagementRate = this.calculatedEngagementRate;
  return this.save();
};

// Static method to get announcements for user based on criteria
announcementSchema.statics.getForUser = async function(userId, userRole, userProgress) {
  const now = new Date();
  
  const baseQuery = {
    isPublished: true,
    scheduledFor: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: now } }
    ]
  };
  
  // Build recipient criteria
  const recipientQueries = [
    { 'recipients.type': 'all' },
    { 'recipients.users': userId },
    { 'recipients.roles': userRole }
  ];
  
  // Add progress-based targeting
  if (userProgress) {
    const progressQuery = { 'recipients.type': 'progress_based' };
    const criteria = {};
    
    if (userProgress.overall.currentDay) {
      criteria['recipients.progressCriteria.minDay'] = { $lte: userProgress.overall.currentDay };
      criteria['recipients.progressCriteria.maxDay'] = { $gte: userProgress.overall.currentDay };
    }
    
    if (Object.keys(criteria).length > 0) {
      recipientQueries.push({ ...progressQuery, ...criteria });
    }
  }
  
  const finalQuery = {
    ...baseQuery,
    $or: recipientQueries
  };
  
  return this.find(finalQuery)
    .populate('sender', 'profile.firstName profile.lastName profileImage')
    .sort({ 'settings.pinned': -1, priority: -1, createdAt: -1 });
};

module.exports = mongoose.model('Announcement', announcementSchema);