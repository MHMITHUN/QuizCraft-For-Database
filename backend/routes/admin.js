const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizHistory = require('../models/QuizHistory');
const upload = require('../middleware/upload');
const textExtractor = require('../services/textExtractor');
const geminiService = require('../services/geminiService');
const embeddingService = require('../services/embeddingService');
const Package = require('../models/Package');

/**
 * @route   POST /api/admin/upload
 * @desc    Upload file and generate quiz
 * @access  Private/Admin
 */
router.post(
  '/upload',
  protect,
  authorize('admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const {
        numQuestions = 10,
        quizType = 'mcq',
        difficulty = 'medium',
        language = 'en',
      } = req.body;

      // Extract text
      const extractedText = await textExtractor.extractText(req.file.path, req.file.mimetype);
      const cleanedText = textExtractor.cleanText(extractedText);
      textExtractor.validateText(cleanedText, 100);

      // Generate quiz via Gemini
      const result = await geminiService.generateQuiz({
        content: cleanedText,
        numQuestions: parseInt(numQuestions),
        quizType,
        difficulty,
        language,
      });
      if (!result.success) return res.status(500).json({ success: false, message: 'AI generation failed' });

      const quizData = result.data;
      const quiz = await Quiz.create({
        title: quizData.title || 'Generated Quiz',
        description: quizData.description || '',
        creator: req.user._id,
        questions: quizData.questions,
        category: quizData.category || 'General',
        tags: await geminiService.extractTopics(cleanedText),
        language,
        difficulty: 'mixed',
        sourceContent: { text: cleanedText.substring(0, 5000), filename: req.file.originalname, fileType: req.file.mimetype },
        isPublic: true
      });

      try { await embeddingService.createQuizChunks(quiz); } catch (e) { console.warn('Embedding chunk error:', e); }

      res.json({ success: true, message: 'Quiz generated successfully from file', data: { quiz } });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate quiz from file',
      });
    }
  }
);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({
      'subscription.plan': { $ne: 'free' },
    });

    // Get quiz statistics
    const totalQuizzes = await Quiz.countDocuments();
    const publicQuizzes = await Quiz.countDocuments({ isPublic: true });
    const quizzesByCategory = await Quiz.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get quiz history statistics
    const totalAttempts = await QuizHistory.countDocuments();
    const recentActivity = await QuizHistory.find()
      .populate('user', 'name email')
      .populate('quiz', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    // User growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Most active users
    const activeUsersList = await QuizHistory.aggregate([
      {
        $group: {
          _id: '$user',
          quizCount: { $sum: 1 },
          avgScore: { $avg: '$percentage' },
        },
      },
      { $sort: { quizCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          premium: premiumUsers,
          newThisMonth: newUsers,
        },
        quizzes: {
          total: totalQuizzes,
          public: publicQuizzes,
          byCategory: quizzesByCategory,
        },
        activity: {
          totalAttempts,
          recentActivity,
          activeUsers: activeUsersList,
        },
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private/Admin
 */
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      role,
      subscription,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (subscription) query['subscription.plan'] = subscription;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user (role, subscription, status)
 * @access  Private/Admin
 */
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, subscription, isActive } = req.body;

    const updateFields = {};
    if (role) updateFields.role = role;
    if (subscription) updateFields.subscription = subscription;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Don't allow deleting other admins
    if (
      user.role === 'admin' &&
      user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete other admin accounts',
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Admin user delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
});

/**
 * @route   GET /api/admin/quizzes
 * @desc    Get all quizzes (admin view)
 * @access  Private/Admin
 */
router.get('/quizzes', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const quizzes = await Quiz.find(query)
      .populate('creator', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Quiz.countDocuments(query);

    res.json({
      success: true,
      data: {
        quizzes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Admin quizzes fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
    });
  }
});

/**
 * @route   PUT /api/admin/quizzes/:id/status
 * @desc    Update quiz status (publish, archive, etc.)
 * @access  Private/Admin
 */
router.put(
  '/quizzes/:id/status',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const { status } = req.body;

      const quiz = await Quiz.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }

      res.json({
        success: true,
        message: 'Quiz status updated',
        data: { quiz },
      });
    } catch (error) {
      console.error('Admin quiz status update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update quiz status',
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system-wide analytics
 * @access  Private/Admin
 */
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    // Get daily quiz generation stats (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyQuizzes = await Quiz.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get daily quiz attempts (last 7 days)
    const dailyAttempts = await QuizHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$percentage' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get subscription statistics
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get average quiz performance by category
    const categoryPerformance = await QuizHistory.aggregate([
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz',
          foreignField: '_id',
          as: 'quizInfo',
        },
      },
      { $unwind: '$quizInfo' },
      {
        $group: {
          _id: '$quizInfo.category',
          avgScore: { $avg: '$percentage' },
          totalAttempts: { $sum: 1 },
        },
      },
      { $sort: { totalAttempts: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        dailyQuizzes,
        dailyAttempts,
        subscriptionStats,
        categoryPerformance,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
    });
  }
});

