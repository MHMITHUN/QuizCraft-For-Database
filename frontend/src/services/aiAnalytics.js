import { analyticsAPI, quizAPI } from './api';

/**
 * AI-Powered Learning Analytics Service
 * Provides intelligent insights and predictions for student learning
 */

export class AIAnalyticsService {
  constructor() {
    this.learningPatterns = new Map();
    this.predictionModels = {
      performance: null,
      difficulty: null,
      retention: null
    };
  }

  /**
   * Analyze student performance and predict future outcomes
   */
  async analyzeStudentPerformance(userId) {
    try {
      const [history, stats] = await Promise.all([
        analyticsAPI.getMyHistory(1, 50), // Last 50 attempts
        analyticsAPI.getMyStats()
      ]);

      const performanceData = this.processPerformanceData(history.data?.data || []);
      const predictions = this.generatePerformancePredictions(performanceData);
      const insights = this.generateLearningInsights(performanceData, stats.data?.data || {});

      return {
        currentLevel: this.calculateCurrentLevel(performanceData),
        strengths: insights.strengths,
        weaknesses: insights.weaknesses,
        predictions: predictions,
        recommendedActions: insights.recommendations,
        learningVelocity: this.calculateLearningVelocity(performanceData),
        masteryProgress: this.calculateMasteryProgress(performanceData)
      };
    } catch (error) {
      console.error('Error analyzing student performance:', error);
      return null;
    }
  }

  /**
   * Generate personalized learning path recommendations
   */
  async generateLearningPath(userId, targetTopics = []) {
    try {
      const performance = await this.analyzeStudentPerformance(userId);
      if (!performance) return [];

      const availableQuizzes = await quizAPI.getAll({ limit: 100 });
      const quizzes = availableQuizzes.data?.data?.quizzes || [];

      const learningPath = this.createAdaptiveLearningPath(
        quizzes,
        performance,
        targetTopics
      );

      return learningPath.map((step, index) => ({
        id: `step_${index}`,
        order: index + 1,
        quiz: step.quiz,
        reason: step.reason,
        difficulty: step.recommendedDifficulty,
        estimatedTime: step.estimatedTime,
        prerequisites: step.prerequisites,
        learningObjectives: step.learningObjectives,
        confidence: step.confidence
      }));
    } catch (error) {
      console.error('Error generating learning path:', error);
      return [];
    }
  }

  /**
   * Predict which students might struggle (for teachers)
   */
  async predictAtRiskStudents(classId) {
    try {
      // This would typically call a backend AI model
      // For now, we'll implement heuristic-based predictions
      const classData = await analyticsAPI.getClassAnalytics?.(classId);
      if (!classData) return [];

      const students = classData.data?.students || [];
      const riskAnalysis = students.map(student => {
        const riskFactors = this.calculateRiskFactors(student);
        const riskScore = this.calculateRiskScore(riskFactors);
        
        return {
          studentId: student.id,
          studentName: student.name,
          riskLevel: this.categorizeRiskLevel(riskScore),
          riskScore: riskScore,
          riskFactors: riskFactors,
          recommendations: this.generateInterventionRecommendations(riskFactors),
          timeline: this.predictInterventionTimeline(riskScore)
        };
      });

      return riskAnalysis
        .filter(analysis => analysis.riskLevel !== 'low')
        .sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      console.error('Error predicting at-risk students:', error);
      return [];
    }
  }

  /**
   * Detect knowledge gaps and suggest remediation
   */
  async detectKnowledgeGaps(userId) {
    try {
      const performance = await this.analyzeStudentPerformance(userId);
      if (!performance) return [];

      const gaps = [];
      const weaknesses = performance.weaknesses || [];

      for (const weakness of weaknesses) {
        const gapAnalysis = await this.analyzeKnowledgeGap(userId, weakness);
        if (gapAnalysis) {
          gaps.push({
            topic: weakness.topic,
            severity: weakness.severity,
            fundamentalConcepts: gapAnalysis.fundamentals,
            prerequisites: gapAnalysis.prerequisites,
            remediationQuizzes: gapAnalysis.remediationQuizzes,
            estimatedStudyTime: gapAnalysis.estimatedTime,
            priority: this.calculateGapPriority(weakness, gapAnalysis)
          });
        }
      }

      return gaps.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Error detecting knowledge gaps:', error);
      return [];
    }
  }

  /**
   * Generate comparative analytics (student vs class vs global)
   */
  async generateComparativeAnalytics(userId, classId = null) {
    try {
      const [userStats, classStats, globalStats] = await Promise.all([
        analyticsAPI.getMyStats(),
        classId ? analyticsAPI.getClassStats?.(classId) : null,
        analyticsAPI.getGlobalStats?.()
      ]);

      const userMetrics = this.extractMetrics(userStats.data?.data);
      const classMetrics = classStats ? this.extractMetrics(classStats.data) : null;
      const globalMetrics = globalStats ? this.extractMetrics(globalStats.data) : null;

      return {
        user: userMetrics,
        comparisons: {
          vsClass: classMetrics ? this.compareMetrics(userMetrics, classMetrics) : null,
          vsGlobal: globalMetrics ? this.compareMetrics(userMetrics, globalMetrics) : null
        },
        percentiles: {
          class: classMetrics ? this.calculatePercentile(userMetrics, classMetrics) : null,
          global: globalMetrics ? this.calculatePercentile(userMetrics, globalMetrics) : null
        },
        insights: this.generateComparativeInsights(userMetrics, classMetrics, globalMetrics)
      };
    } catch (error) {
      console.error('Error generating comparative analytics:', error);
      return null;
    }
  }

