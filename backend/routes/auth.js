const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
  sendAdminLoginCodeEmail
} = require('../services/emailService');

const generateToken = (id, expiresIn = process.env.JWT_EXPIRE) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn
  });
};

const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  guestTrialExpiresAt: user.guestTrialExpiresAt,
  subscription: user.subscription,
  usage: user.usage,
  preferences: user.preferences,
  points: user.points,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  emailVerifiedAt: user.emailVerifiedAt,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin
});

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

const registrationValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'teacher']).withMessage('Invalid role')
];

const registerHandler = async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'student'
    });

    // Generate both link token and 6-digit code for flexibility
    const verificationToken = user.generateEmailVerificationToken();
    const verificationCode = user.generateEmailVerificationCode();
    await user.save();

    let verificationEmailSent = false;
    try {
      // Prefer code-based email for mobile
      await sendVerificationCodeEmail(user, verificationCode);
      verificationEmailSent = true;
    } catch (emailError) {
      console.error('Verification email error:', emailError);
      try {
        await sendVerificationEmail(user, verificationToken);
        verificationEmailSent = true;
      } catch (e2) {
        console.error('Fallback verification email error:', e2);
      }
    }

    // Do NOT issue login token until email is verified
    return res.status(201).json({
      success: true,
      message: verificationEmailSent
        ? 'Account created. Check your email for the 6-digit verification code.'
        : 'Account created. We could not send the verification email, please request a new code.',
      data: {
        user: buildUserPayload(user),
        verification: {
          sent: verificationEmailSent,
          sentAt: user.emailVerificationSentAt,
          expiresAt: user.emailVerificationExpires,
          codeExpiresAt: user.emailVerificationCodeExpires
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

router.post('/signup', registrationValidators, registerHandler);
router.post('/register', registrationValidators, registerHandler);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Admin users require 2FA verification
    if (user.role === 'admin') {
      // Generate and send 2FA code
      const code = user.generateAdminLoginCode();
      await user.save({ validateBeforeSave: false });
      
      try {
        await sendAdminLoginCodeEmail(user, code);
        return res.status(200).json({
          success: true,
          requiresAdminVerification: true,
          message: 'Admin verification code sent to your email',
          data: {
            email: user.email,
            codeExpiresAt: user.adminLoginCodeExpires
          }
        });
      } catch (emailError) {
        console.error('Admin 2FA email error:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification code. Please try again.'
        });
      }
    }

    // Regular users (student/teacher) must have verified email
    if (!user.isEmailVerified) {
      const isExpired = user.emailVerificationExpires && user.emailVerificationExpires < Date.now();
      return res.status(403).json({
        success: false,
        message: isExpired
          ? 'Email verification link expired. Please request a new verification email.'
          : 'Please verify your email address before logging in.',
        verification: {
          sentAt: user.emailVerificationSentAt,
          expiresAt: user.emailVerificationExpires,
          expired: !!isExpired
        }
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: buildUserPayload(user),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Verify by token (link in email)
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired'
      });
    }

    if (!user.isEmailVerified) {
      user.markEmailVerified();
      await user.save({ validateBeforeSave: false });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        token,
        user: buildUserPayload(user)
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying email'
    });
  }
});

router.post('/verify-email/resend', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a new verification link has been sent.'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(user, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        sentAt: user.emailVerificationSentAt,
        expiresAt: user.emailVerificationExpires
      }
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending verification email'
    });
  }
});

// Send a 6-digit email verification code
router.post('/verify-email/send-code', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a code has been sent.' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }
    const code = user.generateEmailVerificationCode();
    await user.save({ validateBeforeSave: false });
    await sendVerificationCodeEmail(user, code);
    return res.json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        sentAt: user.emailVerificationSentAt,
        codeExpiresAt: user.emailVerificationCodeExpires
      }
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({ success: false, message: 'Server error sending code' });
  }
});

// Verify email using 6-digit code
router.post('/verify-email/code', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    if (user.isEmailVerified) {
      // Already verified; issue token directly
      const token = generateToken(user._id);
      return res.json({ success: true, message: 'Email already verified', data: { token, user: buildUserPayload(user) } });
    }
    if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    if (user.emailVerificationCode !== code || user.emailVerificationCodeExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    user.markEmailVerified();
    // Clear code fields explicitly (markEmailVerified already clears but ensure both)
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    return res.json({ success: true, message: 'Email verified successfully', data: { token, user: buildUserPayload(user) } });
  } catch (error) {
    console.error('Verify email code error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying code' });
  }
});

// Admin login verification with 2FA code
router.post('/verify-admin-login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    const { email, code } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification attempt' 
      });
    }
    
    if (!user.adminLoginCode || !user.adminLoginCodeExpires) {
      return res.status(400).json({ 
        success: false, 
        message: 'No verification code found. Please login again.' 
      });
    }
    
    if (user.adminLoginCodeExpires < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code expired. Please login again.' 
      });
    }
    
    if (user.adminLoginCode !== code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }
    
    // Clear the admin login code
    user.adminLoginCode = undefined;
    user.adminLoginCodeExpires = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Generate token and return user data
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'Admin verification successful',
      data: {
        user: buildUserPayload(user),
        token
      }
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification' 
    });
  }
});

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a reset code has been sent.'
      });
    }

    const resetCode = user.generatePasswordResetCode();
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetCodeEmail(user, resetCode);

    res.json({
      success: true,
      message: 'Password reset code sent successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error initiating password reset'
    });
  }
});

// Verify reset code (for UX step before setting new password)
router.post('/verify-reset-code', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.passwordResetCode || !user.passwordResetCodeExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    if (user.passwordResetCode !== code || user.passwordResetCodeExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    return res.json({ success: true, message: 'Code verified' });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying code' });
  }
});

router.post('/reset-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const { email, code, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.passwordResetCode || !user.passwordResetCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired code'
      });
    }

    if (user.passwordResetCode !== code || user.passwordResetCodeExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    user.password = password;
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    if (!user.isEmailVerified) {
      user.markEmailVerified();
    }

    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        user: buildUserPayload(user)
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, preferences, teacherInfo, phone, bio, address } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (bio !== undefined) updateFields.bio = bio;
    if (address) updateFields.address = { ...req.user.address?.toObject?.() || req.user.address || {}, ...address };
    if (preferences) updateFields.preferences = { ...req.user.preferences, ...preferences };
    if (teacherInfo && req.user.role === 'teacher') {
      updateFields.teacherInfo = { ...req.user.teacherInfo, ...teacherInfo };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: buildUserPayload(user) }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/guest-access', async (req, res) => {
  try {
    const trialDurationMs = 10 * 60 * 1000;
    const trialExpiry = new Date(Date.now() + trialDurationMs);

    const guestUser = await User.create({
      name: 'Guest User',
      email: `guest_${Date.now()}@example.com`,
      password: 'guestpassword',
      role: 'guest',
      isEmailVerified: true,
      guestTrialExpiresAt: trialExpiry
    });

    const token = generateToken(guestUser._id, '10m');

    res.json({
      success: true,
      message: 'Guest access granted',
      data: {
        user: buildUserPayload(guestUser),
        token
      }
    });
  } catch (error) {
    console.error('Guest access error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
