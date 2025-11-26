import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight, ZoomIn, RotateInUpLeft } from 'react-native-reanimated';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ProgressBar } from 'react-native-paper';
import { gamification } from '../services/gamification';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GamificationDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [gamificationData, setGamificationData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGamificationData();
    gamification.initialize();
  }, []);

  const loadGamificationData = async () => {
    try {
      setLoading(true);
      
      const [
        summary,
        xpLeaderboard,
        streakLeaderboard
      ] = await Promise.all([
        gamification.getGamificationSummary(),
        gamification.getLeaderboard('xp', 'all', 20),
        gamification.getLeaderboard('streak', 'weekly', 20)
      ]);

      setGamificationData(summary);
      setLeaderboard({ xp: xpLeaderboard, streak: streakLeaderboard });
      setAchievements(summary.achievements);
      setChallenges(summary.activeChallenges);

    } catch (error) {
      console.error('Error loading gamification data:', error);
      showToast('Failed to load gamification data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGamificationData();
    setRefreshing(false);
    showToast('Data refreshed!', 'success');
  };

  const handleAchievementPress = (achievement) => {
    setSelectedAchievement(achievement);
    setShowAchievementModal(true);
  };

  const handleChallengeAction = async (challengeId, action) => {
    try {
      if (action === 'start') {
        // Navigate to relevant quiz or action
        showToast('Challenge started!', 'success');
      } else if (action === 'claim') {
        // Claim challenge rewards
        showToast('Rewards claimed!', 'success');
        await loadGamificationData();
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const renderOverviewTab = () => {
    if (!gamificationData) return null;

    const { xp, level, nextLevel, streak, badges, achievements, activeChallenges } = gamificationData;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* User Level Card */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Level {level}</Text>
              <Text style={styles.levelSubtitle}>Learning Champion</Text>
            </View>
            <View style={styles.xpDisplay}>
              <Text style={styles.xpNumber}>{xp.toLocaleString()}</Text>
              <Text style={styles.xpLabel}>Total XP</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Progress to Level {level + 1}</Text>
              <Text style={styles.progressNumbers}>
                {nextLevel.current}/{nextLevel.total} XP
              </Text>
            </View>
            <ProgressBar 
              progress={nextLevel.progress}
              color="#4A90E2"
              style={styles.progressBar}
            />
            <Text style={styles.remainingXP}>
              {nextLevel.needed} XP remaining
            </Text>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <Animated.View entering={FadeInUp.delay(150)} style={styles.statCard}>
            <Feather name="zap" size={24} color="#FF6B35" />
            <Text style={styles.statNumber}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200)} style={styles.statCard}>
            <Feather name="award" size={24} color="#4A90E2" />
            <Text style={styles.statNumber}>{badges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(250)} style={styles.statCard}>
            <Feather name="star" size={24} color="#FFD93D" />
            <Text style={styles.statNumber}>{achievements.length}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </Animated.View>
        </View>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300)} style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {achievements.slice(0, 5).map((achievement, index) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={styles.achievementCard}
                  onPress={() => handleAchievementPress(achievement)}
                >
                  <Animated.View entering={ZoomIn.delay(300 + index * 100)}>
                    <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                    <Text style={styles.achievementName} numberOfLines={2}>
                      {achievement.name}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Active Challenges */}
        <Animated.View entering={FadeInUp.delay(350)} style={styles.challengesSection}>
          <Text style={styles.sectionTitle}>🎯 Active Challenges</Text>
          {activeChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="target" size={32} color="#ccc" />
              <Text style={styles.emptyStateText}>No active challenges</Text>
            </View>
          ) : (
            activeChallenges.slice(0, 3).map((challenge, index) => (
              <Animated.View 
                key={challenge.id} 
                entering={SlideInRight.delay(350 + index * 100)}
                style={styles.challengeCard}
              >
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription} numberOfLines={1}>
                      {challenge.description}
                    </Text>
                  </View>
                  <View style={styles.challengeProgress}>
                    <Text style={styles.challengeProgressText}>
                      {challenge.progress}/{challenge.target}
                    </Text>
                  </View>
                </View>
                
                <ProgressBar 
                  progress={challenge.progress / challenge.target}
                  color="#4CAF50"
                  style={styles.challengeProgressBar}
                />
                
                <View style={styles.challengeFooter}>
                  <Text style={styles.challengeReward}>
                    🎁 {challenge.reward.xp} XP
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.challengeButton,
                      challenge.progress >= challenge.target && styles.challengeButtonComplete
                    ]}
                    onPress={() => handleChallengeAction(challenge.id, 
                      challenge.progress >= challenge.target ? 'claim' : 'start'
                    )}
                  >
                    <Text style={styles.challengeButtonText}>
                      {challenge.progress >= challenge.target ? 'Claim' : 'Start'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    );
  };

  const renderLeaderboardTab = () => {
    const [boardType, setBoardType] = useState('xp');
    const currentBoard = leaderboard?.[boardType];

    if (!currentBoard) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Leaderboard Type Selector */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.boardTypeSelector}>
          <TouchableOpacity
            style={[styles.boardTypeButton, boardType === 'xp' && styles.boardTypeButtonActive]}
            onPress={() => setBoardType('xp')}
          >
            <Feather name="trending-up" size={18} color={boardType === 'xp' ? '#fff' : '#4A90E2'} />
            <Text style={[styles.boardTypeText, boardType === 'xp' && styles.boardTypeTextActive]}>
              XP Rankings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boardTypeButton, boardType === 'streak' && styles.boardTypeButtonActive]}
            onPress={() => setBoardType('streak')}
          >
            <Feather name="zap" size={18} color={boardType === 'streak' ? '#fff' : '#4A90E2'} />
            <Text style={[styles.boardTypeText, boardType === 'streak' && styles.boardTypeTextActive]}>
              Streak Leaders
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* User Rank Card */}
        <Animated.View entering={FadeInUp.delay(150)} style={styles.userRankCard}>
          <Text style={styles.userRankTitle}>Your Rank</Text>
          <View style={styles.userRankInfo}>
            <Text style={styles.userRankNumber}>#{currentBoard.userRank}</Text>
            <Text style={styles.userRankText}>out of {currentBoard.totalUsers} users</Text>
          </View>
        </Animated.View>

        {/* Leaderboard List */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.leaderboardContainer}>
          <Text style={styles.sectionTitle}>
            {boardType === 'xp' ? '🏆 Top XP Earners' : '🔥 Streak Champions'}
          </Text>
          
          {currentBoard.data.map((user, index) => (
            <Animated.View 
              key={user.userId} 
              entering={SlideInRight.delay(200 + index * 50)}
              style={[
                styles.leaderboardItem,
                index < 3 && styles.leaderboardItemTop
              ]}
            >
              <View style={styles.leaderboardRank}>
                {user.badge ? (
                  <Text style={styles.leaderboardBadge}>{user.badge}</Text>
                ) : (
                  <Text style={styles.leaderboardRankText}>{user.rank}</Text>
                )}
              </View>
              
              <Image 
                source={{ uri: user.avatar }} 
                style={styles.leaderboardAvatar}
              />
              
              <View style={styles.leaderboardUserInfo}>
                <Text style={styles.leaderboardUsername}>{user.username}</Text>
                {user.level && (
                  <Text style={styles.leaderboardLevel}>Level {user.level}</Text>
                )}
              </View>
              
              <View style={styles.leaderboardValue}>
                <Text style={styles.leaderboardValueNumber}>
                  {boardType === 'xp' ? user.value.toLocaleString() : user.value}
                </Text>
                <Text style={styles.leaderboardValueLabel}>
                  {boardType === 'xp' ? 'XP' : 'days'}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    );
  };

  const renderAchievementsTab = () => {
    const allAchievements = [
      ...achievements,
      // Mock locked achievements
      { id: 'locked_1', name: 'Speed Runner', icon: '⚡', description: 'Complete 10 quizzes in under 1 minute each', locked: true },
      { id: 'locked_2', name: 'Category Master', icon: '🎓', description: 'Achieve 90%+ average in any category', locked: true },
      { id: 'locked_3', name: 'Helping Hand', icon: '🤝', description: 'Help 5 classmates with quiz explanations', locked: true },
    ];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100)} style={styles.achievementsHeader}>
          <Text style={styles.achievementsTitle}>🏆 Achievements</Text>
          <Text style={styles.achievementsSubtitle}>
            {achievements.length} unlocked • {allAchievements.filter(a => a.locked).length} remaining
          </Text>
        </Animated.View>

        <View style={styles.achievementsGrid}>
          {allAchievements.map((achievement, index) => (
            <Animated.View 
              key={achievement.id}
              entering={ZoomIn.delay(100 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.achievementGridCard,
                  achievement.locked && styles.achievementGridCardLocked
                ]}
                onPress={() => !achievement.locked && handleAchievementPress(achievement)}
              >
                <Text style={[
                  styles.achievementGridIcon,
                  achievement.locked && styles.achievementGridIconLocked
                ]}>
                  {achievement.locked ? '🔒' : achievement.icon}
                </Text>
                <Text style={[
                  styles.achievementGridName,
                  achievement.locked && styles.achievementGridNameLocked
                ]} numberOfLines={2}>
                  {achievement.name}
                </Text>
                {!achievement.locked && achievement.unlockedAt && (
                  <Text style={styles.achievementGridDate}>
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderBadgesTab = () => {
    const { badges } = gamificationData || { badges: [] };

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100)} style={styles.badgesHeader}>
          <Text style={styles.badgesTitle}>🎖️ Badge Collection</Text>
          <Text style={styles.badgesSubtitle}>
            {badges.length} badges earned
          </Text>
        </Animated.View>

        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="award" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Badges Yet</Text>
            <Text style={styles.emptyStateText}>Complete achievements to earn badges!</Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {badges.map((badge, index) => (
              <Animated.View 
                key={badge.id}
                entering={RotateInUpLeft.delay(100 + index * 100)}
                style={styles.badgeCard}
              >
                <Text style={styles.badgeIcon}>{badge.icon || '🏅'}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription} numberOfLines={2}>
                  {badge.description}
                </Text>
                <Text style={styles.badgeDate}>
                  {new Date(badge.awardedAt).toLocaleDateString()}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      case 'achievements':
        return renderAchievementsTab();
      case 'badges':
        return renderBadgesTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(50)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gamification Hub</Text>
          <Text style={styles.headerSubtitle}>Track your progress & compete</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Feather 
            name="refresh-cw" 
            size={20} 
            color={refreshing ? "#ccc" : "#4A90E2"} 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'overview', label: 'Overview', icon: 'home' },
            { key: 'leaderboard', label: 'Leaderboard', icon: 'trending-up' },
            { key: 'achievements', label: 'Achievements', icon: 'star' },
            { key: 'badges', label: 'Badges', icon: 'award' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather 
                name={tab.icon} 
                size={18} 
                color={activeTab === tab.key ? "#4A90E2" : "#666"} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Achievement Details Modal */}
      <Modal
        visible={showAchievementModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View 
            entering={ZoomIn.duration(300)}
            style={styles.achievementModalContent}
          >
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAchievementModal(false)}
            >
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>

            {selectedAchievement && (
              <>
                <Text style={styles.achievementModalIcon}>
                  {selectedAchievement.icon}
                </Text>
                <Text style={styles.achievementModalName}>
                  {selectedAchievement.name}
                </Text>
                <Text style={styles.achievementModalDescription}>
                  {selectedAchievement.description}
                </Text>
                {selectedAchievement.xp && (
                  <View style={styles.achievementModalXP}>
                    <Feather name="zap" size={16} color="#FFD93D" />
                    <Text style={styles.achievementModalXPText}>
                      +{selectedAchievement.xp} XP
                    </Text>
                  </View>
                )}
                <Text style={styles.achievementModalDate}>
                  Unlocked on {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                </Text>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  // Level Card Styles
  levelCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelInfo: {
    flex: 1,
    marginLeft: 16,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  levelSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  xpDisplay: {
    alignItems: 'flex-end',
  },
  xpNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  xpLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  progressNumbers: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  remainingXP: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 0.32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  // Achievements Section
  achievementsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // Challenges Section
  challengesSection: {
    marginBottom: 20,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  challengeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  challengeProgress: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  challengeProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  challengeProgressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeReward: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  challengeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  challengeButtonComplete: {
    backgroundColor: '#4CAF50',
  },
  challengeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Leaderboard Styles
  boardTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  boardTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  boardTypeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  boardTypeText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 8,
  },
  boardTypeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  userRankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userRankTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  userRankInfo: {
    alignItems: 'center',
  },
  userRankNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  userRankText: {
    fontSize: 14,
    color: '#666',
  },
  leaderboardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  leaderboardItemTop: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  leaderboardBadge: {
    fontSize: 20,
  },
  leaderboardRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 12,
  },
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  leaderboardLevel: {
    fontSize: 12,
    color: '#666',
  },
  leaderboardValue: {
    alignItems: 'flex-end',
  },
  leaderboardValueNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  leaderboardValueLabel: {
    fontSize: 12,
    color: '#666',
  },
  // Achievements Tab
  achievementsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  achievementsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementGridCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (SCREEN_WIDTH - 60) / 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementGridCardLocked: {
    opacity: 0.5,
  },
  achievementGridIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  achievementGridIconLocked: {
    opacity: 0.5,
  },
  achievementGridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementGridNameLocked: {
    color: '#999',
  },
  achievementGridDate: {
    fontSize: 10,
    color: '#666',
  },
  // Badges Tab
  badgesHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badgesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  badgesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (SCREEN_WIDTH - 60) / 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDate: {
    fontSize: 10,
    color: '#4A90E2',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  achievementModalIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  achievementModalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  achievementModalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  achievementModalXP: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  achievementModalXPText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginLeft: 8,
  },
  achievementModalDate: {
    fontSize: 14,
    color: '#999',
  },
});

export default GamificationDashboardScreen;