const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Class = require('../models/Class');
const Quiz = require('../models/Quiz');
const mongoose = require('mongoose');

// Check if code exists
router.get('/check-code/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const existing = await Class.findOne({ code });
    res.json({ success: true, exists: !!existing });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to check code' });
  }
});

// Create class (teacher)
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { name, description, subject, grade, institution, code } = req.body;

    // Check if code already exists (if provided)
    if (code) {
      const existing = await Class.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Class code already exists' });
      }
    }

    const classData = {
      name,
      description,
      subject,
      grade,
      institution,
      teacher: req.user._id
    };

    // Add code if provided
    if (code) {
      classData.code = code.toUpperCase();
    }

    const klass = await Class.create(classData);
    res.status(201).json({ success: true, data: { class: klass } });
  } catch (e) {
    console.error('Create class error:', e);
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Class code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create class' });
  }
});

// Join class by code (student)
router.post('/join', protect, authorize('student', 'teacher', 'admin'), async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Class code is required' });

    const klass = await Class.findOne({ code: code.toUpperCase() });
    if (!klass) return res.status(404).json({ success: false, message: 'Invalid class code' });

    // Check if student is already in the class
    if (!klass.students.some(s => s.toString() === req.user._id.toString())) {
      klass.students.push(req.user._id);
      await klass.save();
    }

    res.json({ success: true, message: 'Joined class successfully', data: { class: klass } });
  } catch (e) {
    console.error('Join class error:', e);
    res.status(500).json({ success: false, message: 'Failed to join class' });
  }
});

// My classes (teacher sees owned, student sees joined) - MUST BE BEFORE /:id
// My classes (teacher sees owned, student sees joined) - MUST BE BEFORE /:id
router.get('/mine', protect, async (req, res) => {
  try {
    const matchStage = (req.user.role === 'teacher' || req.user.role === 'admin')
      ? { teacher: req.user._id }
      : { students: req.user._id };

    const classes = await Class.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher',
          foreignField: '_id',
          as: 'teacherInfo'
        }
      },
      { $unwind: '$teacherInfo' },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizzes',
          foreignField: '_id',
          as: 'quizDetails'
        }
      },
      {
        $addFields: {
          studentCount: { $size: '$students' },
          quizCount: { $size: '$quizzes' },
          teacher: {
            name: '$teacherInfo.name',
            email: '$teacherInfo.email'
          }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          subject: 1,
          grade: 1,
          institution: 1,
          code: 1,
          teacher: 1,
          studentCount: 1,
          quizCount: 1,
          quizDetails: { title: 1, _id: 1 } // Only keep title and ID
        }
      }
    ]);

    res.json({ success: true, data: { classes } });
  } catch (e) {
    console.error('Fetch my classes error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch classes' });
  }
});

// Leave class (student)
router.post('/:id/leave', protect, authorize('student'), async (req, res) => {
  try {
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if student is in the class
    if (!klass.students.some(s => s.toString() === req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'You are not in this class' });
    }

    // Remove student
    klass.students = klass.students.filter(s => s.toString() !== req.user._id.toString());
    await klass.save();

    res.json({ success: true, message: 'Left class successfully' });
  } catch (e) {
    console.error('Leave class error:', e);
    res.status(500).json({ success: false, message: 'Failed to leave class' });
  }
});

// Assign quiz to class (teacher)
router.post('/:id/assign', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { quizId } = req.body;
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });
    if (klass.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (!klass.quizzes.some(q => q.toString() === quiz._id.toString())) {
      klass.quizzes.push(quiz._id);
      await klass.save();
    }
    res.json({ success: true, message: 'Quiz assigned', data: { class: klass } });
  } catch (e) {
    console.error('Assign quiz error:', e);
    res.status(500).json({ success: false, message: 'Failed to assign quiz' });
  }
});

// Class details
router.get('/:id', protect, async (req, res) => {
  try {
    const klass = await Class.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email')
      .populate('quizzes', 'title category')
      .populate('posts.author', 'name email');
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, data: { class: klass } });
  } catch (e) {
    console.error('Fetch class error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch class' });
  }
});

// Delete class (teacher)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if user is the teacher of this class or admin
    if (klass.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this class' });
    }

    await Class.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (e) {
    console.error('Delete class error:', e);
    res.status(500).json({ success: false, message: 'Failed to delete class' });
  }
});

// Remove student from class (teacher)
router.delete('/:id/students/:studentId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if user is the teacher of this class or admin
    if (klass.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Remove student from array
    klass.students = klass.students.filter(s => s.toString() !== req.params.studentId);
    await klass.save();

    res.json({ success: true, message: 'Student removed successfully' });
  } catch (e) {
    console.error('Remove student error:', e);
    res.status(500).json({ success: false, message: 'Failed to remove student' });
  }
});

// Generate new class code (teacher)
router.post('/:id/new-code', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if user is the teacher of this class or admin
    if (klass.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Generate new unique code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let newCode;
    let attempts = 0;
    while (attempts < 10) {
      newCode = generateCode();
      const existing = await Class.findOne({ code: newCode });
      if (!existing) break;
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique code' });
    }

    klass.code = newCode;
    await klass.save();

    res.json({ success: true, data: { code: newCode } });
  } catch (e) {
    console.error('Generate new code error:', e);
    res.status(500).json({ success: false, message: 'Failed to generate new code' });
  }
});

// Get join requests (currently returns empty - can be implemented later)
router.get('/:id/join-requests', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if user is the teacher of this class or admin
    if (klass.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // For now, return empty requests array
    // This can be extended later if join request approval system is needed
    res.json({ success: true, data: { requests: [] } });
  } catch (e) {
    console.error('Get join requests error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch join requests' });
  }
});

// Handle join request (approve/reject) - placeholder for future implementation
router.post('/:id/join-requests/:requestId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { action } = req.body;
    // Placeholder implementation
    res.json({ success: true, message: `Request ${action}d successfully` });
  } catch (e) {
    console.error('Handle join request error:', e);
    res.status(500).json({ success: false, message: 'Failed to handle join request' });
  }
});

// Create post in class (teacher)
router.post('/:id/posts', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { message } = req.body;
    const klass = await Class.findById(req.params.id);
    if (!klass) return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if user is the teacher of this class or admin
    if (klass.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Initialize posts array if it doesn't exist
    if (!klass.posts) {
      klass.posts = [];
    }

    // Add new post
    const newPost = {
      _id: new mongoose.Types.ObjectId(),
      author: req.user._id,
      message: message,
      createdAt: new Date()
    };

    klass.posts.unshift(newPost);
    await klass.save();

    // Populate author info
    await klass.populate('posts.author', 'name email');

    res.json({ success: true, message: 'Post created successfully', data: { post: newPost } });
  } catch (e) {
    console.error('Create post error:', e);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

module.exports = router;
