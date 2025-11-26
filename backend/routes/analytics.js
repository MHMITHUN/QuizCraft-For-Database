const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const QuizHistory = require('../models/QuizHistory');
const Quiz = require('../models/Quiz');

/**
 * @route   GET /api/analytics/my-stats
 * @desc    Get user's quiz statistics
 * @access  Private
 */
router.get('/my-stats', protect, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const stats = await QuizHistory.getUserStats(userId);

    // Get recent quiz history
    const recentQuizzes = await QuizHistory.find({ user: userId })
      .populate('quiz', 'title category')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get performance trend (last 10 quizzes)
    const performanceTrend = await QuizHistory.find({ user: userId })
      .select('percentage completedAt')
      .sort({ completedAt: 1 })
      .limit(10);

    return res.json({
      success: true,
      data: {
        stats,
        recentQuizzes,
        performanceTrend,
        userPoints: req.user.points || 0
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * @route   GET /api/analytics/stats
 * @desc    Lightweight stats summary for history screen
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await QuizHistory.getUserStats(req.user?._id);
    return res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

/**
 * @route   GET /api/analytics/quiz/:id/analytics
 * @desc    Get analytics for a specific quiz (creator only)
 * @access  Private
 */
router.get('/quiz/:id/analytics', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if user is creator
    if (quiz.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics'
      });
    }

    // Get all attempts for this quiz
    const attempts = await QuizHistory.find({ quiz: quiz._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Calculate detailed analytics
    const totalAttempts = attempts.length;
    const averageScore = attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts || 0;
    const passRate = (attempts.filter(a => a.passed).length / totalAttempts * 100) || 0;
    const averageTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0) / totalAttempts || 0;

    // Question-level analytics
    const questionAnalytics = quiz.questions.map((question, index) => {
      const questionAttempts = attempts.map(a => a.answers[index]).filter(a => a);
      const correctCount = questionAttempts.filter(a => a.isCorrect).length;

      return {
        questionText: question.questionText,
        difficulty: question.difficulty,
        correctRate: (correctCount / questionAttempts.length * 100) || 0,
        totalAttempts: questionAttempts.length
      };
    });

    // Score distribution
    const scoreRanges = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    attempts.forEach(attempt => {
      if (attempt.percentage <= 20) scoreRanges['0-20']++;
      else if (attempt.percentage <= 40) scoreRanges['21-40']++;
      else if (attempt.percentage <= 60) scoreRanges['41-60']++;
      else if (attempt.percentage <= 80) scoreRanges['61-80']++;
      else scoreRanges['81-100']++;
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalAttempts,
          averageScore: averageScore.toFixed(2),
          passRate: passRate.toFixed(2),
          averageTime: Math.round(averageTime),
          viewCount: quiz.viewCount
        },
        scoreDistribution: scoreRanges,
        questionAnalytics,
        recentAttempts: attempts.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Quiz analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz analytics'
    });
  }
});

/**
 * @route   GET /api/analytics/leaderboard
 * @desc    Get global leaderboard
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await QuizHistory.getLeaderboard(parseInt(limit));

    res.json({
      success: true,
      data: { leaderboard }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});

/**
 * @route   GET /api/analytics/leaderboard/class/:classId
 * @desc    Get class-specific leaderboard
 * @access  Private (students and teachers of the class)
 */
router.get('/leaderboard/class/:classId', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const { classId } = req.params;

    // Verify class exists and user has access
    const Class = require('../models/Class');
    const klass = await Class.findById(classId);

    if (!klass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if user is teacher or student in this class
    const isTeacher = klass.teacher.toString() === req.user._id.toString();
    const isStudent = klass.students.some(s => s.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this class leaderboard'
      });
    }

    // Get student IDs from class
    const studentIds = klass.students.map(s => s.toString());

    // Aggregate quiz results for students in this class
    const leaderboard = await QuizHistory.aggregate([
      {
        $match: {
          user: { $in: klass.students }
        }
      },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$score' },
          quizzesTaken: { $count: {} },
          averageScore: { $avg: '$percentage' },
          totalCorrect: { $sum: '$correctAnswers' },
          totalQuestions: { $sum: '$totalQuestions' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          userId: '$_id',
          name: '$userInfo.name',
          email: '$userInfo.email',
          totalPoints: 1,
          quizzesTaken: 1,
          averageScore: { $round: ['$averageScore', 2] },
          accuracy: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$totalCorrect', '$totalQuestions'] },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      {
        $sort: { totalPoints: -1, averageScore: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      data: {
        leaderboard,
        className: klass.name,
        totalStudents: klass.students.length
      }
    });
  } catch (error) {
    console.error('Class leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class leaderboard'
    });
  }
});

/**
 * @route   GET /api/analytics/my-history
 * @desc    Get user's quiz history
 * @access  Private
 */
router.get('/my-history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await QuizHistory.find({ user: req.user._id })
      .populate('quiz', 'title category difficulty')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QuizHistory.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history'
    });
  }
});

/**
 * @route   GET /api/analytics/history/:id
 * @desc    Get detailed results for a specific quiz attempt
 * @access  Private
 */
router.get('/history/:id', protect, async (req, res) => {
  try {
    const history = await QuizHistory.findById(req.params.id)
      .populate('quiz', 'title description category questions')
      .populate('user', 'name email');

    if (!history) {
      return res.status(404).json({
        success: false,
        message: 'History not found'
      });
    }

    // Check ownership
    if (history.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    console.error('History detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history details'
    });
  }
});

// Alias per spec: GET /api/analytics/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const base = await QuizHistory.getUserStats(req.user._id);
    const response = { ...base };
    if (req.user.role === 'teacher') {
      // Minimal teacher summary: number of created quizzes and attempts
      const createdCount = await Quiz.countDocuments({ creator: req.user._id });
      const attemptsForMyQuizzes = await QuizHistory.countDocuments({ quiz: { $in: (await Quiz.find({ creator: req.user._id }).select('_id')).map(q => q._id) } });
      response.teacher = { createdQuizzes: createdCount, totalAttemptsOnMyQuizzes: attemptsForMyQuizzes };
    }
    res.json({ success: true, data: response });
  } catch (e) {
    console.error('Summary error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

// ... existing routes ...

/**
 * @route   GET /api/analytics/advanced/category-performance
 * @desc    Get performance metrics grouped by category
 * @access  Private
 */
router.get('/advanced/category-performance', protect, async (req, res) => {
  try {
    const stats = await QuizHistory.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz',
          foreignField: '_id',
          as: 'quizInfo'
        }
      },
      { $unwind: '$quizInfo' },
      {
        $group: {
          _id: '$quizInfo.category',
          avgScore: { $avg: '$percentage' },
          totalAttempts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          category: '$_id',
          avgScore: { $round: ['$avgScore', 2] },
          totalAttempts: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { totalAttempts: -1 } }
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Category performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category performance' });
  }
});

/**
 * @route   GET /api/analytics/advanced/engagement-trends
 * @desc    Get engagement trends over last 30 days
 * @access  Private
 */
router.get('/advanced/engagement-trends', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await QuizHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          attempts: { $sum: 1 },
          avgScore: { $avg: "$percentage" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Engagement trends error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch engagement trends' });
  }
});

module.exports = router;
