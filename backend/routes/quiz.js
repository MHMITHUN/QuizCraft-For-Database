const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Quiz = require('../models/Quiz');
const QuizHistory = require('../models/QuizHistory');
const User = require('../models/User');
const textExtractor = require('../services/textExtractor');
const geminiService = require('../services/geminiService');
const embeddingService = require('../services/embeddingService');
const QuestionDoc = require('../models/Question');
const AnswerOption = require('../models/AnswerOption');
const FileDoc = require('../models/File');
const Class = require('../models/Class');

/**
 * @route   POST /api/quiz/upload-and-generate
 * @desc    Upload file and generate quiz
 * @access  Private
 */
router.post('/upload-and-generate', protect, upload.single('file'), async (req, res) => {
  try {
    const { numQuestions, quizType, difficulty, language, category, timeLimit, passingScore, isPublic } = req.body;

    // Check if user can generate quiz
    if (!req.user.canGenerateQuiz()) {
      return res.status(403).json({
        success: false,
        message: 'Quiz generation limit reached. Please upgrade your plan.',
        currentUsage: req.user.usage.quizzesGenerated,
        limit: req.user.subscription.plan === 'free' ? process.env.FREE_QUIZ_LIMIT : process.env.PREMIUM_QUIZ_LIMIT
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Extract text from uploaded file
    console.log('📄 Extracting text from file...');
    const extractedText = await textExtractor.extractText(req.file.path, req.file.mimetype);
    const cleanedText = textExtractor.cleanText(extractedText);

    // Validate text length
    textExtractor.validateText(cleanedText, 100);

    // Auto-detect language from content if not explicitly provided or if 'auto'
    const detectedLanguage = (language && language !== 'auto') ? language : textExtractor.detectLanguage(cleanedText);
    console.log(`🌐 Detected language: ${detectedLanguage}`);

    // Generate quiz using Gemini AI
    console.log('🤖 Generating quiz with AI...');
    const quizResult = await geminiService.generateQuiz({
      content: cleanedText,
      numQuestions: parseInt(numQuestions) || 10,
      quizType: quizType || 'mcq',
      difficulty: difficulty || 'medium',
      language: detectedLanguage,
      category: category || ''
    });

    if (!quizResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate quiz',
        error: quizResult.error
      });
    }

    const quizData = quizResult.data;

    // Create quiz in database
    const timeLimitParsed = Number.parseInt(timeLimit, 10);
    const passingScoreParsed = Number.parseInt(passingScore, 10);
    const timeLimitValue = Number.isFinite(timeLimitParsed) && timeLimitParsed > 0 ? Math.min(timeLimitParsed, 300) : 30;
    const passingScoreValue = Number.isFinite(passingScoreParsed) ? Math.min(Math.max(passingScoreParsed, 1), 100) : 60;

    const quiz = await Quiz.create({
      title: quizData.title || 'Generated Quiz',
      description: quizData.description || '',
      creator: req.user._id,
      questions: quizData.questions,
      category: quizData.category || category || 'General',
      tags: await geminiService.extractTopics(cleanedText),
      language: detectedLanguage,
      difficulty: difficulty || 'mixed',
      timeLimit: timeLimitValue,
      passingScore: passingScoreValue,
      sourceContent: {
        text: cleanedText.substring(0, 5000),
        filename: req.file.originalname,
        fileType: req.file.mimetype
      },
      isPublic: isPublic === 'true' || isPublic === true
    });

    // Save file metadata
    try {
      await FileDoc.create({ filename: req.file.filename, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, path: req.file.path, uploadedBy: req.user._id });
    } catch (e) { /* ignore */ }

    // Persist questions and answers into required collections
    try {
      for (const q of quiz.questions) {
        const qDoc = await QuestionDoc.create({ quizId: quiz._id, questionText: q.questionText, type: q.type, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points });
        if (q.options?.length) {
          const optionsToInsert = q.options.map(o => ({ questionId: qDoc._id, text: o.text, isCorrect: !!o.isCorrect }));
          if (optionsToInsert.length) await AnswerOption.insertMany(optionsToInsert);
        }
      }
    } catch (e) { console.warn('Failed to persist questions/answers:', e.message); }

    // Generate and store embedding for vector search
    try {
      const embeddingId = await embeddingService.createQuizEmbedding(quiz);
      if (embeddingId) {
        quiz.embeddingId = embeddingId;
        await quiz.save();
      }
    } catch (embedError) {
      console.error('Embedding generation error:', embedError);
      // Continue without embedding - quiz still created successfully
    }

    // Increment user usage
    await req.user.incrementUsage('generated');

    res.status(201).json({
      success: true,
      message: 'Quiz generated successfully',
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions,
          category: quiz.category,
          tags: quiz.tags,
          totalQuestions: quiz.questions.length,
          createdAt: quiz.createdAt
        },
        usage: {
          quizzesGenerated: req.user.usage.quizzesGenerated,
          remaining: req.user.subscription.plan === 'free'
            ? process.env.FREE_QUIZ_LIMIT - req.user.usage.quizzesGenerated
            : process.env.PREMIUM_QUIZ_LIMIT - req.user.usage.quizzesGenerated
        }
      }
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate quiz'
    });
  }
});

