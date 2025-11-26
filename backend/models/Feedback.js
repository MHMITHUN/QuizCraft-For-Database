const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  type: { type: String, enum: ['app','quiz','bug','feature'], default: 'app' }
}, { collection: 'feedback', timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
