const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Payment = require('../models/Payment');

// Create payment (user)
router.post('/', protect, async (req, res) => {
  try {
    const { amount, currency = 'USD', provider = 'manual', subscriptionPlan, transactionId, meta } = req.body;
    const payment = await Payment.create({ user: req.user._id, amount, currency, provider, subscriptionPlan, transactionId, meta, status: 'succeeded' });
    res.status(201).json({ success: true, data: { payment } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create payment' });
  }
});

// Get my payments
router.get('/mine', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { payments } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// Admin: list all
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const payments = await Payment.find().populate('user','name email').sort({ createdAt: -1 });
    res.json({ success: true, data: { payments } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

module.exports = router;
