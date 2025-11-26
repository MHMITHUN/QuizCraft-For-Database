const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const upload = require('../middleware/upload');

/**
 * @route   POST /api/users/upgrade-subscription
 * @desc    Upgrade user subscription
 * @access  Private
 */
router.post('/upgrade-subscription', protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['premium', 'institutional'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription

    req.user.subscription = {
      plan,
      startDate,
      endDate,
      isActive: true
    };

    await req.user.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan`,
      data: {
        subscription: req.user.subscription
      }
    });
  } catch (error) {
    console.error('Subscription upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription'
    });
  }
});

/**
 * @route   GET /api/users/usage-stats
 * @desc    Get user's usage statistics
 * @access  Private
 */
router.get('/usage-stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const freeLimitEnv = parseInt(process.env.FREE_QUIZ_LIMIT, 10);
    const premiumLimitEnv = parseInt(process.env.PREMIUM_QUIZ_LIMIT, 10);

    const freeLimit = Number.isFinite(freeLimitEnv) ? freeLimitEnv : 10;
    const premiumLimit = Number.isFinite(premiumLimitEnv) ? premiumLimitEnv : 1000;

    const limit = user.subscription?.plan === 'free' ? freeLimit : premiumLimit;

    const remaining = Math.max(0, limit - user.usage.quizzesGenerated);
    const usagePercentage = limit > 0 ? (user.usage.quizzesGenerated / limit) * 100 : 0;

    res.json({
      success: true,
      data: {
        usage: user.usage,
        limits: {
          total: limit,
          remaining,
          usagePercentage: usagePercentage.toFixed(2)
        },
        subscription: user.subscription,
        canGenerateMore: user.canGenerateQuiz()
      }
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics'
    });
  }
});

/**
 * @route   POST /api/users/reset-password
 * @desc    Reset user password
 * @access  Private
 */
router.post('/reset-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID (public info only)
 * @access  Public
 */
// Upload/change avatar for current user
router.post('/me/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: `/uploads/${req.file.filename}` }, { new: true });
    res.json({ success: true, message: 'Avatar updated', data: { avatar: user.avatar } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const userAgg = await User.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'quizhistories',
          localField: '_id',
          foreignField: 'user',
          as: 'history'
        }
      },
      {
        $addFields: {
          totalQuizzesTaken: { $size: '$history' },
          averageScore: {
            $cond: {
              if: { $gt: [{ $size: '$history' }, 0] },
              then: { $avg: '$history.percentage' },
              else: 0
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          avatar: 1,
          points: 1,
          role: 1,
          createdAt: 1,
          totalQuizzesTaken: 1,
          averageScore: { $round: ['$averageScore', 1] }
        }
      }
    ]);

    if (!userAgg.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: userAgg[0] }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

module.exports = router;