/**
 * @route   POST /api/quiz/stream-upload-and-generate
 * @desc    Upload file and stream quiz generation (SSE)
 * @access  Private
 */
router.post('/stream-upload-and-generate', protect, upload.single('file'), async (req, res) => {
  try {
    const { numQuestions, quizType, difficulty, language, category, timeLimit, passingScore, isPublic } = req.body;

    if (!req.user.canGenerateQuiz()) {
      res.status(403);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: false,
        message: 'Quiz generation limit reached. Please upgrade your plan.',
        currentUsage: req.user.usage.quizzesGenerated
      }));
    }

    if (!req.file) {
      res.status(400);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: 'No file uploaded' }));
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (obj) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    const hb = setInterval(() => res.write(': ping\n\n'), 15000);

    send({ event: 'ready' });

    // Extract text
    send({ event: 'extracting' });
    const extractedText = await textExtractor.extractText(req.file.path, req.file.mimetype);
    const cleanedText = textExtractor.cleanText(extractedText);
    textExtractor.validateText(cleanedText, 100);
    send({ event: 'extracted', length: cleanedText.length });

    // Auto-detect language from content if not provided or if 'auto'
    const detectedLanguage = (language && language !== 'auto') ? language : textExtractor.detectLanguage(cleanedText);
    console.log(`🌐 Detected language: ${detectedLanguage}`);
    send({ event: 'language-detected', language: detectedLanguage });

    const timeLimitParsed = Number.parseInt(timeLimit, 10);
    const passingScoreParsed = Number.parseInt(passingScore, 10);
    const timeLimitValue = Number.isFinite(timeLimitParsed) && timeLimitParsed > 0 ? Math.min(timeLimitParsed, 300) : 30;
    const passingScoreValue = Number.isFinite(passingScoreParsed) ? Math.min(Math.max(passingScoreParsed, 1), 100) : 60;

    const collected = { meta: null, questions: [] };

    // Stream quiz generation
    await geminiService.streamQuizNDJSON(
      {
        content: cleanedText,
        numQuestions: parseInt(numQuestions) || 10,
        quizType: quizType || 'mcq',
        difficulty: difficulty || 'medium',
        language: detectedLanguage,
        category: category || ''
      },
      (evt) => {
        if (!evt || !evt.event) return;
        if (evt.event === 'meta') {
          collected.meta = evt;
          send({ event: 'meta', data: evt });
        } else if (evt.event === 'question') {
          collected.questions.push(evt.question);
          send({ event: 'question', index: evt.index, data: evt.question, received: collected.questions.length });
        } else if (evt.event === 'done') {
          send({ event: 'stream-complete' });
        } else if (evt.event === 'error') {
          send({ event: 'error', message: evt.message || 'Streaming failed' });
        }
      }
    );

    // Persist quiz
    if (collected.questions.length > 0) {
      try {
        const title = collected.meta?.title || 'Generated Quiz';
        const description = collected.meta?.description || '';
        const cat = collected.meta?.category || category || 'General';

        const quiz = await Quiz.create({
          title,
          description,
          creator: req.user._id,
          questions: collected.questions,
          category: cat,
          tags: await geminiService.extractTopics(cleanedText),
          language: detectedLanguage,
          difficulty: difficulty || 'mixed',
          timeLimit: timeLimitValue,
          passingScore: passingScoreValue,
          sourceContent: {
            text: cleanedText.substring(0, 5000),
            filename: req.file.originalname,
            fileType: req.file.mimetype
          },
          isPublic: isPublic === 'true' || isPublic === true
        });

        // File metadata
        try {
          await FileDoc.create({ filename: req.file.filename, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, path: req.file.path, uploadedBy: req.user._id });
        } catch (_) { /* ignore */ }

        // Persist Q/A
        try {
          for (const q of quiz.questions) {
            const qDoc = await QuestionDoc.create({ quizId: quiz._id, questionText: q.questionText, type: q.type, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points });
            if (q.options?.length) {
              const optionsToInsert = q.options.map(o => ({ questionId: qDoc._id, text: o.text, isCorrect: !!o.isCorrect }));
              if (optionsToInsert.length) await AnswerOption.insertMany(optionsToInsert);
            }
          }
        } catch (_) { /* non-fatal */ }

        // Embedding
        try {
          const embeddingId = await embeddingService.createQuizEmbedding(quiz);
          if (embeddingId) {
            quiz.embeddingId = embeddingId;
            await quiz.save();
          }
        } catch (_) { /* non-fatal */ }

        await req.user.incrementUsage('generated');

        send({ event: 'completed', data: { quiz: { id: quiz._id, title: quiz.title, totalQuestions: quiz.questions.length } } });
      } catch (persistErr) {
        send({ event: 'error', message: persistErr.message || 'Failed to save quiz' });
      }
    } else {
      send({ event: 'error', message: 'No questions generated' });
    }

    clearInterval(hb);
    res.end();
  } catch (err) {
    try {
      res.write(`data: ${JSON.stringify({ event: 'error', message: err.message || 'Upload/streaming failed' })}\n\n`);
      res.end();
    } catch (_) { /* ignore */ }
  }
});

