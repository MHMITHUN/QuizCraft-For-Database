const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// Create feedback
router.post('/', protect, async (req, res) => {
  try {
    const { quiz, rating, comment, type } = req.body;
    const fb = await Feedback.create({ user: req.user._id, quiz, rating, comment, type });
    res.status(201).json({ success: true, data: { feedback: fb } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// Get my feedback
router.get('/mine', protect, async (req, res) => {
  try {
    const list = await Feedback.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { feedback: list } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
});

// Admin: list all feedback
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const list = await Feedback.find().populate('user','name email').sort({ createdAt: -1 });
    res.json({ success: true, data: { feedback: list } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
});

module.exports = router;
