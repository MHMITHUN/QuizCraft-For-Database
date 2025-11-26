const express = require('express');
const router = express.Router();

const SystemSettings = require('../models/SystemSettings');

router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({});
    if (!settings) {
      settings = {
        freemium: {
          freeQuizLimit: parseInt(process.env.FREE_QUIZ_LIMIT || '10'),
          premiumQuizLimit: parseInt(process.env.PREMIUM_QUIZ_LIMIT || '1000')
        },
        ai: {
          quizModel: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
          embeddingModel: 'gemini-embedding-001'
        },
        vector: {
          collection: 'quizembeddings',
          index: (process.env.ATLAS_VECTOR_INDEX || 'quizembeddings_vector_index').trim(),
          similarity: 'cosine',
          dimensions: 768
        }
      };
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

module.exports = router;
