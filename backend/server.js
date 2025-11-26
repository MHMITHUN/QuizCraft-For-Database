const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
// 1. Root-level defaults (shared across apps)
dotenv.config({ path: path.join(__dirname, '../.env') });
// 2. Backend-specific overrides (wins when both define the same key)
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-production-domain.com']
    : '*',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (for uploads)
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/search', require('./routes/search'));
app.use('/api/ingest', require('./routes/ingest'));
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// Optional alias: /api/leaderboard -> analytics leaderboard
app.get('/api/leaderboard', async (req, res, next) => {
  try {
    const analyticsRouter = require('./routes/analytics');
    next();
  } catch (e) {
    next();
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'QuizCraft API is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to QuizCraft API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      quiz: '/api/quiz',
      search: '/api/search',
      analytics: '/api/analytics',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;
const SERVER_IP = process.env.SERVER_IP || 'localhost';
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QuizCraft Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: Connected to MongoDB`);
  console.log(`🤖 AI: Google Gemini ${process.env.GEMINI_MODEL}`);
  console.log(`🌐 Server accessible at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://${SERVER_IP}:${PORT} 📱 (Your Network IP)`);
  console.log(`   - http://10.0.2.2:${PORT} (Android Emulator)`);
});

// Increase server timeout for long-running AI generation
server.setTimeout(parseInt(process.env.SERVER_TIMEOUT_MS || '180000'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Only exit in production to keep dev server alive
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Only exit in production to keep dev server alive
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
