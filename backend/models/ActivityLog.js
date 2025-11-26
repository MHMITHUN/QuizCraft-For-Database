const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'quiz_created',
      'quiz_updated',
      'quiz_deleted',
      'quiz_taken',
      'quiz_shared',
      'profile_updated',
      'subscription_changed',
      'file_uploaded',
      'comment_posted',
      'achievement_unlocked'
    ]
  },
  description: String,
  entityType: {
    type: String,
    enum: ['User', 'Quiz', 'QuizAttempt', 'Class', 'Comment', 'Subscription']
  },
  entityId: mongoose.Schema.Types.ObjectId,
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String,
    location: String
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  }
}, {
  timestamps: true
});

// Indexes for querying
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ createdAt: -1 });

// TTL index to auto-delete old logs after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
