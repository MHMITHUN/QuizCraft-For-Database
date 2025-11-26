const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    if (req.user.role === 'guest') {
      const expiresAt = req.user.guestTrialExpiresAt instanceof Date
        ? req.user.guestTrialExpiresAt.getTime()
        : new Date(req.user.guestTrialExpiresAt || 0).getTime();
      if (!expiresAt || Date.now() > expiresAt) {
        return res.status(401).json({
          success: false,
          message: 'Guest trial has ended. Please create an account to continue.'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional authentication (for guest access)
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      if (req.user?.role === 'guest') {
        const expiresAt = req.user.guestTrialExpiresAt instanceof Date
          ? req.user.guestTrialExpiresAt.getTime()
          : new Date(req.user.guestTrialExpiresAt || 0).getTime();
        if (!expiresAt || Date.now() > expiresAt) {
          req.user = null;
        }
      }
    } catch (error) {
      // Token invalid, continue as guest
      req.user = null;
    }
  }

  next();
};
