const mongoose = require('mongoose');

// Same schema shape as primary history for read-only legacy access
const answerSchema = new mongoose.Schema({
  questionId: mongoose.Schema.Types.ObjectId,
  userAnswer: String,
  isCorrect: Boolean,
  pointsEarned: Number,
  timeTaken: Number
});

const legacyQuizHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  answers: [answerSchema],
  score: Number,
  percentage: Number,
  totalQuestions: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  skippedQuestions: { type: Number, default: 0 },
  timeTaken: Number,
  passed: Boolean,
  attemptNumber: { type: Number, default: 1 },
  feedback: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'quizhistories' });

module.exports = mongoose.model('LegacyQuizHistory', legacyQuizHistorySchema);