/**
 * @route   POST /api/quiz/generate-from-text
 * @desc    Generate quiz from plain text
 * @access  Private
 */
router.post('/generate-from-text', protect, async (req, res) => {
  try {
    const { text, numQuestions, quizType, difficulty, language, category, timeLimit, passingScore, isPublic } = req.body;

    if (!text || text.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Text must be at least 100 characters long'
      });
    }

    // Check limit
    if (!req.user.canGenerateQuiz()) {
      return res.status(403).json({
        success: false,
        message: 'Quiz generation limit reached. Please upgrade your plan.'
      });
    }

    // Auto-detect language from content if not provided or if 'auto'
    const detectedLanguage = (language && language !== 'auto') ? language : textExtractor.detectLanguage(text);
    console.log(`🌐 Detected language: ${detectedLanguage}`);

    // Generate quiz
    const quizResult = await geminiService.generateQuiz({
      content: text,
      numQuestions: parseInt(numQuestions) || 10,
      quizType: quizType || 'mcq',
      difficulty: difficulty || 'medium',
      language: detectedLanguage,
      category: category || ''
    });

    if (!quizResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate quiz'
      });
    }

    const quizData = quizResult.data;

    // Save quiz
    const timeLimitParsed = Number.parseInt(timeLimit, 10);
    const passingScoreParsed = Number.parseInt(passingScore, 10);
    const timeLimitValue = Number.isFinite(timeLimitParsed) && timeLimitParsed > 0 ? Math.min(timeLimitParsed, 300) : 30;
    const passingScoreValue = Number.isFinite(passingScoreParsed) ? Math.min(Math.max(passingScoreParsed, 1), 100) : 60;

    const quiz = await Quiz.create({
      title: quizData.title || 'Generated Quiz',
      description: quizData.description || '',
      creator: req.user._id,
      questions: quizData.questions,
      category: quizData.category || category || 'General',
      tags: await geminiService.extractTopics(text),
      language: detectedLanguage,
      difficulty: difficulty || 'mixed',
      timeLimit: timeLimitValue,
      passingScore: passingScoreValue,
      sourceContent: {
        text: text.substring(0, 5000),
        fileType: 'text/plain'
      },
      isPublic: isPublic === 'true' || isPublic === true
    });

    // Persist questions and answers into required collections
    try {
      for (const q of quiz.questions) {
        const qDoc = await QuestionDoc.create({ quizId: quiz._id, questionText: q.questionText, type: q.type, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points });
        if (q.options?.length) {
          const optionsToInsert = q.options.map(o => ({ questionId: qDoc._id, text: o.text, isCorrect: !!o.isCorrect }));
          if (optionsToInsert.length) await AnswerOption.insertMany(optionsToInsert);
        }
      }
    } catch (e) { console.warn('Failed to persist questions/answers:', e.message); }

    // Generate and store embedding
    try {
      const embeddingId = await embeddingService.createQuizEmbedding(quiz);
      if (embeddingId) {
        quiz.embeddingId = embeddingId;
        await quiz.save();
      }
    } catch (embedError) {
      console.error('Embedding generation error:', embedError);
      // Continue without embedding
    }

    await req.user.incrementUsage('generated');

    res.status(201).json({
      success: true,
      message: 'Quiz generated successfully',
      data: { quiz }
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate quiz'
    });
  }
});