/**
 * @route   GET /api/admin/settings
 * @desc    Get admin-manageable system settings
 * @access  Private/Admin
 */
router.get('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    let settings = await SystemSettings.findOne({});

    if (!settings) {
      settings = await SystemSettings.create({});
    }

    res.json({
      success: true, data: {
        apiLimits: settings.apiLimits,
        features: settings.features,
      }
    });
  } catch (error) {
    console.error('Admin settings get error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

/**
 * @route   PUT /api/admin/settings
 * @desc    Update system settings (admin)
 * @access  Private/Admin
 */
router.put('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const { apiLimits, features } = req.body || {};

    const update = {};
    if (apiLimits) update.apiLimits = apiLimits;
    if (typeof features === 'object') update.features = features;

    const saved = await SystemSettings.findOneAndUpdate({}, update, { new: true, upsert: true, setDefaultsOnInsert: true });

    res.json({
      success: true, message: 'Settings updated', data: {
        apiLimits: saved.apiLimits,
        features: saved.features,
      }
    });
  } catch (error) {
    console.error('Admin settings update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

/**
 * @route   PUT /api/admin/quizzes/:id/toggle-visibility
 * @desc    Toggle quiz public/private status
 * @access  Private/Admin
 */
router.put('/quizzes/:id/toggle-visibility', protect, authorize('admin'), async (req, res) => {
  try {
    const { isPublic } = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { isPublic: isPublic === true || isPublic === 'true' },
      { new: true, runValidators: true }
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      message: `Quiz is now ${quiz.isPublic ? 'public' : 'private'}`,
      data: { quiz }
    });
  } catch (error) {
    console.error('Admin quiz visibility toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz visibility'
    });
  }
});

/**
 * @route   GET /api/admin/packages
 * @desc    Get all subscription packages
 * @access  Private/Admin
 */
router.get('/packages', protect, authorize('admin'), async (req, res) => {
  try {
    const packages = await Package.find().sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { packages }
    });
  } catch (error) {
    console.error('Admin packages fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages'
    });
  }
});

/**
 * @route   POST /api/admin/packages
 * @desc    Create new subscription package
 * @access  Private/Admin
 */
router.post('/packages', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, price, duration, features, targetRole, quizLimit, classLimit, isActive, order } = req.body;

    const package = await Package.create({
      name,
      description,
      price,
      duration,
      features: features || [],
      targetRole,
      quizLimit,
      classLimit,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: { package }
    });
  } catch (error) {
    console.error('Admin package create error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create package'
    });
  }
});

/**
 * @route   PUT /api/admin/packages/:id
 * @desc    Update subscription package
 * @access  Private/Admin
 */
router.put('/packages/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, price, duration, features, targetRole, quizLimit, classLimit, isActive, order } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (price !== undefined) updateFields.price = price;
    if (duration) updateFields.duration = duration;
    if (features) updateFields.features = features;
    if (targetRole) updateFields.targetRole = targetRole;
    if (quizLimit !== undefined) updateFields.quizLimit = quizLimit;
    if (classLimit !== undefined) updateFields.classLimit = classLimit;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (order !== undefined) updateFields.order = order;

    const package = await Package.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    res.json({
      success: true,
      message: 'Package updated successfully',
      data: { package }
    });
  } catch (error) {
    console.error('Admin package update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update package'
    });
  }
});

/**
 * @route   DELETE /api/admin/packages/:id
 * @desc    Delete subscription package
 * @access  Private/Admin
 */
router.delete('/packages/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const package = await Package.findByIdAndDelete(req.params.id);

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Admin package delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete package'
    });
  }
});

module.exports = router;
