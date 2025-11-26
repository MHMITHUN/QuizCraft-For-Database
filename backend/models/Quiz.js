const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'true-false', 'short-answer'],
    default: 'mcq'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: String,
  explanation: String,
  points: {
    type: Number,
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  category: {
    type: String,
    trim: true
  },
  tags: [String],
  language: {
    type: String,
    enum: ['en', 'bn'],
    default: 'en'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'mixed'],
    default: 'mixed'
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  passingScore: {
    type: Number,
    default: 60 // percentage
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['view', 'edit'] }
  }],
  classCode: String, // For teachers to share with class
  sourceContent: {
    text: String,
    filename: String,
    fileType: String
  },
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    }
  },
  embedding: {
    type: [Number],
    select: false // Optional local cache of embedding if desired (not required)
  },
  embeddingId: String, // Vector reference document ID (MongoDB),
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
quizSchema.index({ creator: 1, createdAt: -1 });
quizSchema.index({ tags: 1 });
quizSchema.index({ category: 1 });
quizSchema.index({ category: 1, difficulty: 1 }); // Compound index for filtering
quizSchema.index({ isPublic: 1 });
quizSchema.index({ classCode: 1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function () {
  return this.questions.reduce((sum, q) => sum + q.points, 0);
});

// Method to increment view count
quizSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
};

module.exports = mongoose.model('Quiz', quizSchema);
