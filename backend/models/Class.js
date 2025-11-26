const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: String,
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  quizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  posts: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subject: String,
  grade: String,
  institution: String,
  schedule: {
    days: [String],
    time: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxStudents: {
    type: Number,
    default: 50
  },
  settings: {
    allowStudentDiscussions: {
      type: Boolean,
      default: true
    },
    autoGrading: {
      type: Boolean,
      default: true
    },
    showLeaderboard: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Generate unique class code before saving
classSchema.pre('save', async function(next) {
  if (!this.code) {
    try {
      this.code = await generateUniqueClassCode(this.constructor);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    // Ensure code is uppercase
    this.code = this.code.toUpperCase();
    next();
  }
});

function generateClassCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueClassCode(ClassModel, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateClassCode();
    const existing = await ClassModel.findOne({ code });
    if (!existing) {
      return code;
    }
  }
  throw new Error('Unable to generate unique class code after ' + maxAttempts + ' attempts');
}

// Indexes
classSchema.index({ teacher: 1 });
classSchema.index({ students: 1 });

module.exports = mongoose.model('Class', classSchema);
