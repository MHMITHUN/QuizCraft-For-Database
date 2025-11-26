const { ChromaClient } = require('chromadb');
const natural = require('natural');
const geminiService = require('./geminiService');
const Quiz = require('../models/Quiz');

class VectorSearchService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isInitialized = false;
  }

  /**
   * Initialize ChromaDB connection
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create ChromaDB client (using default settings for local instance)
      this.client = new ChromaClient();

      // Get or create collection
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: process.env.CHROMA_COLLECTION || 'quiz_embeddings',
        });
        console.log('✅ ChromaDB collection ready');
      } catch (error) {
        console.error('ChromaDB collection error:', error);
        // If collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: process.env.CHROMA_COLLECTION || 'quiz_embeddings',
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('ChromaDB initialization error:', error);
      console.warn('⚠️  Vector search will be disabled. Using fallback search.');
      this.isInitialized = false;
    }
  }

  /**
   * Generate embedding from text using Gemini
   */
  async generateEmbedding(text) {
    return await geminiService.generateEmbedding(text);
  }

  /**
   * Add quiz embedding to vector database
   */
  async addQuizEmbedding(quizId, title, description, questions, tags = []) {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        console.warn('ChromaDB not initialized, skipping embedding storage');
        return null;
      }

      // Combine all text for embedding
      const questionsText = questions
        .map(
          (q) =>
            q.questionText +
            ' ' +
            (q.options?.map((o) => o.text).join(' ') || '')
        )
        .join(' ');

      const fullText = `${title} ${description} ${questionsText} ${tags.join(
        ' '
      )}`;

      // Generate embedding
      const embedding = await this.generateEmbedding(fullText);

      // Save embedding to Quiz model
      await Quiz.findByIdAndUpdate(quizId, {
        $set: { embedding: embedding },
      });

      // Add to ChromaDB
      const embeddingId = `quiz_${quizId}`;

      await this.collection.add({
        ids: [embeddingId],
        embeddings: [embedding],
        metadatas: [
          {
            quizId: quizId.toString(),
            title: title,
            description: description || '',
            tags: tags.join(','),
            timestamp: new Date().toISOString(),
          },
        ],
        documents: [fullText.substring(0, 1000)], // Store first 1000 chars
      });

      console.log(`✅ Added embedding for quiz ${quizId}`);
      return embeddingId;
    } catch (error) {
      console.error('Error adding quiz embedding:', error);
      return null;
    }
  }

  /**
   * Search for similar quizzes
   */
  async searchSimilarQuizzes(query, limit = 10) {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        console.warn('ChromaDB not initialized, using fallback search');
        return [];
      }

      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in MongoDB using vector search
      const results = await Quiz.aggregate([
        {
          $vectorSearch: {
            index: 'embedding_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: limit,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            tags: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ]);

      // Format results
      return results.map((result) => ({
        quizId: result._id.toString(),
        title: result.title,
        description: result.description,
        tags: result.tags,
        similarity: result.score,
      }));
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  /**
   * Delete quiz embedding
   */
  async deleteQuizEmbedding(embeddingId) {
    try {
      await this.initialize();

      if (!this.isInitialized) {
        return false;
      }

      await this.collection.delete({
        ids: [embeddingId],
      });

      console.log(`✅ Deleted embedding ${embeddingId}`);
      return true;
    } catch (error) {
      console.error('Error deleting embedding:', error);
      return false;
    }
  }

  /**
   * Fallback text-based search (when ChromaDB is not available)
   */
  async fallbackSearch(query, quizzes) {
    const tokenizer = new natural.WordTokenizer();
    const queryTokens = tokenizer.tokenize(query.toLowerCase());

    // Score each quiz based on keyword matches
    const scoredQuizzes = quizzes.map((quiz) => {
      const quizText = `${quiz.title} ${quiz.description} ${
        quiz.tags?.join(' ') || ''
      }`.toLowerCase();
      const quizTokens = tokenizer.tokenize(quizText);

      let score = 0;
      queryTokens.forEach((token) => {
        if (quizTokens.includes(token)) {
          score++;
        }
      });

      return { ...quiz, score };
    });

    // Sort by score and return top results
    return scoredQuizzes
      .filter((q) => q.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}

module.exports = new VectorSearchService();
