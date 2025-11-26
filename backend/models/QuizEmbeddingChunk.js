const mongoose = require('mongoose');

const quizEmbeddingChunkSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', index: true },
  chunkId: { type: String, index: true },
  text: { type: String, required: true },
  topic: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'medium' },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'quizembeddings', timestamps: true });

module.exports = mongoose.model('QuizEmbeddingChunk', quizEmbeddingChunkSchema);
