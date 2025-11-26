const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: mongoose.Schema.Types.ObjectId,
  userAnswer: String,
  isCorrect: Boolean,
  pointsEarned: Number,
  timeTaken: Number // in seconds
});

const quizHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [answerSchema],
  score: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  incorrectAnswers: {
    type: Number,
    required: true
  },
  skippedQuestions: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number, // in seconds
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  feedback: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  proctoring: {
    enabled: {
      type: Boolean,
      default: false
    },
    violations: [{
      type: {
        type: String,
        enum: ['app_background', 'low_visibility', 'tab_switch', 'copy', 'paste', 'screenshot']
      },
      timestamp: Date,
      details: String
    }],
    violationCount: {
      type: Number,
      default: 0
    },
    maxViolationsReached: {
      type: Boolean,
      default: false
    },
    flaggedForReview: {
      type: Boolean,
      default: false
    },
    autoSubmitted: {
      type: Boolean,
      default: false
    },
    timeExpired: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
quizHistorySchema.index({ user: 1, createdAt: -1 });
quizHistorySchema.index({ quiz: 1 });
quizHistorySchema.index({ score: -1 });

// Static method to get user statistics
quizHistorySchema.statics.getUserStats = async function (userId) {
  if (!userId) return {
    totalQuizzes: 0,
    averageScore: 0,
    totalTimeTaken: 0,
    passedQuizzes: 0,
    totalPoints: 0
  };

  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const stats = await this.aggregate([
    { $match: { user: userObjectId } },
    {
      $group: {
        _id: null,
        totalQuizzes: { $sum: 1 },
        averageScore: { $avg: '$percentage' },
        totalTimeTaken: { $sum: '$timeTaken' },
        passedQuizzes: { $sum: { $cond: ['$passed', 1, 0] } },
        totalPoints: { $sum: '$score' }
      }
    }
  ]);

  return stats[0] || {
    totalQuizzes: 0,
    averageScore: 0,
    totalTimeTaken: 0,
    passedQuizzes: 0,
    totalPoints: 0
  };
};

// Static method to get leaderboard
quizHistorySchema.statics.getLeaderboard = async function (limit = 10) {
  return await this.aggregate([
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$score' },
        quizzesTaken: { $sum: 1 },
        averageScore: { $avg: '$percentage' }
      }
    },
    { $sort: { totalPoints: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        userId: '$_id',
        name: '$userInfo.name',
        email: '$userInfo.email',
        avatar: '$userInfo.avatar',
        totalPoints: 1,
        quizzesTaken: 1,
        averageScore: 1
      }
    }
  ]);
};

module.exports = mongoose.model('QuizHistory', quizHistorySchema);
