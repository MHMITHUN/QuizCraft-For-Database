const mongoose = require('mongoose');

const answerOptionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionDoc', index: true },
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
}, { collection: 'answers', timestamps: true });

module.exports = mongoose.model('AnswerOption', answerOptionSchema);
