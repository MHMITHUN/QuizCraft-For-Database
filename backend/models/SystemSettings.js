const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  freemium: {
    freeQuizLimit: { type: Number, default: 10 },
    premiumQuizLimit: { type: Number, default: 1000 }
  },
  ai: {
    quizModel: { type: String, default: 'gemini-1.5-pro' },
    embeddingModel: { type: String, default: 'gemini-embedding-001' }
  },
  vector: {
    collection: { type: String, default: 'quizembeddings' },
    index: { type: String, default: 'quizembeddings_vector_index' },
    similarity: { type: String, default: 'cosine' },
    dimensions: { type: Number, default: 768 }
  },
  // Admin app settings (for mobile dashboard UI)
  apiLimits: {
    free: {
      quizzes: { type: Number, default: 5 },
      questions: { type: Number, default: 50 }
    },
    student_basic: {
      quizzes: { type: Number, default: 50 },
      questions: { type: Number, default: 500 }
    },
    student_premium: {
      quizzes: { type: Number, default: -1 },
      questions: { type: Number, default: -1 }
    },
    teacher_basic: {
      quizzes: { type: Number, default: 100 },
      questions: { type: Number, default: 1000 }
    },
    teacher_premium: {
      quizzes: { type: Number, default: -1 },
      questions: { type: Number, default: -1 }
    },
    teacher_institutional: {
      quizzes: { type: Number, default: -1 },
      questions: { type: Number, default: -1 }
    }
  },
  features: {
    guestAccess: { type: Boolean, default: true },
    registrationOpen: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    vectorSearch: { type: Boolean, default: true }
  }
}, { collection: 'systemSettings', timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
