const mongoose = require('mongoose');
const connectDB = require('../config/database');

const collections = [
  'users',
  'quizzes',
  'quizHistories',
  'questions',
  'answers',
  'tags',
  'categories',
  'leaderboards',
  'analytics',
  'notifications',
  'feedback',
  'subscriptions',
  'payments',
  'files',
  'systemSettings',
];

const createCollections = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected');

    for (const collection of collections) {
      await mongoose.connection.createCollection(collection);
      console.log(`Collection '${collection}' created`);
    }

    mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error creating collections:', error);
    process.exit(1);
  }
};

createCollections();