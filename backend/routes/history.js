const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const QuizHistory = require('../models/QuizHistory');
const LegacyQuizHistory = require('../models/LegacyQuizHistory');

// GET /api/history - current user's quiz history (new collection primary, legacy readable)
// GET /api/history - current user's quiz history (new collection primary, legacy readable)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const result = await QuizHistory.aggregate([
      { $match: { user: req.user._id } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limitNum },
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
              $project: {
                _id: 1,
                score: 1,
                percentage: 1,
                passed: 1,
                createdAt: 1,
                quiz: {
                  _id: '$quizInfo._id',
                  title: '$quizInfo.title',
                  category: '$quizInfo.category',
                  difficulty: '$quizInfo.difficulty'
                }
              }
            }
          ]
        }
      }
    ]);

    const history = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    // Optionally include legacy latest entries if any (kept simple for compatibility)
    const legacy = await LegacyQuizHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('_id quiz percentage createdAt');

    res.json({
      success: true,
      data: {
        history,
        legacy,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total
        }
      }
    });
  } catch (error) {
    console.error('History GET error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// GET /api/history/:id - get specific history by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const history = await QuizHistory.findById(req.params.id)
      .populate('quiz', 'title description category questions timeLimit passingScore')
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

    // ------ Explanation visibility logic ------
    const quiz = history.quiz;
    const historyObj = history.toObject({ virtuals: true });

    let canViewExplanations = true;
    let explanationsUnlockAt = null;

    console.log('\n🔍 [HISTORY] Processing explanation lock for:', req.params.id);
    console.log('   Quiz:', quiz?._id, '-', quiz?.title);
    console.log('   Time Limit:', quiz?.timeLimit, 'minutes');
    console.log('   Time Taken:', history.timeTaken, 'seconds');

    // Robust numeric handling: Mongoose may return Number objects/strings, so normalize first
    if (quiz) {
      const quizTimeLimitMinutes = Number(quiz.timeLimit);
      const attemptTimeTakenSeconds = Number(history.timeTaken);

      if (
        Number.isFinite(quizTimeLimitMinutes) &&
        quizTimeLimitMinutes > 0 &&
        Number.isFinite(attemptTimeTakenSeconds) &&
        attemptTimeTakenSeconds >= 0
      ) {
        const quizTimeLimitSeconds = quizTimeLimitMinutes * 60; // minutes -> seconds
        const remainingSeconds = quizTimeLimitSeconds - attemptTimeTakenSeconds;

        console.log('   Calculated:');
        console.log('     - Quiz time limit:', quizTimeLimitSeconds, 'seconds');
        console.log('     - Remaining time:', remainingSeconds, 'seconds');
        console.log('     - Should lock?', remainingSeconds > 0);

        if (remainingSeconds > 0) {
          canViewExplanations = false;
          const completedAt = history.completedAt instanceof Date
            ? history.completedAt
            : new Date(history.completedAt);
          explanationsUnlockAt = new Date(completedAt.getTime() + remainingSeconds * 1000);
          console.log('   ✅ LOCKED until:', explanationsUnlockAt.toISOString());
        } else {
          console.log('   ⚠️ NOT LOCKED - time exceeded');
        }
      } else {
        console.log('   ❌ SKIPPED - Invalid time values');
      }
    } else {
      console.log('   ❌ SKIPPED - No quiz data');
    }

    historyObj.canViewExplanations = canViewExplanations;
    historyObj.explanationsUnlockAt = explanationsUnlockAt;
    console.log('   Final: canView =', canViewExplanations, ', unlockAt =', explanationsUnlockAt ? explanationsUnlockAt.toISOString() : 'null');
    console.log('🔍 [HISTORY] Done\n');

    res.json({
      success: true,
      data: { history: historyObj }
    });
  } catch (error) {
    console.error('History detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history details'
    });
  }
});

// POST /api/history - save quiz attempt
router.post('/', protect, async (req, res) => {
  try {
    const { quizId, answers, timeTaken = 0 } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Grade answers
    let correctAnswers = 0;
    let score = 0;
    const detailedAnswers = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers?.[index];
      let isCorrect = false;
      if (question.type === 'mcq') {
        const correctOption = question.options.find(o => o.isCorrect);
        isCorrect = userAnswer === correctOption?.text;
      } else if (question.type === 'true-false') {
        isCorrect = userAnswer === question.correctAnswer;
      } else {
        isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      }
      if (isCorrect) { correctAnswers++; score += question.points; }
      detailedAnswers.push({
        questionId: question._id,
        userAnswer,
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      });
    });

    const percentage = (correctAnswers / quiz.questions.length) * 100;
    const passed = percentage >= quiz.passingScore;

    const history = await QuizHistory.create({
      user: req.user._id,
      quiz: quiz._id,
      answers: detailedAnswers,
      score,
      percentage,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      incorrectAnswers: quiz.questions.length - correctAnswers,
      timeTaken,
      passed
    });

    await req.user.incrementUsage('taken');
    req.user.points += score; await req.user.save();

    quiz.analytics.totalAttempts += 1;
    quiz.analytics.averageScore = ((quiz.analytics.averageScore * (quiz.analytics.totalAttempts - 1) + percentage) / quiz.analytics.totalAttempts);
    await quiz.save();

    res.status(201).json({ success: true, message: 'Attempt saved', data: { historyId: history._id } });
  } catch (error) {
    console.error('History POST error:', error);
    res.status(500).json({ success: false, message: 'Failed to save history' });
  }
});

module.exports = router;
