// MongoDB initialization script for QuizCraft
// This runs automatically when MongoDB container starts for the first time

print('🚀 Initializing QuizCraft MongoDB...');

// Switch to the quizcraft database
db = db.getSiblingDB('quizcraft');

// Create a user for the application
db.createUser({
  user: 'quizcraft_user',
  pwd: 'quizcraft_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'quizcraft'
    }
  ]
});

// Create collections with indexes
print('📚 Creating collections and indexes...');

// Users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Quizzes collection
db.createCollection('quizzes');
db.quizzes.createIndex({ title: 1 });
db.quizzes.createIndex({ category: 1 });
db.quizzes.createIndex({ createdBy: 1 });
db.quizzes.createIndex({ createdAt: -1 });
db.quizzes.createIndex({ "embeddings.vector": 1 });

// Quiz attempts collection
db.createCollection('quizattempts');
db.quizattempts.createIndex({ userId: 1 });
db.quizattempts.createIndex({ quizId: 1 });
db.quizattempts.createIndex({ attemptedAt: -1 });

// Categories collection
db.createCollection('categories');
db.categories.createIndex({ name: 1 }, { unique: true });

// Insert default categories
db.categories.insertMany([
  { name: 'General Knowledge', description: 'General knowledge questions' },
  { name: 'Science', description: 'Science and technology questions' },
  { name: 'History', description: 'Historical facts and events' },
  { name: 'Mathematics', description: 'Mathematical problems and concepts' },
  { name: 'Literature', description: 'Books, authors, and literary works' },
  { name: 'Programming', description: 'Software development and coding' },
  { name: 'Business', description: 'Business and entrepreneurship' }
]);

print('✅ MongoDB initialization completed successfully!');
print('📊 Database: quizcraft');
print('👤 User: quizcraft_user');
print('🔐 Collections and indexes created');
print('📝 Default categories inserted');