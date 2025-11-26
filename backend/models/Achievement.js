const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: String,
  type: {
    type: String,
    enum: ['quiz_count', 'score', 'streak', 'speed', 'category_master', 'social'],
    required: true
  },
  criteria: {
    count: Number,
    score: Number,
    category: String,
    timeLimit: Number
  },
  points: {
    type: Number,
    default: 10
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Achievement', achievementSchema);
