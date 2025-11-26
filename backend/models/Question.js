const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', index: true },
  questionText: { type: String, required: true },
  type: { type: String, enum: ['mcq','true-false','short-answer'], default: 'mcq' },
  correctAnswer: String,
  explanation: String,
  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  points: { type: Number, default: 1 }
}, { collection: 'questions', timestamps: true });

module.exports = mongoose.model('QuestionDoc', questionSchema);