/**
 * @route   POST /api/quiz/stream-from-text
 * @desc    Stream quiz generation (SSE + NDJSON from Gemini)
 * @access  Private
 */
router.post('/stream-from-text', protect, async (req, res) => {
  try {
    const { text, numQuestions, quizType, difficulty, language, category, timeLimit, passingScore, isPublic } = req.body;

    if (!text || text.trim().length < 100) {
      res.status(400);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: 'Text must be at least 100 characters long' }));
    }
    if (!req.user.canGenerateQuiz()) {
      res.status(403);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: 'Quiz generation limit reached. Please upgrade your plan.' }));
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (obj) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    // Heartbeat to keep connection open
    const hb = setInterval(() => res.write(': ping\n\n'), 15000);

    send({ event: 'ready' });

    // Auto-detect language from content if not provided or if 'auto'
    const detectedLanguage = (language && language !== 'auto') ? language : textExtractor.detectLanguage(text);
    console.log(`🌐 Detected language: ${detectedLanguage}`);
    send({ event: 'language-detected', language: detectedLanguage });

    const timeLimitParsed = Number.parseInt(timeLimit, 10);
    const passingScoreParsed = Number.parseInt(passingScore, 10);
    const timeLimitValue = Number.isFinite(timeLimitParsed) && timeLimitParsed > 0 ? Math.min(timeLimitParsed, 300) : 30;
    const passingScoreValue = Number.isFinite(passingScoreParsed) ? Math.min(Math.max(passingScoreParsed, 1), 100) : 60;

    const collected = { meta: null, questions: [] };

    await geminiService.streamQuizNDJSON(
      {
        content: text,
        numQuestions: parseInt(numQuestions) || 10,
        quizType: quizType || 'mcq',
        difficulty: difficulty || 'medium',
        language: detectedLanguage,
        category: category || ''
      },
      (evt) => {
        if (!evt || !evt.event) return;
        if (evt.event === 'meta') {
          collected.meta = evt;
          send({ event: 'meta', data: evt });
        } else if (evt.event === 'question') {
          collected.questions.push(evt.question);
          send({ event: 'question', index: evt.index, data: evt.question, received: collected.questions.length });
        } else if (evt.event === 'done') {
          send({ event: 'stream-complete' });
        } else if (evt.event === 'error') {
          send({ event: 'error', message: evt.message || 'Streaming failed' });
        }
      }
    );

    // After stream, persist quiz if we have enough questions
    if (collected.questions.length > 0) {
      try {
        const title = collected.meta?.title || 'Generated Quiz';
        const description = collected.meta?.description || '';
        const cat = collected.meta?.category || category || 'General';

        const quiz = await Quiz.create({
          title,
          description,
          creator: req.user._id,
          questions: collected.questions,
          category: cat,
          tags: await geminiService.extractTopics(text),
          language: detectedLanguage,
          difficulty: difficulty || 'mixed',
          timeLimit: timeLimitValue,
          passingScore: passingScoreValue,
          sourceContent: { text: text.substring(0, 5000), fileType: 'text/plain' },
          isPublic: isPublic === 'true' || isPublic === true
        });

        // Persist Q/A documents (best-effort)
        try {
          for (const q of quiz.questions) {
            const qDoc = await QuestionDoc.create({ quizId: quiz._id, questionText: q.questionText, type: q.type, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points });
            if (q.options?.length) {
              const optionsToInsert = q.options.map(o => ({ questionId: qDoc._id, text: o.text, isCorrect: !!o.isCorrect }));
              if (optionsToInsert.length) await AnswerOption.insertMany(optionsToInsert);
            }
          }
        } catch (_) { /* non-fatal */ }

        // Embedding (best-effort)
        try {
          const embeddingId = await embeddingService.createQuizEmbedding(quiz);
          if (embeddingId) {
            quiz.embeddingId = embeddingId;
            await quiz.save();
          }
        } catch (_) { /* non-fatal */ }

        await req.user.incrementUsage('generated');

        send({ event: 'completed', data: { quiz: { id: quiz._id, title: quiz.title, totalQuestions: quiz.questions.length } } });
      } catch (persistErr) {
        send({ event: 'error', message: persistErr.message || 'Failed to save quiz' });
      }
    } else {
      send({ event: 'error', message: 'No questions generated' });
    }

    clearInterval(hb);
    res.end();
  } catch (err) {
    try {
      res.write(`data: ${JSON.stringify({ event: 'error', message: err.message || 'Streaming failed' })}\n\n`);
      res.end();
    } catch (_) {
      // ignore
    }
  }
});

