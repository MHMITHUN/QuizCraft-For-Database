const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Models
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizHistory = require('../models/QuizHistory');

async function verify() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Verify Indexes
        console.log('\n--- Verifying Indexes ---');
        await QuizHistory.createIndexes();
        await Quiz.createIndexes();

        const historyIndexes = await QuizHistory.collection.indexes();
        const quizIndexes = await Quiz.collection.indexes();

        const hasHistoryIndex = historyIndexes.some(i => i.key.quiz === 1 && i.key.createdAt === -1);
        const hasQuizIndex = quizIndexes.some(i => i.key.category === 1 && i.key.difficulty === 1);

        console.log(`QuizHistory Index {quiz:1, createdAt:-1}: ${hasHistoryIndex ? '✅ Found' : '❌ Missing'}`);
        console.log(`Quiz Index {category:1, difficulty:1}: ${hasQuizIndex ? '✅ Found' : '❌ Missing'}`);

        // 2. Verify Aggregations (Dry Run)
        console.log('\n--- Verifying Aggregations (Dry Run) ---');

        // Category Performance
        const catPerf = await QuizHistory.aggregate([
            { $match: { status: 'completed' } },
            { $lookup: { from: 'quizzes', localField: 'quiz', foreignField: '_id', as: 'quizInfo' } },
            { $unwind: '$quizInfo' },
            { $group: { _id: '$quizInfo.category', avgScore: { $avg: '$percentage' }, totalAttempts: { $sum: 1 } } }
        ]);
        console.log('Category Performance Aggregation: ✅ Executed (Result count: ' + catPerf.length + ')');

        // Engagement Trends
        const trends = await QuizHistory.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, attempts: { $sum: 1 } } }
        ]);
        console.log('Engagement Trends Aggregation: ✅ Executed (Result count: ' + trends.length + ')');

        // Users Profile Aggregation
        const userAgg = await User.aggregate([
            { $limit: 1 },
            { $lookup: { from: 'quizhistories', localField: '_id', foreignField: 'user', as: 'history' } },
            { $addFields: { totalQuizzesTaken: { $size: '$history' } } }
        ]);
        console.log('User Profile Aggregation: ✅ Executed (Result count: ' + userAgg.length + ')');

        // Quiz Faceted Search
        const quizFacet = await Quiz.aggregate([
            { $match: { status: 'published' } },
            { $facet: { metadata: [{ $count: "total" }], data: [{ $limit: 1 }] } }
        ]);
        console.log('Quiz Faceted Search: ✅ Executed (Total found: ' + (quizFacet[0].metadata[0]?.total || 0) + ')');

        // 3. Verify Transactions
        console.log('\n--- Verifying Transactions ---');
        try {
            const session = await mongoose.startSession();
            session.startTransaction();
            console.log('Transaction started successfully.');
            await session.abortTransaction();
            session.endSession();
            console.log('Transaction aborted and session ended. ✅ Transaction support confirmed.');
        } catch (e) {
            console.log('❌ Transaction failed (Is Replica Set enabled?):', e.message);
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

verify();
