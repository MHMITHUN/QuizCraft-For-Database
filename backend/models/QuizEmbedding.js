const mongoose = require('mongoose');

const quizEmbeddingSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    unique: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  text: {
    type: String,
    required: true // Combined text used for embedding (title + description + questions)
  },
  metadata: {
    category: String,
    tags: [String],
    difficulty: String,
    language: String,
    questionCount: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for vector search (MongoDB Atlas Vector Search)
// Note: You need to create a vector search index in Atlas for this to work

module.exports = mongoose.model('QuizEmbedding', quizEmbeddingSchema);
