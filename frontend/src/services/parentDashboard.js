import { analyticsAPI, userAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Parent/Guardian Dashboard Service
 * Manages child monitoring, progress tracking, reports, and communication
 */

export class ParentDashboardService {
  constructor() {
    this.parentId = null;
    this.children = new Map();
    this.notifications = [];
    this.reports = [];
    this.settings = {
      enableNotifications: true,
      weeklyReports: true,
      achievementAlerts: true,
      concernAlerts: true,
      studyTimeAlerts: true,
      performanceThreshold: 70
    };
  }

  /**
   * Initialize parent dashboard data
   */
  async initialize(parentId) {
    try {
      this.parentId = parentId;
      
      const [childrenData, settingsData, notificationsData] = await Promise.all([
        this.loadChildren(),
        this.loadSettings(),
        this.loadNotifications()
      ]);

      return {
        children: childrenData,
        settings: settingsData,
        notifications: notificationsData
      };
    } catch (error) {
      console.error('Error initializing parent dashboard:', error);
      return null;
    }
  }

  /**
   * Load linked children accounts
   */
  async loadChildren() {
    try {
      // In real implementation, this would fetch from backend
      const mockChildren = [
        {
          id: 'child_1',
          name: 'Emma Johnson',
          age: 12,
          grade: '7th Grade',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
          linkedAt: '2024-01-15T10:00:00Z',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          currentStreak: 5,
          totalXP: 2450,
          level: 8,
          subjects: ['Mathematics', 'Science', 'History'],
          favoriteSubject: 'Mathematics',
          averageScore: 85,
          weeklyGoal: 7,
          weeklyProgress: 5,
          studyTimeToday: 45, // minutes
          studyTimeWeek: 280, // minutes
          recentActivity: 'Completed Science Quiz - 92%'
        },
        {
          id: 'child_2',
          name: 'Alex Johnson',
          age: 10,
          grade: '5th Grade',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
          linkedAt: '2024-01-15T10:00:00Z',
          lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          currentStreak: 3,
          totalXP: 1200,
          level: 4,
          subjects: ['Mathematics', 'Reading', 'Art'],
          favoriteSubject: 'Art',
          averageScore: 78,
          weeklyGoal: 5,
          weeklyProgress: 3,
          studyTimeToday: 25, // minutes
          studyTimeWeek: 150, // minutes
          recentActivity: 'Started Math Challenge'
        }
      ];

      mockChildren.forEach(child => {
        this.children.set(child.id, child);
      });

      return Array.from(this.children.values());
    } catch (error) {
      console.error('Error loading children:', error);
      return [];
    }
  }

  /**
   * Get detailed progress for a specific child
   */
  async getChildProgress(childId, timeframe = 'week') {
    try {
      const child = this.children.get(childId);
      if (!child) return null;

      // Mock detailed progress data
      const progressData = {
        overview: {
          totalQuizzes: 24,
          averageScore: child.averageScore,
          improvementRate: 12.5, // percentage
          timeSpent: child.studyTimeWeek,
          streak: child.currentStreak,
          level: child.level,
          xp: child.totalXP,
          achievements: 8,
          badges: 5
        },
        performance: {
          daily: this.generateDailyScores(7),
          weekly: this.generateWeeklyScores(4),
          monthly: timeframe === 'month' ? this.generateMonthlyScores(12) : null,
          bySubject: [
            { subject: 'Mathematics', average: 88, quizzes: 8, improvement: 15 },
            { subject: 'Science', average: 85, quizzes: 6, improvement: 8 },
            { subject: 'History', average: 82, quizzes: 4, improvement: 5 },
            { subject: 'Literature', average: 80, quizzes: 6, improvement: -2 }
          ],
          byDifficulty: [
            { difficulty: 'Easy', average: 92, count: 8 },
            { difficulty: 'Medium', average: 82, count: 12 },
            { difficulty: 'Hard', average: 71, count: 4 }
          ]
        },
        engagement: {
          studyTime: {
            daily: [30, 45, 35, 50, 40, 25, 45], // minutes per day
            weekly: [280, 320, 295, child.studyTimeWeek],
            target: child.weeklyGoal * 40 // assuming 40 min per session
          },
          activityPattern: {
            preferredTimes: ['16:00-17:00', '19:00-20:00'],
            mostActiveDay: 'Wednesday',
            averageSessionLength: 38, // minutes
            sessionFrequency: 4.2 // per week
          },
          motivation: {
            streakHistory: [1, 2, 3, 4, 5], // last 5 days
            xpGrowth: [100, 150, 200, 180, 220], // XP gained per day
            challengesCompleted: 3,
            challengesActive: 2
          }
        },
        concerns: this.identifyConcerns(child),
        recommendations: this.generateRecommendations(child)
      };

      return progressData;
    } catch (error) {
      console.error('Error getting child progress:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReport(childId, type = 'weekly', format = 'detailed') {
    try {
      const child = this.children.get(childId);
      if (!child) return null;

      const progressData = await this.getChildProgress(childId, type === 'monthly' ? 'month' : 'week');
      
      const report = {
        id: `report_${Date.now()}`,
        childId,
        childName: child.name,
        type,
        format,
        generatedAt: new Date().toISOString(),
        period: this.getReportPeriod(type),
        
        summary: {
          overallGrade: this.calculateOverallGrade(progressData.overview.averageScore),
          keyHighlights: this.generateHighlights(progressData),
          areasOfConcern: progressData.concerns,
          parentRecommendations: progressData.recommendations.filter(r => r.targetAudience === 'parent')
        },

        academicProgress: {
          currentLevel: `Level ${child.level}`,
          xpGained: type === 'weekly' ? 320 : type === 'monthly' ? 1280 : 80, // daily
          quizzesCompleted: progressData.overview.totalQuizzes,
          averageScore: progressData.overview.averageScore,
          improvement: progressData.overview.improvementRate,
          subjectBreakdown: progressData.performance.bySubject,
          difficultyProgression: progressData.performance.byDifficulty
        },

        engagementMetrics: {
          studyTime: progressData.engagement.studyTime,
          streak: progressData.engagement.motivation.streakHistory,
          consistency: this.calculateConsistencyScore(progressData.engagement.studyTime.daily),
          motivation: this.assessMotivationLevel(progressData.engagement.motivation),
          preferredLearningTimes: progressData.engagement.activityPattern.preferredTimes
        },

        socialLearning: {
          classParticipation: 85, // percentage
          peerInteractions: 12, // weekly
          collaborativeQuizzes: 3,
          helpGiven: 5, // times helped others
          helpReceived: 2 // times received help
        },

        achievements: {
          newAchievements: [
            { name: 'Week Warrior', earned: '2024-01-20T15:30:00Z', description: '7-day study streak' },
            { name: 'Math Master', earned: '2024-01-18T14:20:00Z', description: '90% average in Mathematics' }
          ],
          badgesEarned: [
            { name: 'Dedicated Student', category: 'Consistency' },
            { name: 'Science Explorer', category: 'Subject Mastery' }
          ],
          upcomingGoals: [
            { name: 'Speed Demon', progress: 60, description: 'Complete quiz in under 2 minutes' },
            { name: 'Category Explorer', progress: 80, description: 'Try quizzes in 5 categories' }
          ]
        },

        recommendations: {
          immediate: progressData.recommendations.filter(r => r.priority === 'high'),
          longTerm: progressData.recommendations.filter(r => r.priority === 'medium'),
          encouragement: this.generateEncouragementPoints(progressData),
          nextSteps: this.suggestNextSteps(progressData)
        },

        comparative: {
          gradeLevel: {
            averageScore: 78, // grade level average
            percentile: this.calculatePercentile(progressData.overview.averageScore, 78),
            ranking: 'Above Average'
          },
          improvements: {
            vsLastPeriod: progressData.overview.improvementRate,
            strongSubjects: progressData.performance.bySubject.filter(s => s.average > 85),
            improvingSubjects: progressData.performance.bySubject.filter(s => s.improvement > 5)
          }
        }
      };

      // Store report
      this.reports.push(report);
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  }

  /**
   * Set up alerts and notifications
   */
  async configureAlerts(childId, alertConfig) {
    try {
      const child = this.children.get(childId);
      if (!child) return false;

      const alerts = {
        childId,
        childName: child.name,
        ...alertConfig,
        createdAt: new Date().toISOString()
      };

      // Store alert configuration
      await AsyncStorage.setItem(`alerts_${childId}`, JSON.stringify(alerts));
      
      return alerts;
    } catch (error) {
      console.error('Error configuring alerts:', error);
      return false;
    }
  }

  /**
   * Get notifications for parent
   */
  async getNotifications(limit = 20) {
    try {
      // Mock notifications
      const mockNotifications = [
        {
          id: 'notif_1',
          type: 'achievement',
          childId: 'child_1',
          childName: 'Emma Johnson',
          title: 'New Achievement Unlocked!',
          message: 'Emma earned the "Week Warrior" badge for maintaining a 7-day study streak.',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          priority: 'medium',
          read: false,
          actionRequired: false,
          icon: '🏆',
          color: '#4CAF50'
        },
        {
          id: 'notif_2',
          type: 'performance',
          childId: 'child_1',
          childName: 'Emma Johnson',
          title: 'Great Performance!',
          message: 'Emma scored 92% on her Science quiz - her best score this month!',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          priority: 'low',
          read: false,
          actionRequired: false,
          icon: '📊',
          color: '#4A90E2'
        },
        {
          id: 'notif_3',
          type: 'concern',
          childId: 'child_2',
          childName: 'Alex Johnson',
          title: 'Study Streak Broken',
          message: 'Alex missed his daily study session yesterday. Consider gentle encouragement.',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
          priority: 'medium',
          read: false,
          actionRequired: true,
          icon: '⚠️',
          color: '#FF9800',
          suggestedActions: [
            'Send encouraging message',
            'Set study reminder',
            'Plan fun learning activity'
          ]
        },
        {
          id: 'notif_4',
          type: 'milestone',
          childId: 'child_1',
          childName: 'Emma Johnson',
          title: 'Level Up!',
          message: 'Emma reached Level 8! She\'s making excellent progress.',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          priority: 'high',
          read: true,
          actionRequired: false,
          icon: '⭐',
          color: '#FFD93D'
        },
        {
          id: 'notif_5',
          type: 'weekly_report',
          childId: 'child_1',
          childName: 'Emma Johnson',
          title: 'Weekly Report Available',
          message: 'Emma\'s weekly progress report is ready for review.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          priority: 'low',
          read: true,
          actionRequired: false,
          icon: '📋',
          color: '#9C27B0'
        }
      ];

      this.notifications = mockNotifications;
      return mockNotifications.slice(0, limit);
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Send message/encouragement to child
   */
  async sendEncouragementMessage(childId, message, type = 'encouragement') {
    try {
      const child = this.children.get(childId);
      if (!child) return false;

      const messageData = {
        id: `msg_${Date.now()}`,
        fromParent: true,
        parentId: this.parentId,
        toChild: childId,
        childName: child.name,
        type, // 'encouragement', 'reminder', 'achievement_celebration', 'concern'
        message,
        sentAt: new Date().toISOString(),
        delivered: false,
        read: false
      };

      // In real implementation, this would send through backend
      console.log('Sending message to child:', messageData);
      
      return messageData;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Set study goals for child
   */
  async setStudyGoals(childId, goals) {
    try {
      const child = this.children.get(childId);
      if (!child) return false;

      const goalData = {
        childId,
        goals: {
          weeklyQuizzes: goals.weeklyQuizzes || 5,
          dailyStudyTime: goals.dailyStudyTime || 30, // minutes
          targetScore: goals.targetScore || 80, // percentage
          subjectFocus: goals.subjectFocus || [],
          streakTarget: goals.streakTarget || 7,
          xpTarget: goals.xpTarget || null,
          customGoals: goals.customGoals || []
        },
        setAt: new Date().toISOString(),
        setBy: 'parent'
      };

      // Update child's goals
      child.goals = goalData.goals;
      this.children.set(childId, child);

      return goalData;
    } catch (error) {
      console.error('Error setting study goals:', error);
      return false;
    }
  }

  /**
   * Get family learning statistics
   */
  async getFamilyStats() {
    try {
      const children = Array.from(this.children.values());
      
      const familyStats = {
        totalChildren: children.length,
        activeToday: children.filter(c => 
          new Date(c.lastActive) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        totalXP: children.reduce((sum, c) => sum + c.totalXP, 0),
        averageLevel: Math.round(children.reduce((sum, c) => sum + c.level, 0) / children.length),
        totalStudyTime: children.reduce((sum, c) => sum + c.studyTimeWeek, 0),
        averageScore: Math.round(children.reduce((sum, c) => sum + c.averageScore, 0) / children.length),
        
        streaks: {
          longest: Math.max(...children.map(c => c.currentStreak)),
          average: Math.round(children.reduce((sum, c) => sum + c.currentStreak, 0) / children.length),
          activeStreaks: children.filter(c => c.currentStreak > 0).length
        },
        
        achievements: {
          totalEarned: children.length * 3, // mock: 3 achievements per child
          recentUnlocks: 2,
          badges: children.length * 2 // mock: 2 badges per child
        },
        
        weeklyProgress: {
          quizzesCompleted: children.reduce((sum, c) => sum + c.weeklyProgress, 0),
          goalsAchieved: children.filter(c => c.weeklyProgress >= c.weeklyGoal).length,
          improvementTrend: 'positive' // 'positive', 'neutral', 'negative'
        }
      };

      return familyStats;
    } catch (error) {
      console.error('Error getting family stats:', error);
      return null;
    }
  }

  // Helper methods

  generateDailyScores(days) {
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      score: Math.round(70 + Math.random() * 25), // 70-95 range
      quizzes: Math.floor(Math.random() * 3) + 1
    }));
  }

  generateWeeklyScores(weeks) {
    return Array.from({ length: weeks }, (_, i) => ({
      week: `Week ${i + 1}`,
      average: Math.round(75 + Math.random() * 20), // 75-95 range
      quizzes: Math.floor(Math.random() * 8) + 3,
      studyTime: Math.round(200 + Math.random() * 100) // 200-300 minutes
    }));
  }

  generateMonthlyScores(months) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from({ length: months }, (_, i) => ({
      month: monthNames[i],
      average: Math.round(70 + Math.random() * 25),
      quizzes: Math.floor(Math.random() * 20) + 10,
      studyTime: Math.round(800 + Math.random() * 400) // 800-1200 minutes
    }));
  }

  identifyConcerns(child) {
    const concerns = [];
    
    if (child.averageScore < 75) {
      concerns.push({
        type: 'performance',
        severity: 'medium',
        issue: 'Below target performance',
        description: `Average score of ${child.averageScore}% is below the 75% target`,
        suggestions: ['Additional practice sessions', 'Review difficult topics', 'Consider tutoring']
      });
    }

    if (child.currentStreak === 0) {
      concerns.push({
        type: 'engagement',
        severity: 'low',
        issue: 'Broken study streak',
        description: 'Study streak needs to be re-established',
        suggestions: ['Set daily reminders', 'Create study routine', 'Gamify learning']
      });
    }

    if (child.studyTimeToday < 20) {
      concerns.push({
        type: 'time_management',
        severity: 'medium',
        issue: 'Low study time today',
        description: `Only ${child.studyTimeToday} minutes of study time today`,
        suggestions: ['Encourage longer sessions', 'Break into smaller chunks', 'Set time goals']
      });
    }

    return concerns;
  }

  generateRecommendations(child) {
    const recommendations = [];

    recommendations.push({
      type: 'encouragement',
      priority: 'high',
      targetAudience: 'parent',
      title: 'Celebrate Progress',
      description: `Acknowledge ${child.name}'s ${child.averageScore}% average score`,
      action: 'Send congratulatory message'
    });

    if (child.favoriteSubject) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        targetAudience: 'child',
        title: 'Leverage Interest',
        description: `Use ${child.favoriteSubject} to motivate learning in other subjects`,
        action: 'Find cross-subject connections'
      });
    }

    return recommendations;
  }

  calculateOverallGrade(averageScore) {
    if (averageScore >= 90) return 'A';
    if (averageScore >= 80) return 'B';
    if (averageScore >= 70) return 'C';
    if (averageScore >= 60) return 'D';
    return 'F';
  }

  calculateConsistencyScore(dailyTimes) {
    if (dailyTimes.length < 2) return 100;
    
    const mean = dailyTimes.reduce((sum, time) => sum + time, 0) / dailyTimes.length;
    const variance = dailyTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / dailyTimes.length;
    const coefficient = Math.sqrt(variance) / mean;
    
    return Math.max(0, Math.min(100, 100 - (coefficient * 100)));
  }

  assessMotivationLevel(motivation) {
    const { streakHistory, xpGrowth, challengesCompleted } = motivation;
    
    const streakScore = Math.min(streakHistory[streakHistory.length - 1] * 10, 40);
    const xpScore = Math.min(xpGrowth[xpGrowth.length - 1] / 5, 30);
    const challengeScore = Math.min(challengesCompleted * 10, 30);
    
    const total = streakScore + xpScore + challengeScore;
    
    if (total >= 80) return 'High';
    if (total >= 60) return 'Medium';
    return 'Low';
  }

  calculatePercentile(score, average) {
    // Simplified percentile calculation
    const percentile = Math.round(((score - average) / average) * 100 + 50);
    return Math.max(1, Math.min(99, percentile));
  }

  generateHighlights(progressData) {
    const highlights = [];
    
    if (progressData.overview.improvementRate > 10) {
      highlights.push(`Excellent ${progressData.overview.improvementRate}% improvement this period`);
    }
    
    if (progressData.overview.streak > 5) {
      highlights.push(`Outstanding ${progressData.overview.streak}-day study streak`);
    }
    
    const topSubject = progressData.performance.bySubject
      .sort((a, b) => b.average - a.average)[0];
    if (topSubject && topSubject.average > 85) {
      highlights.push(`Excelling in ${topSubject.subject} with ${topSubject.average}% average`);
    }

    return highlights;
  }

  generateEncouragementPoints(progressData) {
    return [
      'Consistent daily engagement shows great dedication',
      'Strong performance in favorite subjects demonstrates natural ability',
      'Steady improvement trend indicates effective learning habits'
    ];
  }

  suggestNextSteps(progressData) {
    return [
      'Continue current study routine while gradually increasing difficulty',
      'Explore advanced topics in strongest subjects',
      'Set new challenge goals to maintain motivation'
    ];
  }

  getReportPeriod(type) {
    const now = new Date();
    switch (type) {
      case 'daily':
        return now.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`;
      case 'monthly':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      default:
        return now.toISOString().split('T')[0];
    }
  }

  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('parent_settings');
      if (settings) {
        this.settings = { ...this.settings, ...JSON.parse(settings) };
      }
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.settings;
    }
  }

  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem('parent_settings', JSON.stringify(this.settings));
      return this.settings;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  async loadNotifications() {
    return await this.getNotifications();
  }
}

// Export singleton instance
export const parentDashboard = new ParentDashboardService();
export default parentDashboard;