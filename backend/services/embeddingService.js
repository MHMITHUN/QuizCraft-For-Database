const { GoogleGenerativeAI } = require('@google/generative-ai');
const QuizEmbedding = require('../models/QuizEmbedding');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class EmbeddingService {
  constructor() {
    // Use the latest Google text embedding model
    this.model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Generate embedding for text using Gemini
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Clean and truncate text if too long
      const cleanText = text.trim().substring(0, 10000);

// Generate embedding using Google Embeddings
      const result = await this.model.embedContent({
        content: { parts: [{ text: cleanText }] }
      });
      const embedding = result.embedding;

      if (!embedding || !embedding.values || embedding.values.length === 0) {
        throw new Error('Failed to generate embedding');
      }

      return embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Create and store quiz embedding
   * @param {Object} quiz - Quiz object
   * @returns {Promise<string>} - Embedding ID
   */
  async createQuizEmbedding(quiz) {
    try {
      // Combine quiz text for embedding
      const combinedText = this.combineQuizText(quiz);

      // Generate embedding
      const embeddingVector = await this.generateEmbedding(combinedText);

      // Check if embedding already exists
      let quizEmbedding = await QuizEmbedding.findOne({ quiz: quiz._id });

      if (quizEmbedding) {
        // Update existing embedding
        quizEmbedding.embedding = embeddingVector;
        quizEmbedding.text = combinedText;
        quizEmbedding.metadata = {
          category: quiz.category,
          tags: quiz.tags,
          difficulty: quiz.difficulty,
          language: quiz.language,
          questionCount: quiz.questions.length
        };
        quizEmbedding.lastUpdated = new Date();
        await quizEmbedding.save();
      } else {
        // Create new embedding
        quizEmbedding = await QuizEmbedding.create({
          quiz: quiz._id,
          embedding: embeddingVector,
          text: combinedText,
          metadata: {
            category: quiz.category,
            tags: quiz.tags,
            difficulty: quiz.difficulty,
            language: quiz.language,
            questionCount: quiz.questions.length
          }
        });
      }

      console.log(`✅ Embedding created/updated for quiz: ${quiz._id}`);
      return quizEmbedding._id.toString();
    } catch (error) {
      console.error('Create quiz embedding error:', error);
      throw error;
    }
  }

  /**
   * Combine quiz information into searchable text
   * @param {Object} quiz - Quiz object
   * @returns {string} - Combined text
   */
  combineQuizText(quiz) {
    let text = '';

    // Add title and description
    text += `${quiz.title || ''}\n\n`;
    text += `${quiz.description || ''}\n\n`;

    // Add category and tags
    text += `Category: ${quiz.category || ''}\n`;
    text += `Tags: ${quiz.tags ? quiz.tags.join(', ') : ''}\n\n`;

    // Add all questions and answers
    if (quiz.questions && quiz.questions.length > 0) {
      quiz.questions.forEach((q, index) => {
        text += `Q${index + 1}: ${q.questionText}\n`;
        
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, optIndex) => {
            text += `  ${String.fromCharCode(65 + optIndex)}. ${opt.text}\n`;
          });
        }
        
        if (q.explanation) {
          text += `Explanation: ${q.explanation}\n`;
        }
        text += '\n';
      });
    }

    return text.trim();
  }

  /**
   * Find similar quizzes using vector similarity
   * @param {string} queryText - Search query
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Similar quizzes
   */
  async findSimilarQuizzes(queryText, limit = 10) {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);

