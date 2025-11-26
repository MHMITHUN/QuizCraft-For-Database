const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import all models
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizHistory = require('../models/QuizHistory');
const QuizEmbedding = require('../models/QuizEmbedding');
const QuizAttempt = require('../models/QuizAttempt');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Class = require('../models/Class');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const Subscription = require('../models/Subscription');

/**
 * Setup MongoDB Database with all collections and indexes
 */
async function setupDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // List of all collections to create
    const collections = [
      'users',
      'quizzes',
      'quizhistories',
      'quizembeddings',
      'quizattempts',
      'categories',
      'tags',
      'classes',
      'achievements',
      'userachievements',
      'activitylogs',
      'notifications',
      'comments',
      'subscriptions',
      'questions',
      'answeroptions',
      'feedbacks',
      'files',
      'legacyquizhistories',
      'packages',
      'payments',
      'quizembeddingchunks',
      'systemsettings'
    ];

    console.log('\n📦 Creating collections...');

    // Create collections if they don't exist
    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);

    for (const collectionName of collections) {
      if (!existingNames.includes(collectionName)) {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } else {
        console.log(`✓  Collection already exists: ${collectionName}`);
      }
    }

    console.log('\n🔍 Creating indexes...');

    // Users indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ 'subscription.plan': 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ points: -1 });
    console.log('✅ Users indexes created');

    // Quizzes indexes
    await Quiz.collection.createIndex({ creator: 1 });
    await Quiz.collection.createIndex({ category: 1 });
    await Quiz.collection.createIndex({ tags: 1 });
    await Quiz.collection.createIndex({ difficulty: 1 });
    await Quiz.collection.createIndex({ language: 1 });
    await Quiz.collection.createIndex({ isPublic: 1 });
    await Quiz.collection.createIndex({ status: 1 });
    await Quiz.collection.createIndex({ createdAt: -1 });
    await Quiz.collection.createIndex({ 'stats.views': -1 });
    await Quiz.collection.createIndex({ 'stats.averageScore': -1 });
    // Text index for search
    await Quiz.collection.createIndex({
      title: 'text',
      description: 'text',
      category: 'text'
    });
    console.log('✅ Quizzes indexes created');

    // QuizHistory indexes
    await QuizHistory.collection.createIndex({ user: 1, createdAt: -1 });
    await QuizHistory.collection.createIndex({ quiz: 1 });
    await QuizHistory.collection.createIndex({ percentage: -1 });
    await QuizHistory.collection.createIndex({ passed: 1 });
    await QuizHistory.collection.createIndex({ createdAt: -1 });
    console.log('✅ QuizHistory indexes created');

    // QuizEmbeddings indexes
    await QuizEmbedding.collection.createIndex({ quiz: 1 }, { unique: true });
    await QuizEmbedding.collection.createIndex({ 'metadata.category': 1 });
    await QuizEmbedding.collection.createIndex({ 'metadata.tags': 1 });
    await QuizEmbedding.collection.createIndex({ lastUpdated: -1 });
    console.log('✅ QuizEmbedding indexes created');

    // QuizAttempts indexes
    await QuizAttempt.collection.createIndex({ user: 1, quiz: 1 });
    await QuizAttempt.collection.createIndex({ startedAt: -1 });
    await QuizAttempt.collection.createIndex({ status: 1 });
    console.log('✅ QuizAttempt indexes created');

    // Categories indexes
    await Category.collection.createIndex({ name: 1 }, { unique: true });
    await Category.collection.createIndex({ slug: 1 }, { unique: true });
    await Category.collection.createIndex({ isActive: 1 });
    console.log('✅ Category indexes created');

    // Tags indexes
    await Tag.collection.createIndex({ name: 1 }, { unique: true });
    await Tag.collection.createIndex({ usageCount: -1 });
    console.log('✅ Tag indexes created');

    // Classes indexes
    await Class.collection.createIndex({ teacher: 1 });
    await Class.collection.createIndex({ code: 1 }, { unique: true });
    await Class.collection.createIndex({ students: 1 });
    await Class.collection.createIndex({ isActive: 1 });
    console.log('✅ Class indexes created');

    // Achievements indexes
    await Achievement.collection.createIndex({ type: 1 });
    await Achievement.collection.createIndex({ isActive: 1 });
    console.log('✅ Achievement indexes created');

    // UserAchievements indexes
    await UserAchievement.collection.createIndex({ user: 1, achievement: 1 }, { unique: true });
    await UserAchievement.collection.createIndex({ earnedAt: -1 });
    console.log('✅ UserAchievement indexes created');

    // ActivityLogs indexes
    await ActivityLog.collection.createIndex({ user: 1, createdAt: -1 });

    console.log('\n🎉 Your QuizCraft database is ready to use!');

  } catch (error) {
    console.error('❌ Database setup error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✨ Setup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup script failed:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;
