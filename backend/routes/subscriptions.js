const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Package = require('../models/Package');

// Get my subscription
router.get('/mine', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { subscription: sub } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
});

// Upgrade/downgrade subscription
router.post('/change', protect, async (req, res) => {
  try {
    const { plan = 'free', billingCycle = 'monthly' } = req.body;
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1); else endDate.setMonth(endDate.getMonth() + 1);
    const sub = await Subscription.create({ user: req.user._id, plan, status: 'active', startDate, endDate, billingCycle });
    res.status(201).json({ success: true, data: { subscription: sub } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to change subscription' });
  }
});

// Admin: list subscriptions
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const subs = await Subscription.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, data: { subscriptions: subs } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

/**
 * @route   GET /api/subscriptions/packages
 * @desc    Get available packages for current user role
 * @access  Private
 */
router.get('/packages', protect, async (req, res) => {
  try {
    const userRole = req.user.role; // student, teacher, admin

    // Filter packages by target role
    const targetRole = (userRole === 'admin' || userRole === 'teacher') ? 'teacher' : 'student';

    const packages = await Package.find({
      targetRole,
      isActive: true
    }).sort({ order: 1, price: 1 });

    res.json({
      success: true,
      data: { packages }
    });
  } catch (error) {
    console.error('Packages fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages'
    });
  }
});

module.exports = router;