// First try Atlas Vector Search if index is available
      try {
        const results = await QuizEmbedding.aggregate([
          {
            $vectorSearch: {
              index: process.env.ATLAS_VECTOR_INDEX || 'quizembeddings_vector_index',
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: 200,
              limit
            }
          },
          {
            $lookup: {
              from: 'quizzes',
              localField: 'quiz',
              foreignField: '_id',
              as: 'quizData'
            }
          },
          { $unwind: '$quizData' },
          {
            $project: {
              quizId: '$quiz',
              // Atlas vector search returns score in metadata
              similarity: { $meta: 'vectorSearchScore' },
              quiz: '$quizData'
            }
          }
        ]);
        if (Array.isArray(results) && results.length > 0) {
          return results.map(r => ({
            quizId: r.quizId.toString(),
            similarity: r.similarity,
            quiz: r.quiz
          }));
        }
      } catch (vsErr) {
        // If $vectorSearch unsupported or index missing, fall back
        console.warn('Vector Search not available, falling back to manual cosine similarity:', vsErr?.message || vsErr);
      }

      // Fallback manual cosine similarity (works without vector index, but slower)
      const results = await QuizEmbedding.aggregate([
        {
          $addFields: {
            similarity: {
              $let: {
                vars: {
                  dotProduct: {
                    $reduce: {
                      input: { $range: [0, { $size: '$embedding' }] },
                      initialValue: 0,
                      in: {
                        $add: [
                          '$$value',
                          {
                            $multiply: [
                              { $arrayElemAt: ['$embedding', '$$this'] },
                              { $arrayElemAt: [queryEmbedding, '$$this'] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  queryMagnitude: Math.sqrt(
                    queryEmbedding.reduce((sum, val) => sum + val * val, 0)
                  ),
                  embeddingMagnitude: {
                    $sqrt: {
                      $reduce: {
                        input: '$embedding',
                        initialValue: 0,
                        in: { $add: ['$$value', { $multiply: ['$$this', '$$this'] }] }
                      }
                    }
                  }
                },
                in: {
                  $divide: [
                    '$$dotProduct',
                    { $multiply: ['$$queryMagnitude', '$$embeddingMagnitude'] }
                  ]
                }
              }
            }
          }
        },
        { $sort: { similarity: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'quiz',
            foreignField: '_id',
            as: 'quizData'
          }
        },
        { $unwind: '$quizData' },
        {
          $project: {
            quizId: '$quiz',
            similarity: 1,
            quiz: '$quizData'
          }
        }
      ]);

      return results;
    } catch (error) {
      console.error('Find similar quizzes error:', error);
      
      // Fallback to text search if vector search fails
      console.log('Using fallback text search...');
      return await this.fallbackTextSearch(queryText, limit);
    }
  }

  /**
   * Fallback text search when vector search fails
   * @param {string} queryText - Search query
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Search results
   */
  async fallbackTextSearch(queryText, limit = 10) {
    try {
      const Quiz = require('../models/Quiz');
      
      // Simple text search on quiz fields
      const quizzes = await Quiz.find({
        $or: [
          { title: { $regex: queryText, $options: 'i' } },
          { description: { $regex: queryText, $options: 'i' } },
          { category: { $regex: queryText, $options: 'i' } },
          { tags: { $in: [new RegExp(queryText, 'i')] } }
        ],
        status: 'published'
      })
      .limit(limit)
      .select('-embedding')
      .populate('creator', 'name email');

      return quizzes.map(quiz => ({
        quizId: quiz._id,
        similarity: 0.5, // Default similarity score for text search
        quiz: quiz
      }));
    } catch (error) {
      console.error('Fallback search error:', error);
      return [];
    }
  }

  /**
   * Delete quiz embedding
   * @param {string} quizId - Quiz ID
   */
  async deleteQuizEmbedding(quizId) {
    try {
      await QuizEmbedding.deleteOne({ quiz: quizId });
      console.log(`✅ Embedding deleted for quiz: ${quizId}`);
    } catch (error) {
      console.error('Delete embedding error:', error);
      throw error;
    }
  }

  /**
   * Batch generate embeddings for multiple quizzes
   * @param {Array} quizzes - Array of quiz objects
   */
  async batchGenerateEmbeddings(quizzes) {
    const results = [];
    
    for (const quiz of quizzes) {
      try {
        const embeddingId = await this.createQuizEmbedding(quiz);
        results.push({ quizId: quiz._id, embeddingId, success: true });
      } catch (error) {
        console.error(`Failed to create embedding for quiz ${quiz._id}:`, error);
        results.push({ quizId: quiz._id, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = new EmbeddingService();
