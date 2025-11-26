const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerificationSentAt: Date,
  // 6-digit OTP for email verification
  emailVerificationCode: String,
  emailVerificationCodeExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // 6-digit OTP for password reset
  passwordResetCode: String,
  passwordResetCodeExpires: Date,
  // Admin 2FA login verification
  adminLoginCode: String,
  adminLoginCodeExpires: Date,
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['guest', 'student', 'teacher', 'admin'],
    default: 'student'
  },
  guestTrialExpiresAt: Date,
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'institutional'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  usage: {
    quizzesGenerated: {
      type: Number,
      default: 0
    },
    quizzesTaken: {
      type: Number,
      default: 0
    },
    lastQuizDate: Date
  },
  preferences: {
    language: {
      type: String,
      enum: ['en', 'bn'],
      default: 'en'
    },
    defaultQuizType: {
      type: String,
      enum: ['mcq', 'true-false', 'short-answer'],
      default: 'mcq'
    }
  },
  teacherInfo: {
    institution: String,
    subject: String,
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    classes: [{
      name: String,
      code: String,
      students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }]
  },
  points: {
    type: Number,
    default: 0
  },
  avatar: String,
  phone: String,
  bio: String,
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving to keep credentials secure
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare raw password with hashed version stored in DB
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and persist a short-lived, hashed email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  this.emailVerificationSentAt = new Date();
  return verificationToken;
};

// Generate 6-digit numeric code for email verification
userSchema.methods.generateEmailVerificationCode = function() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  this.emailVerificationCode = code;
  this.emailVerificationCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  this.emailVerificationSentAt = new Date();
  return code;
};

// Mark account as verified in a single place to keep logic consistent
userSchema.methods.markEmailVerified = function() {
  this.isEmailVerified = true;
  this.emailVerifiedAt = new Date();
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
  this.emailVerificationSentAt = undefined;
  this.emailVerificationCode = undefined;
  this.emailVerificationCodeExpires = undefined;
};

// Generate and persist hashed token for password reset flow
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

// Generate 6-digit code for password reset
userSchema.methods.generatePasswordResetCode = function() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  this.passwordResetCode = code;
  this.passwordResetCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return code;
};

// Generate 6-digit code for admin login verification
userSchema.methods.generateAdminLoginCode = function() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  this.adminLoginCode = code;
  this.adminLoginCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};

// Check if user can still generate quizzes based on plan limits
userSchema.methods.canGenerateQuiz = function() {
  if (this.role === 'admin') return true;

  // Robust defaults so local/dev environments don't get locked out
  const freeLimitEnv = parseInt(process.env.FREE_QUIZ_LIMIT, 10);
  const premiumLimitEnv = parseInt(process.env.PREMIUM_QUIZ_LIMIT, 10);

  const freeLimit = Number.isFinite(freeLimitEnv) ? freeLimitEnv : 10; // sensible default
  const premiumLimit = Number.isFinite(premiumLimitEnv) ? premiumLimitEnv : 1000;

  const limit = this.subscription?.plan === 'free' ? freeLimit : premiumLimit;

  return this.usage.quizzesGenerated < limit;
};

// Increment usage counters and persist in DB
userSchema.methods.incrementUsage = async function(type) {
  if (type === 'generated') {
    this.usage.quizzesGenerated += 1;
    this.usage.lastQuizDate = new Date();
  } else if (type === 'taken') {
    this.usage.quizzesTaken += 1;
  }
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