  // Helper methods for AI analytics

  processPerformanceData(history) {
    return history.map(attempt => ({
      quizId: attempt.quiz?._id,
      category: attempt.quiz?.category,
      difficulty: attempt.quiz?.difficulty,
      score: attempt.percentage,
      timeSpent: attempt.timeSpent,
      date: new Date(attempt.createdAt),
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      topicBreakdown: this.analyzeTopicPerformance(attempt.answers)
    }));
  }

  generatePerformancePredictions(performanceData) {
    const trend = this.calculateTrend(performanceData);
    const currentAverage = this.calculateRecentAverage(performanceData);
    
    return {
      nextQuizScore: this.predictNextScore(performanceData),
      weeklyImprovement: this.predictWeeklyImprovement(trend),
      masteryTimeline: this.predictMasteryTimeline(performanceData),
      confidenceInterval: this.calculateConfidenceInterval(performanceData),
      recommendations: this.generatePredictionBasedRecommendations(trend, currentAverage)
    };
  }

  generateLearningInsights(performanceData, stats) {
    const categoryPerformance = this.analyzeCategoryPerformance(performanceData);
    const difficultyPerformance = this.analyzeDifficultyPerformance(performanceData);
    const timePatterns = this.analyzeTimePatterns(performanceData);

    return {
      strengths: this.identifyStrengths(categoryPerformance, difficultyPerformance),
      weaknesses: this.identifyWeaknesses(categoryPerformance, difficultyPerformance),
      learningStyle: this.inferLearningStyle(timePatterns, performanceData),
      optimalStudyTimes: this.identifyOptimalStudyTimes(timePatterns),
      recommendations: this.generateActionableRecommendations(
        categoryPerformance, 
        difficultyPerformance, 
        timePatterns
      )
    };
  }

  calculateRiskFactors(student) {
    const factors = {};
    
    // Performance decline
    factors.performanceDecline = this.detectPerformanceDecline(student.recentScores);
    
    // Engagement drop
    factors.engagementDrop = this.detectEngagementDrop(student.activityLog);
    
    // Time management issues
    factors.timeManagement = this.analyzeTimeManagement(student.completionTimes);
    
    // Knowledge gaps
    factors.knowledgeGaps = this.countKnowledgeGaps(student.topicScores);
    
    // Participation decrease
    factors.participationDecrease = this.detectParticipationDecrease(student.participation);

    return factors;
  }

  calculateRiskScore(riskFactors) {
    let score = 0;
    const weights = {
      performanceDecline: 0.3,
      engagementDrop: 0.25,
      timeManagement: 0.2,
      knowledgeGaps: 0.15,
      participationDecrease: 0.1
    };

    Object.entries(riskFactors).forEach(([factor, value]) => {
      score += (weights[factor] || 0) * (value || 0);
    });

    return Math.min(score * 100, 100); // Scale to 0-100
  }

  categorizeRiskLevel(riskScore) {
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  generateInterventionRecommendations(riskFactors) {
    const recommendations = [];
    
    if (riskFactors.performanceDecline > 0.5) {
      recommendations.push({
        type: 'academic',
        priority: 'high',
        action: 'Schedule one-on-one review session',
        description: 'Student showing significant performance decline'
      });
    }
    
    if (riskFactors.engagementDrop > 0.6) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        action: 'Introduce gamified elements',
        description: 'Student engagement has dropped significantly'
      });
    }
    
    if (riskFactors.knowledgeGaps > 0.4) {
      recommendations.push({
        type: 'remediation',
        priority: 'high',
        action: 'Assign foundational review quizzes',
        description: 'Multiple knowledge gaps detected'
      });
    }

    return recommendations;
  }

  // Additional helper methods would be implemented here...
  calculateCurrentLevel(performanceData) {
    const recentScores = performanceData.slice(-10).map(d => d.score);
    const average = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    if (average >= 90) return 'Expert';
    if (average >= 80) return 'Advanced';
    if (average >= 70) return 'Intermediate';
    if (average >= 60) return 'Beginner';
    return 'Novice';
  }

  calculateLearningVelocity(performanceData) {
    if (performanceData.length < 3) return 0;
    
    const recent = performanceData.slice(-5);
    const older = performanceData.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.score, 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100; // Percentage improvement
  }

  calculateMasteryProgress(performanceData) {
    const categoryMastery = {};
    
    performanceData.forEach(data => {
      if (!categoryMastery[data.category]) {
        categoryMastery[data.category] = [];
      }
      categoryMastery[data.category].push(data.score);
    });

    return Object.entries(categoryMastery).map(([category, scores]) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const consistency = this.calculateConsistency(scores);
      
      return {
        category,
        masteryLevel: average,
        consistency,
        status: average >= 80 ? 'mastered' : average >= 60 ? 'learning' : 'needs_work'
      };
    });
  }

  calculateConsistency(scores) {
    if (scores.length < 2) return 100;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 100 - (standardDeviation * 2));
  }
}

// Export singleton instance
export const aiAnalytics = new AIAnalyticsService();
export default aiAnalytics;