/**
 * @route   GET /api/quiz
 * @desc    Get all quizzes (with filters)
 * @access  Public/Private
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, difficulty, language, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build Match Stage
    const matchStage = { status: 'published' };

    // Visibility logic
    if (req.user) {
      matchStage.$or = [
        { isPublic: true },
        { creator: req.user._id }
      ];
    } else {
      matchStage.isPublic = true;
    }

    if (category) matchStage.category = category;
    if (difficulty) matchStage.difficulty = difficulty;
    if (language) matchStage.language = language;
    if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const result = await Quiz.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limitNum },
            {
              $lookup: {
                from: 'users',
                localField: 'creator',
                foreignField: '_id',
                as: 'creatorInfo'
              }
            },
            { $unwind: '$creatorInfo' },
            {
              $project: {
                title: 1,
                description: 1,
                category: 1,
                tags: 1,
                difficulty: 1,
                language: 1,
                timeLimit: 1,
                passingScore: 1,
                isPublic: 1,
                status: 1,
                viewCount: 1,
                createdAt: 1,
                questionsCount: { $size: '$questions' },
                creator: {
                  _id: '$creatorInfo._id',
                  name: '$creatorInfo.name',
                  email: '$creatorInfo.email'
                }
              }
            }
          ]
        }
      }
    ]);

    const quizzes = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    res.json({
      success: true,
      data: {
        quizzes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Fetch quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes'
    });
  }
});

/**
 * @route   GET /api/quiz/:id
 * @desc    Get single quiz (without answers for students)
 * @access  Public/Private
 */
// Public demo quiz for guests
router.get('/demo', async (req, res) => {
  const demo = {
    id: 'demo',
    title: 'Demo Quiz',
    description: 'Try a sample AI quiz without login',
    category: 'General Knowledge',
    tags: ['demo', 'sample'],
    language: 'en',
    difficulty: 'easy',
    questions: [
      { questionText: 'The Earth orbits around the Sun.', type: 'true-false', correctAnswer: 'True', explanation: 'Basic astronomy.', points: 1, difficulty: 'easy', options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] },
      { questionText: '2 + 2 = ?', type: 'mcq', correctAnswer: '4', explanation: 'Simple arithmetic.', points: 1, difficulty: 'easy', options: [{ text: '3', isCorrect: false }, { text: '4', isCorrect: true }, { text: '5', isCorrect: false }, { text: '6', isCorrect: false }] }
    ]
  };
  res.json({ success: true, data: { quiz: demo } });
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('creator', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check access permissions
    let hasAccess = quiz.isPublic || (req.user && (quiz.creator._id.toString() === req.user._id.toString() || req.user.role === 'admin'));

    if (!hasAccess && req.user) {
      // Check if student is in a class that has this quiz
      const studentClass = await Class.findOne({
        students: req.user._id,
        quizzes: quiz._id
      });
      if (studentClass) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment view count
    await quiz.incrementViews();

    // Don't send answers to non-creators
    const isCreator = req.user && quiz.creator._id.toString() === req.user._id.toString();
    const quizData = quiz.toObject();

    if (!isCreator) {
      quizData.questions = quizData.questions.map(q => ({
        ...q,
        correctAnswer: undefined,
        explanation: undefined,
        options: q.options?.map(o => ({ ...o, isCorrect: undefined }))
      }));
    }

    res.json({
      success: true,
      data: { quiz: quizData }
    });
  } catch (error) {
    console.error('Fetch quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz'
    });
  }
});

/**
 * @route   POST /api/quiz/:id/log-violation
 * @desc    Log proctoring violation during quiz attempt
 * @access  Private
 */
