const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get my notifications
router.get('/mine', protect, async (req, res) => {
  try {
    const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { notifications: list } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark as read
router.post('/:id/read', protect, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif || notif.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();
    res.json({ success: true, data: { notification: notif } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// Admin: broadcast (simple)
router.post('/broadcast', protect, authorize('admin'), async (req, res) => {
  try {
    const { userIds = [], title, message, type = 'system', data } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message required' });
    const docs = userIds.map(uid => ({ user: uid, type, title, message, data }));
    if (docs.length) await Notification.insertMany(docs);
    res.status(201).json({ success: true, message: 'Broadcast created' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to broadcast' });
  }
});

module.exports = router;
