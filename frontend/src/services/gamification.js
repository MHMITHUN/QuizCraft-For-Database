import { analyticsAPI, userAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Gamification & Engagement System Service
 * Manages XP, badges, leaderboards, achievements, and rewards
 */

export class GamificationService {
  constructor() {
    this.localXP = 0;
    this.streakCount = 0;
    this.lastActivityDate = null;
    this.achievements = new Map();
    this.badges = new Map();
    this.challenges = new Map();
  }

  /**
   * Initialize gamification data from storage
   */
  async initialize() {
    try {
      const [xpData, streakData, achievementsData, badgesData] = await Promise.all([
        AsyncStorage.getItem('user_xp'),
        AsyncStorage.getItem('user_streak'),
        AsyncStorage.getItem('user_achievements'),
        AsyncStorage.getItem('user_badges')
      ]);

      this.localXP = xpData ? parseInt(xpData) : 0;
      this.streakCount = streakData ? parseInt(streakData) : 0;
      
      if (achievementsData) {
        const achievements = JSON.parse(achievementsData);
        achievements.forEach(achievement => {
          this.achievements.set(achievement.id, achievement);
        });
      }

      if (badgesData) {
        const badges = JSON.parse(badgesData);
        badges.forEach(badge => {
          this.badges.set(badge.id, badge);
        });
      }

      await this.loadActiveChallenges();
    } catch (error) {
      console.error('Error initializing gamification:', error);
    }
  }

  /**
   * Award XP for various activities
   */
  async awardXP(activity, details = {}) {
    try {
      const xpRules = {
        'quiz_completed': { base: 50, multipliers: { difficulty: { easy: 1, medium: 1.2, hard: 1.5 } } },
        'quiz_perfect': { base: 100, multipliers: { difficulty: { easy: 1, medium: 1.5, hard: 2 } } },
        'first_attempt_correct': { base: 10 },
        'streak_bonus': { base: 20, multipliers: { streak: (streak) => Math.min(streak * 0.1, 2) } },
        'daily_login': { base: 25 },
        'quiz_created': { base: 75 },
        'class_joined': { base: 30 },
        'challenge_completed': { base: 150 },
        'achievement_unlocked': { base: 200 },
        'leaderboard_climb': { base: 40 }
      };

      const rule = xpRules[activity];
      if (!rule) return 0;

      let xpAwarded = rule.base;

      // Apply multipliers
      if (rule.multipliers) {
        Object.entries(rule.multipliers).forEach(([key, multiplier]) => {
          if (details[key]) {
            if (typeof multiplier === 'function') {
              xpAwarded *= multiplier(details[key]);
            } else if (typeof multiplier === 'object' && multiplier[details[key]]) {
              xpAwarded *= multiplier[details[key]];
            }
          }
        });
      }

      xpAwarded = Math.round(xpAwarded);
      this.localXP += xpAwarded;

      // Save to storage
      await AsyncStorage.setItem('user_xp', this.localXP.toString());

      // Check for level up
      const newLevel = this.calculateLevel(this.localXP);
      const previousLevel = details.previousLevel || this.calculateLevel(this.localXP - xpAwarded);
      
      if (newLevel > previousLevel) {
        await this.handleLevelUp(newLevel, previousLevel);
      }

      // Check achievements
      await this.checkAchievements(activity, details);

      return {
        xpAwarded,
        totalXP: this.localXP,
        newLevel,
        levelUp: newLevel > previousLevel
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return { xpAwarded: 0, totalXP: this.localXP };
    }
  }

  /**
   * Calculate user level based on XP
   */
  calculateLevel(xp) {
    // Level formula: level = floor(sqrt(xp / 100))
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  /**
   * Calculate XP needed for next level
   */
  getXPForNextLevel(currentXP) {
    const currentLevel = this.calculateLevel(currentXP);
    const nextLevelXP = Math.pow(currentLevel, 2) * 100;
    const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
    
    return {
      current: currentXP - currentLevelXP,
      needed: nextLevelXP - currentXP,
      total: nextLevelXP - currentLevelXP,
      progress: (currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)
    };
  }

  /**
   * Handle level up rewards and notifications
   */
  async handleLevelUp(newLevel, previousLevel) {
    try {
      // Award level up rewards
      const levelRewards = {
        5: { type: 'badge', id: 'novice_learner', name: 'Novice Learner' },
        10: { type: 'badge', id: 'dedicated_student', name: 'Dedicated Student' },
        15: { type: 'feature', id: 'custom_avatar', name: 'Custom Avatar' },
        20: { type: 'badge', id: 'knowledge_seeker', name: 'Knowledge Seeker' },
        25: { type: 'reward', id: 'bonus_xp_week', name: '2x XP Week' },
        30: { type: 'badge', id: 'master_learner', name: 'Master Learner' }
      };

      const reward = levelRewards[newLevel];
      if (reward) {
        await this.unlockReward(reward);
      }

      // Store level up event
      await AsyncStorage.setItem('last_level_up', JSON.stringify({
        level: newLevel,
        timestamp: Date.now(),
        reward
      }));

    } catch (error) {
      console.error('Error handling level up:', error);
    }
  }

  /**
   * Update and track learning streaks
   */
  async updateStreak(activityDate = new Date()) {
    try {
      const today = new Date(activityDate).toDateString();
      const lastActivity = this.lastActivityDate ? new Date(this.lastActivityDate).toDateString() : null;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (lastActivity === today) {
        // Same day, no change in streak
        return this.streakCount;
      }

      if (lastActivity === yesterday) {
        // Consecutive day, increment streak
        this.streakCount += 1;
      } else if (lastActivity === null || lastActivity !== yesterday) {
        // Streak broken or starting fresh
        this.streakCount = 1;
      }

      this.lastActivityDate = activityDate;

      // Save streak data
      await AsyncStorage.setItem('user_streak', this.streakCount.toString());
      await AsyncStorage.setItem('last_activity_date', activityDate.toISOString());

      // Check streak achievements
      await this.checkStreakAchievements(this.streakCount);

      // Award streak bonus XP
      if (this.streakCount >= 3) {
        await this.awardXP('streak_bonus', { streak: this.streakCount });
      }

      return this.streakCount;
    } catch (error) {
      console.error('Error updating streak:', error);
      return this.streakCount;
    }
  }

  /**
   * Check and award achievements
   */
  async checkAchievements(activity, details = {}) {
    const achievementDefinitions = [
      {
        id: 'first_quiz',
        name: 'First Steps',
        description: 'Complete your first quiz',
        icon: '🎯',
        condition: (activity) => activity === 'quiz_completed',
        xp: 100
      },
      {
        id: 'perfect_score',
        name: 'Perfectionist',
        description: 'Score 100% on a quiz',
        icon: '🌟',
        condition: (activity, details) => activity === 'quiz_perfect',
        xp: 150
      },
      {
        id: 'streak_week',
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        condition: (activity, details) => activity === 'streak_bonus' && details.streak >= 7,
        xp: 200
      },
      {
        id: 'quiz_master',
        name: 'Quiz Master',
        description: 'Complete 50 quizzes',
        icon: '👑',
        condition: async () => {
          const stats = await analyticsAPI.getMyStats();
          return stats.data?.data?.totalQuizzesTaken >= 50;
        },
        xp: 300
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete a quiz in under 2 minutes',
        icon: '⚡',
        condition: (activity, details) => activity === 'quiz_completed' && details.timeSpent < 120,
        xp: 125
      },
      {
        id: 'knowledge_explorer',
        name: 'Knowledge Explorer',
        description: 'Take quizzes in 5 different categories',
        icon: '🗺️',
        condition: async () => {
          const history = await analyticsAPI.getMyHistory(1, 100);
          const categories = new Set();
          history.data?.data?.forEach(attempt => {
            if (attempt.quiz?.category) categories.add(attempt.quiz.category);
          });
          return categories.size >= 5;
        },
        xp: 250
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Join 3 different classes',
        icon: '🦋',
        condition: async () => {
          // This would check user's joined classes
          return false; // Placeholder
        },
        xp: 180
      },
      {
        id: 'creator',
        name: 'Quiz Creator',
        description: 'Create your first quiz',
        icon: '🎨',
        condition: (activity) => activity === 'quiz_created',
        xp: 200
      }
    ];

    for (const achievement of achievementDefinitions) {
      if (this.achievements.has(achievement.id)) continue;

      let unlocked = false;
      
      if (typeof achievement.condition === 'function') {
        try {
          unlocked = await achievement.condition(activity, details);
        } catch (error) {
          console.error(`Error checking achievement ${achievement.id}:`, error);
          continue;
        }
      }

      if (unlocked) {
        await this.unlockAchievement(achievement);
      }
    }
  }

  /**
   * Check streak-specific achievements
   */
  async checkStreakAchievements(streakCount) {
    const streakAchievements = [
      { streak: 3, id: 'streak_3', name: 'Getting Warmed Up', icon: '🔥' },
      { streak: 7, id: 'streak_7', name: 'Week Warrior', icon: '⚡' },
      { streak: 14, id: 'streak_14', name: 'Two Week Champion', icon: '🏆' },
      { streak: 30, id: 'streak_30', name: 'Monthly Master', icon: '👑' },
      { streak: 100, id: 'streak_100', name: 'Century Streaker', icon: '💯' }
    ];

    for (const achievement of streakAchievements) {
      if (streakCount >= achievement.streak && !this.achievements.has(achievement.id)) {
        await this.unlockAchievement({
          id: achievement.id,
          name: achievement.name,
          description: `Maintain a ${achievement.streak}-day learning streak`,
          icon: achievement.icon,
          xp: achievement.streak * 10
        });
      }
    }
  }

  /**
   * Unlock achievement
   */
  async unlockAchievement(achievement) {
    try {
      const achievementData = {
        ...achievement,
        unlockedAt: new Date().toISOString(),
        id: achievement.id
      };

      this.achievements.set(achievement.id, achievementData);

      // Save to storage
      const achievementsArray = Array.from(this.achievements.values());
      await AsyncStorage.setItem('user_achievements', JSON.stringify(achievementsArray));

      // Award XP
      if (achievement.xp) {
        await this.awardXP('achievement_unlocked', { xp: achievement.xp });
      }

      return achievementData;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }
  }

  /**
   * Award badges for specific accomplishments
   */
  async awardBadge(badgeData) {
    try {
      const badge = {
        ...badgeData,
        awardedAt: new Date().toISOString()
      };

      this.badges.set(badge.id, badge);

      // Save to storage
      const badgesArray = Array.from(this.badges.values());
      await AsyncStorage.setItem('user_badges', JSON.stringify(badgesArray));

      return badge;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return null;
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(type = 'xp', timeframe = 'all', limit = 50) {
    try {
      // In a real implementation, this would call backend API
      // For now, we'll generate mock leaderboard data
      const mockLeaderboard = this.generateMockLeaderboard(type, limit);
      
      return {
        type,
        timeframe,
        data: mockLeaderboard,
        userRank: Math.floor(Math.random() * limit) + 1,
        totalUsers: limit * 2
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return { type, timeframe, data: [], userRank: 0, totalUsers: 0 };
    }
  }

  /**
   * Generate mock leaderboard data
   */
  generateMockLeaderboard(type, limit) {
    const mockUsers = [
      'Alex Johnson', 'Sarah Miller', 'Mike Chen', 'Emma Davis', 'James Wilson',
      'Lisa Anderson', 'David Brown', 'Anna Taylor', 'Chris Martinez', 'Sophie White',
      'Ryan Thompson', 'Maya Patel', 'Kevin Lee', 'Grace Kim', 'Tyler Moore'
    ];

    const leaderboard = [];
    for (let i = 0; i < Math.min(limit, 50); i++) {
      const baseValue = type === 'xp' ? 5000 : type === 'streak' ? 30 : 150;
      const randomVariation = Math.random() * 0.8 + 0.6; // 60-140% of base
      
      leaderboard.push({
        rank: i + 1,
        userId: `user_${i + 1}`,
        username: mockUsers[i % mockUsers.length] + (i >= mockUsers.length ? ` ${Math.floor(i / mockUsers.length) + 1}` : ''),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        value: Math.floor(baseValue * randomVariation * (1 - i * 0.05)),
        level: type === 'xp' ? Math.floor(Math.sqrt((baseValue * randomVariation * (1 - i * 0.05)) / 100)) + 1 : null,
        badge: i < 3 ? ['🥇', '🥈', '🥉'][i] : null
      });
    }

    return leaderboard;
  }

  /**
   * Create and manage challenges
   */
  async createChallenge(challengeData) {
    try {
      const challenge = {
        id: `challenge_${Date.now()}`,
        ...challengeData,
        createdAt: new Date().toISOString(),
        participants: [],
        status: 'active'
      };

      this.challenges.set(challenge.id, challenge);
      
      return challenge;
    } catch (error) {
      console.error('Error creating challenge:', error);
      return null;
    }
  }

  /**
   * Load active challenges
   */
  async loadActiveChallenges() {
    try {
      // Mock active challenges - in real implementation, fetch from backend
      const mockChallenges = [
        {
          id: 'daily_quiz',
          title: 'Daily Quiz Challenge',
          description: 'Complete at least one quiz every day this week',
          type: 'daily',
          target: 7,
          progress: Math.floor(Math.random() * 7),
          reward: { xp: 500, badge: 'daily_champion' },
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          icon: '📅'
        },
        {
          id: 'perfect_scores',
          title: 'Perfect Score Pursuit',
          description: 'Achieve 3 perfect scores this week',
          type: 'weekly',
          target: 3,
          progress: Math.floor(Math.random() * 3),
          reward: { xp: 750, badge: 'perfectionist' },
          endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          icon: '🎯'
        },
        {
          id: 'category_explorer',
          title: 'Category Explorer',
          description: 'Take quizzes in 5 different categories',
          type: 'exploration',
          target: 5,
          progress: Math.floor(Math.random() * 5),
          reward: { xp: 400, badge: 'explorer' },
          endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          icon: '🗺️'
        }
      ];

      mockChallenges.forEach(challenge => {
        this.challenges.set(challenge.id, challenge);
      });

      return Array.from(this.challenges.values());
    } catch (error) {
      console.error('Error loading challenges:', error);
      return [];
    }
  }

  /**
   * Update challenge progress
   */
  async updateChallengeProgress(challengeId, progressData) {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge) return null;

      challenge.progress = Math.min(challenge.progress + (progressData.increment || 1), challenge.target);
      
      // Check if challenge is completed
      if (challenge.progress >= challenge.target && challenge.status === 'active') {
        challenge.status = 'completed';
        challenge.completedAt = new Date().toISOString();
        
        // Award challenge completion rewards
        if (challenge.reward) {
          if (challenge.reward.xp) {
            await this.awardXP('challenge_completed', { xp: challenge.reward.xp });
          }
          if (challenge.reward.badge) {
            await this.awardBadge({
              id: challenge.reward.badge,
              name: challenge.title,
              description: `Completed: ${challenge.description}`,
              icon: challenge.icon
            });
          }
        }
      }

      this.challenges.set(challengeId, challenge);
      return challenge;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      return null;
    }
  }

  /**
   * Get user's gamification summary
   */
  async getGamificationSummary() {
    try {
      const currentXP = this.localXP;
      const currentLevel = this.calculateLevel(currentXP);
      const nextLevelInfo = this.getXPForNextLevel(currentXP);
      
      return {
        xp: currentXP,
        level: currentLevel,
        nextLevel: nextLevelInfo,
        streak: this.streakCount,
        achievements: Array.from(this.achievements.values()),
        badges: Array.from(this.badges.values()),
        activeChallenges: Array.from(this.challenges.values()).filter(c => c.status === 'active'),
        completedChallenges: Array.from(this.challenges.values()).filter(c => c.status === 'completed').length
      };
    } catch (error) {
      console.error('Error getting gamification summary:', error);
      return {
        xp: 0,
        level: 1,
        nextLevel: { current: 0, needed: 100, total: 100, progress: 0 },
        streak: 0,
        achievements: [],
        badges: [],
        activeChallenges: [],
        completedChallenges: 0
      };
    }
  }

  /**
   * Unlock rewards
   */
  async unlockReward(reward) {
    try {
      switch (reward.type) {
        case 'badge':
          await this.awardBadge({
            id: reward.id,
            name: reward.name,
            description: `Unlocked at level ${this.calculateLevel(this.localXP)}`,
            icon: '🏅'
          });
          break;
        case 'feature':
          // Store unlocked features
          const unlockedFeatures = await AsyncStorage.getItem('unlocked_features') || '[]';
          const features = JSON.parse(unlockedFeatures);
          features.push(reward.id);
          await AsyncStorage.setItem('unlocked_features', JSON.stringify(features));
          break;
        case 'reward':
          // Handle special rewards like XP multipliers
          await AsyncStorage.setItem(`reward_${reward.id}`, JSON.stringify({
            ...reward,
            unlockedAt: new Date().toISOString()
          }));
          break;
      }
      return reward;
    } catch (error) {
      console.error('Error unlocking reward:', error);
      return null;
    }
  }
}

// Export singleton instance
export const gamification = new GamificationService();
export default gamification;