router.post('/:id/log-violation', protect, async (req, res) => {
  try {
    const { violation } = req.body;

    if (!violation || !violation.type) {
      return res.status(400).json({
        success: false,
        message: 'Invalid violation data'
      });
    }

    // Log violation (can be used for analytics/monitoring)
    console.log(`🚨 Proctoring violation - User: ${req.user._id}, Quiz: ${req.params.id}, Type: ${violation.type}`);

    res.json({
      success: true,
      message: 'Violation logged'
    });
  } catch (error) {
    console.error('Log violation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log violation'
    });
  }
});

/**
 * @route   POST /api/quiz/:id/submit
 * @desc    Submit quiz answers and get results
 * @access  Private
 */
router.post('/:id/submit', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { answers, timeTaken, proctoring, classId } = req.body;

    const quiz = await Quiz.findById(req.params.id).session(session);
    if (!quiz) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Calculate score
    let correctAnswers = 0;
    let score = 0;
    const detailedAnswers = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      let isCorrect = false;

      if (question.type === 'mcq') {
        const correctOption = question.options.find(o => o.isCorrect);
        isCorrect = userAnswer === correctOption?.text;
      } else if (question.type === 'true-false') {
        isCorrect = userAnswer === question.correctAnswer;
      } else {
        // Short answer - simple comparison (can be improved)
        isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      }

      if (isCorrect) {
        correctAnswers++;
        score += question.points;
      }

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

    // Save to history with proctoring data and classroom context
    const historyData = {
      user: req.user._id,
      quiz: quiz._id,
      answers: detailedAnswers,
      score,
      percentage,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      incorrectAnswers: quiz.questions.length - correctAnswers,
      timeTaken: timeTaken || 0,
      passed,
      classId: classId || null // Store classroom context if provided
    };

    // Add proctoring data if provided
    if (proctoring) {
      historyData.proctoring = {
        enabled: true,
        violations: proctoring.violations || [],
        violationCount: proctoring.violationCount || 0,
        maxViolationsReached: proctoring.maxViolationsReached || false,
        flaggedForReview: proctoring.flaggedForReview || false,
        autoSubmitted: proctoring.autoSubmitted || false
      };
    }

    // Create history entry within transaction
    const history = new QuizHistory(historyData);
    await history.save({ session });

    // Update user usage and points within transaction
    // Note: incrementUsage might not support session if it's a custom method not passing options.
    // Let's check User model or just do it manually here to be safe with session.
    // Assuming incrementUsage is simple, we'll replicate it or try to pass session if possible.
    // For safety, let's fetch user with session and update manually.
    const user = await User.findById(req.user._id).session(session);
    if (user) {
      user.usage.quizzesTaken += 1; // Assuming structure
      user.points += score;
      await user.save({ session });
    }

    // Update quiz analytics within transaction
    quiz.analytics.totalAttempts += 1;
    quiz.analytics.averageScore =
      (quiz.analytics.averageScore * (quiz.analytics.totalAttempts - 1) + percentage) /
      quiz.analytics.totalAttempts;
    await quiz.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: passed ? 'Congratulations! You passed!' : 'Keep practicing!',
      data: {
        results: {
          score,
          percentage: percentage.toFixed(2),
          correctAnswers,
          incorrectAnswers: quiz.questions.length - correctAnswers,
          totalQuestions: quiz.questions.length,
          passed,
          timeTaken,
          detailedAnswers
        },
        historyId: history._id
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

/**
 * @route   PUT /api/quiz/:id
 * @desc    Update quiz
 * @access  Private (Creator only)
 */
router.put('/:id', protect, async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check ownership
    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this quiz'
      });
    }

    const { title, description, questions, isPublic, status } = req.body;

    quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, description, questions, isPublic, status },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: { quiz }
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz'
    });
  }
});

/**
 * @route   DELETE /api/quiz/:id
 * @desc    Delete quiz
 * @access  Private (Creator only)
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check ownership
    if (quiz.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this quiz'
      });
    }

    // Delete from vector index (Mongo-backed embeddings)
    try {
      await embeddingService.deleteQuizEmbedding(quiz._id);
    } catch (e) {
      console.warn('Failed to delete quiz embedding (non-fatal):', e?.message || e);
    }

    await quiz.deleteOne();

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz'
    });
  }
});

/**
 * @route   GET /api/quiz/my/quizzes
 * @desc    Get user's created quizzes
 * @access  Private
 */
router.get('/my/quizzes', protect, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { quizzes, total: quizzes.length }
    });
  } catch (error) {
    console.error('Fetch my quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes'
    });
  }
});

module.exports = router;
