const { extractText } = require('./textExtractor');
const { generateQuizContent } = require('./geminiService');
const Quiz = require('../models/Quiz');
const { createQuizVector } = require('./vectorSearchService');

/**
 * Generate a quiz from a file
 * @param {string} filePath - Path to the uploaded file
 * @param {string} mimetype - Mimetype of the file
 * @param {object} options - Quiz generation options
 * @param {string} userId - ID of the user creating the quiz
 * @returns {Promise<Quiz>}
 */
async function generateQuizFromFile(filePath, mimetype, options, userId) {
  // Extract text from file
  const text = await extractText(filePath, mimetype);

  if (!text || text.length < 100) {
    throw new Error('Could not extract sufficient text from the file.');
  }

  // Generate quiz content using Gemini
  const { title, questions, category, tags } = await generateQuizContent(
    text,
    options
  );

  // Create and save the quiz
  const quiz = new Quiz({
    title,
    questions,
    category,
    tags,
    creator: userId,
    sourceType: 'file',
    sourceFile: filePath,
    isPublic: true, // Or based on user preference
  });

  await quiz.save();

  // Generate and save the quiz vector for similarity search
  await createQuizVector(quiz._id, `${title} ${text}`);

  return quiz;
}

module.exports = {
  generateQuizFromFile,
};