import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { ProgressBar, Badge, Chip } from 'react-native-paper';
import { parentDashboard } from '../services/parentDashboard';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChildProgressScreen = ({ navigation, route }) => {
  const { childId, childName } = route.params;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('week');
  const [progressData, setProgressData] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('encouragement');
  const [goals, setGoals] = useState({
    weeklyQuizzes: 5,
    dailyStudyTime: 30,
    targetScore: 80,
    streakTarget: 7
  });

  useEffect(() => {
    loadChildProgress();
  }, [timeframe]);

  const loadChildProgress = async () => {
    try {
      setLoading(true);
      const data = await parentDashboard.getChildProgress(childId, timeframe);
      setProgressData(data);
    } catch (error) {
      console.error('Error loading child progress:', error);
      showToast('Failed to load progress data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    try {
      const result = await parentDashboard.sendEncouragementMessage(
        childId, 
        messageText, 
        messageType
      );
      
      if (result) {
        showToast('Message sent successfully!', 'success');
        setShowMessageModal(false);
        setMessageText('');
      } else {
        showToast('Failed to send message', 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Error sending message', 'error');
    }
  };

  const handleSetGoals = async () => {
    try {
      const result = await parentDashboard.setStudyGoals(childId, goals);
      
      if (result) {
        showToast('Goals updated successfully!', 'success');
        setShowGoalsModal(false);
      } else {
        showToast('Failed to update goals', 'error');
      }
    } catch (error) {
      console.error('Error setting goals:', error);
      showToast('Error updating goals', 'error');
    }
  };

  const handleGenerateReport = async (type) => {
    try {
      const report = await parentDashboard.generateReport(childId, type);
      
      if (report) {
        navigation.navigate('ReportDetail', { report });
        setShowReportModal(false);
      } else {
        showToast('Failed to generate report', 'error');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Error generating report', 'error');
    }
  };

  const renderOverviewTab = () => {
    if (!progressData) return null;

    const { overview, performance, engagement, concerns, recommendations } = progressData;

    // Performance chart data
    const performanceChartData = {
      labels: performance.daily.map(d => new Date(d.date).toLocaleDateString().slice(0, 5)),
      datasets: [{
        data: performance.daily.map(d => d.score),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 2
      }]
    };

    // Subject breakdown pie chart
    const subjectChartData = performance.bySubject.map((subject, index) => ({
      name: subject.subject.substring(0, 8),
      population: subject.average,
      color: ['#4A90E2', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'][index % 5],
      legendFontColor: '#333',
      legendFontSize: 12
    }));

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.statsCard}>
          <Text style={styles.cardTitle}>📊 Performance Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overview.averageScore}%</Text>
              <Text style={styles.statLabel}>Average Score</Text>
              <View style={styles.statTrend}>
                <MaterialIcons 
                  name={overview.improvementRate > 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={overview.improvementRate > 0 ? "#4CAF50" : "#F44336"} 
                />
                <Text style={[styles.trendText, { color: overview.improvementRate > 0 ? "#4CAF50" : "#F44336" }]}>
                  {Math.abs(overview.improvementRate)}%
                </Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overview.totalQuizzes}</Text>
              <Text style={styles.statLabel}>Quizzes Taken</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overview.streak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>Level {overview.level}</Text>
              <Text style={styles.statLabel}>Current Level</Text>
            </View>
          </View>
        </Animated.View>

        {/* Performance Chart */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>📈 Daily Performance</Text>
          <LineChart
            data={performanceChartData}
            width={SCREEN_WIDTH - 60}
            height={200}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
        </Animated.View>

        {/* Subject Performance */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>📚 Subject Performance</Text>
          
          {subjectChartData.length > 0 && (
            <PieChart
              data={subjectChartData}
              width={SCREEN_WIDTH - 60}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          )}

          <View style={styles.subjectDetails}>
            {performance.bySubject.map((subject, index) => (
              <View key={index} style={styles.subjectRow}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.subject}</Text>
                  <Text style={styles.subjectStats}>{subject.quizzes} quizzes</Text>
                </View>
                <View style={styles.subjectScore}>
                  <Text style={styles.subjectAverage}>{subject.average}%</Text>
                  <View style={styles.subjectImprovement}>
                    <MaterialIcons 
                      name={subject.improvement > 0 ? "trending-up" : subject.improvement < 0 ? "trending-down" : "trending-flat"} 
                      size={14} 
                      color={subject.improvement > 0 ? "#4CAF50" : subject.improvement < 0 ? "#F44336" : "#666"} 
                    />
                    <Text style={[styles.improvementText, { 
                      color: subject.improvement > 0 ? "#4CAF50" : subject.improvement < 0 ? "#F44336" : "#666" 
                    }]}>
                      {subject.improvement > 0 ? '+' : ''}{subject.improvement}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Study Time Analysis */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>⏰ Study Time Analysis</Text>
          
          <View style={styles.studyTimeStats}>
            <View style={styles.studyTimeStat}>
              <Text style={styles.studyTimeValue}>{Math.round(engagement.studyTime.daily.reduce((a, b) => a + b, 0) / 7)}</Text>
              <Text style={styles.studyTimeLabel}>Avg Daily (min)</Text>
            </View>
            <View style={styles.studyTimeStat}>
              <Text style={styles.studyTimeValue}>{engagement.studyTime.daily.reduce((a, b) => a + b, 0)}</Text>
              <Text style={styles.studyTimeLabel}>Weekly Total (min)</Text>
            </View>
            <View style={styles.studyTimeStat}>
              <Text style={styles.studyTimeValue}>{engagement.activityPattern.averageSessionLength}</Text>
              <Text style={styles.studyTimeLabel}>Session Avg (min)</Text>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>Preferred Study Times</Text>
          <View style={styles.studyTimesContainer}>
            {engagement.activityPattern.preferredTimes.map((time, index) => (
              <Chip key={index} style={styles.studyTimeChip}>{time}</Chip>
            ))}
          </View>
        </Animated.View>

        {/* Concerns & Recommendations */}
        {(concerns.length > 0 || recommendations.length > 0) && (
          <Animated.View entering={FadeInUp.delay(500)} style={styles.insightsCard}>
            <Text style={styles.cardTitle}>🎯 Insights & Recommendations</Text>
            
            {concerns.length > 0 && (
              <View style={styles.concernsSection}>
                <Text style={styles.sectionSubtitle}>⚠️ Areas of Concern</Text>
                {concerns.map((concern, index) => (
                  <View key={index} style={styles.concernItem}>
                    <View style={styles.concernHeader}>
                      <Text style={styles.concernTitle}>{concern.issue}</Text>
                      <Badge style={[styles.severityBadge, { 
                        backgroundColor: concern.severity === 'high' ? '#FFE8E6' : concern.severity === 'medium' ? '#FFF3E0' : '#E8F5E8',
                      }]}>
                        <Text style={[styles.severityText, {
                          color: concern.severity === 'high' ? '#F44336' : concern.severity === 'medium' ? '#FF9800' : '#4CAF50'
                        }]}>
                          {concern.severity}
                        </Text>
                      </Badge>
                    </View>
                    <Text style={styles.concernDescription}>{concern.description}</Text>
                    
                    {concern.suggestions && (
                      <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                        {concern.suggestions.slice(0, 2).map((suggestion, idx) => (
                          <Text key={idx} style={styles.suggestionText}>• {suggestion}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionSubtitle}>💡 Recommendations</Text>
                {recommendations.slice(0, 3).map((rec, index) => (
                  <TouchableOpacity key={index} style={styles.recommendationItem}>
                    <View style={styles.recommendationContent}>
                      <Text style={styles.recommendationTitle}>{rec.title}</Text>
                      <Text style={styles.recommendationDescription}>{rec.description}</Text>
                    </View>
                    <View style={styles.recommendationPriority}>
                      <Text style={[styles.priorityText, {
                        color: rec.priority === 'high' ? '#F44336' : rec.priority === 'medium' ? '#FF9800' : '#4CAF50'
                      }]}>
                        {rec.priority}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  const renderEngagementTab = () => {
    if (!progressData) return null;

    const { engagement } = progressData;

    // Study time chart data
    const studyTimeChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: engagement.studyTime.daily,
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 2
      }]
    };

    // Motivation progress
    const motivationData = {
      labels: ['Motivation'],
      data: [engagement.motivation.streakHistory[engagement.motivation.streakHistory.length - 1] / 10]
    };

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Engagement Overview */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.statsCard}>
          <Text style={styles.cardTitle}>🎮 Engagement Metrics</Text>
          
          <View style={styles.engagementStats}>
            <View style={styles.engagementStat}>
              <MaterialIcons name="trending-up" size={24} color="#4A90E2" />
              <Text style={styles.engagementValue}>
                {((engagement.motivation.streakHistory[engagement.motivation.streakHistory.length - 1] / 10) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.engagementLabel}>Motivation Level</Text>
            </View>

            <View style={styles.engagementStat}>
              <MaterialIcons name="schedule" size={24} color="#4CAF50" />
              <Text style={styles.engagementValue}>{engagement.activityPattern.sessionFrequency}</Text>
              <Text style={styles.engagementLabel}>Sessions/Week</Text>
            </View>

            <View style={styles.engagementStat}>
              <MaterialIcons name="emoji-events" size={24} color="#FFD93D" />
              <Text style={styles.engagementValue}>{engagement.motivation.challengesCompleted}</Text>
              <Text style={styles.engagementLabel}>Challenges Done</Text>
            </View>
          </View>
        </Animated.View>

        {/* Weekly Study Pattern */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>📅 Weekly Study Pattern</Text>
          <LineChart
            data={studyTimeChartData}
            width={SCREEN_WIDTH - 60}
            height={200}
            yAxisSuffix="m"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
          
          <View style={styles.patternInsights}>
            <Text style={styles.insightText}>
              📊 Most active day: {engagement.activityPattern.mostActiveDay}
            </Text>
            <Text style={styles.insightText}>
              ⏰ Peak study times: {engagement.activityPattern.preferredTimes.join(', ')}
            </Text>
          </View>
        </Animated.View>

        {/* XP Growth */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>⚡ XP Growth Tracking</Text>
          
          <View style={styles.xpGrowthContainer}>
            {engagement.motivation.xpGrowth.map((xp, index) => (
              <View key={index} style={styles.xpDayContainer}>
                <View style={styles.xpBar}>
                  <View style={[styles.xpBarFill, { 
                    height: `${(xp / Math.max(...engagement.motivation.xpGrowth)) * 100}%` 
                  }]} />
                </View>
                <Text style={styles.xpDayLabel}>Day {index + 1}</Text>
                <Text style={styles.xpDayValue}>{xp}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Streak History */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>🔥 Streak Progress</Text>
          
          <View style={styles.streakContainer}>
            {engagement.motivation.streakHistory.map((streak, index) => (
              <View key={index} style={styles.streakDay}>
                <View style={[styles.streakDot, { 
                  backgroundColor: streak > 0 ? '#FF6B35' : '#E0E0E0' 
                }]} />
                <Text style={styles.streakDayNumber}>{index + 1}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.streakSummary}>
            Current streak: {engagement.motivation.streakHistory[engagement.motivation.streakHistory.length - 1]} days
          </Text>
        </Animated.View>

        {/* Active Challenges */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.statsCard}>
          <Text style={styles.cardTitle}>🎯 Challenge Status</Text>
          
          <View style={styles.challengeStats}>
            <View style={styles.challengeStat}>
              <Text style={styles.challengeNumber}>{engagement.motivation.challengesCompleted}</Text>
              <Text style={styles.challengeLabel}>Completed</Text>
            </View>
            <View style={styles.challengeStat}>
              <Text style={styles.challengeNumber}>{engagement.motivation.challengesActive}</Text>
              <Text style={styles.challengeLabel}>Active</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.viewChallengesButton}
            onPress={() => navigation.navigate('ChildChallenges', { childId })}
          >
            <Text style={styles.viewChallengesText}>View All Challenges</Text>
            <Feather name="chevron-right" size={16} color="#4A90E2" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderAchievementsTab = () => {
    if (!progressData) return null;

    // Mock achievements data
    const achievements = [
      { id: 1, name: 'First Steps', icon: '🎯', description: 'Complete first quiz', unlocked: true, date: '2024-01-15' },
      { id: 2, name: 'Week Warrior', icon: '🔥', description: '7-day study streak', unlocked: true, date: '2024-01-20' },
      { id: 3, name: 'Math Master', icon: '🧮', description: '90% average in Math', unlocked: true, date: '2024-01-18' },
      { id: 4, name: 'Speed Demon', icon: '⚡', description: 'Complete quiz under 2 min', unlocked: false },
      { id: 5, name: 'Perfect Score', icon: '🌟', description: 'Score 100% on a quiz', unlocked: false },
      { id: 6, name: 'Dedication', icon: '💪', description: '30-day study streak', unlocked: false }
    ];

    const badges = [
      { id: 1, name: 'Dedicated Student', icon: '🎖️', category: 'Consistency', date: '2024-01-16' },
      { id: 2, name: 'Science Explorer', icon: '🔬', category: 'Subject Mastery', date: '2024-01-19' },
      { id: 3, name: 'Quick Learner', icon: '🚀', category: 'Performance', date: '2024-01-21' }
    ];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Achievement Stats */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.statsCard}>
          <Text style={styles.cardTitle}>🏆 Achievement Overview</Text>
          
          <View style={styles.achievementStats}>
            <View style={styles.achievementStat}>
              <Text style={styles.achievementNumber}>{achievements.filter(a => a.unlocked).length}</Text>
              <Text style={styles.achievementLabel}>Unlocked</Text>
            </View>
            <View style={styles.achievementStat}>
              <Text style={styles.achievementNumber}>{badges.length}</Text>
              <Text style={styles.achievementLabel}>Badges Earned</Text>
            </View>
            <View style={styles.achievementStat}>
              <Text style={styles.achievementNumber}>{progressData.overview.xp}</Text>
              <Text style={styles.achievementLabel}>Total XP</Text>
            </View>
          </View>
        </Animated.View>

        {/* Recent Achievements */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.achievementsSection}>
          <Text style={styles.cardTitle}>🎉 Recent Achievements</Text>
          
          {achievements.filter(a => a.unlocked).slice(0, 3).map((achievement, index) => (
            <Animated.View 
              key={achievement.id}
              entering={SlideInRight.delay(200 + index * 100)}
              style={styles.achievementCard}
            >
              <View style={styles.achievementIcon}>
                <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <Text style={styles.achievementDate}>
                  Earned on {new Date(achievement.date).toLocaleDateString()}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Badges Collection */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.badgesSection}>
          <Text style={styles.cardTitle}>🎖️ Badge Collection</Text>
          
          <View style={styles.badgesGrid}>
            {badges.map((badge, index) => (
              <Animated.View 
                key={badge.id}
                entering={ZoomIn.delay(300 + index * 100)}
                style={styles.badgeCard}
              >
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeCategory}>{badge.category}</Text>
                <Text style={styles.badgeDate}>
                  {new Date(badge.date).toLocaleDateString()}
                </Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Upcoming Goals */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.goalsSection}>
          <Text style={styles.cardTitle}>🎯 Upcoming Goals</Text>
          
          {achievements.filter(a => !a.unlocked).slice(0, 3).map((goal, index) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalIcon}>
                <Text style={styles.goalEmoji}>{goal.icon}</Text>
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalDescription}>{goal.description}</Text>
                <View style={styles.goalProgress}>
                  <ProgressBar 
                    progress={Math.random() * 0.8} // Mock progress
                    color="#4A90E2"
                    style={styles.goalProgressBar}
                  />
                  <Text style={styles.goalProgressText}>
                    {Math.round(Math.random() * 80)}% complete
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'engagement':
        return renderEngagementTab();
      case 'achievements':
        return renderAchievementsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading {childName}'s progress...</Text>
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
          <Text style={styles.headerTitle}>{childName}</Text>
          <Text style={styles.headerSubtitle}>Progress & Analytics</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowMessageModal(true)}
          >
            <Feather name="message-circle" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowReportModal(true)}
          >
            <Feather name="file-text" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Timeframe Selector */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.timeframeSelector}>
        {['week', 'month', 'year'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.timeframeButton,
              timeframe === period && styles.timeframeButtonActive
            ]}
            onPress={() => setTimeframe(period)}
          >
            <Text style={[
              styles.timeframeText,
              timeframe === period && styles.timeframeTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View entering={FadeInUp.delay(150)} style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'overview', label: 'Overview', icon: 'bar-chart-2' },
            { key: 'engagement', label: 'Engagement', icon: 'activity' },
            { key: 'achievements', label: 'Achievements', icon: 'award' }
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

      {/* Send Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Message to {childName}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.messageTypeSelector}>
              {[
                { key: 'encouragement', label: 'Encouragement', icon: '💪' },
                { key: 'reminder', label: 'Reminder', icon: '⏰' },
                { key: 'celebration', label: 'Celebration', icon: '🎉' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.messageTypeButton,
                    messageType === type.key && styles.messageTypeButtonActive
                  ]}
                  onPress={() => setMessageType(type.key)}
                >
                  <Text style={styles.messageTypeIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.messageTypeText,
                    messageType === type.key && styles.messageTypeTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.messageInput}
              placeholder="Write your message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMessageModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Text style={styles.sendButtonText}>Send Message</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Generate Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Report</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Choose the type of report you'd like to generate for {childName}:
            </Text>

            <View style={styles.reportOptions}>
              {[
                { type: 'daily', title: 'Daily Report', description: 'Today\'s activity summary' },
                { type: 'weekly', title: 'Weekly Report', description: 'Comprehensive weekly analysis' },
                { type: 'monthly', title: 'Monthly Report', description: 'Detailed monthly progress report' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={styles.reportOption}
                  onPress={() => handleGenerateReport(option.type)}
                >
                  <View style={styles.reportOptionContent}>
                    <Text style={styles.reportOptionTitle}>{option.title}</Text>
                    <Text style={styles.reportOptionDescription}>{option.description}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles would continue here... (truncated for length)
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
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeframeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  timeframeText: {
    fontSize: 14,
    color: '#666',
  },
  timeframeTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    marginLeft: 4,
  },
  chart: {
    borderRadius: 8,
  },
  subjectDetails: {
    marginTop: 16,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subjectStats: {
    fontSize: 12,
    color: '#666',
  },
  subjectScore: {
    alignItems: 'flex-end',
  },
  subjectAverage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  subjectImprovement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  improvementText: {
    fontSize: 12,
    marginLeft: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  studyTimeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  studyTimeStat: {
    alignItems: 'center',
  },
  studyTimeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  studyTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  studyTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  studyTimeChip: {
    backgroundColor: '#E3F2FD',
  },
  insightsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  concernsSection: {
    marginBottom: 20,
  },
  concernItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  concernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  concernTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  concernDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  recommendationsSection: {
    marginTop: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recommendationPriority: {
    marginLeft: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  messageTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  messageTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  messageTypeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  messageTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  messageTypeText: {
    fontSize: 12,
    color: '#666',
  },
  messageTypeTextActive: {
    color: '#fff',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  sendButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  reportOptions: {
    gap: 12,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  reportOptionContent: {
    flex: 1,
  },
  reportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reportOptionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Additional styles for engagement and achievements tabs...
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  engagementStat: {
    alignItems: 'center',
  },
  engagementValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  engagementLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  patternInsights: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  insightText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  xpGrowthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'end',
    height: 120,
  },
  xpDayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  xpBar: {
    width: 20,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'flex-end',
  },
  xpBarFill: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    width: '100%',
  },
  xpDayLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  xpDayValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  streakDay: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  streakDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  streakDayNumber: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  streakSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'center',
  },
  challengeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  challengeStat: {
    alignItems: 'center',
  },
  challengeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  challengeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  viewChallengesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  viewChallengesText: {
    fontSize: 14,
    color: '#4A90E2',
    marginRight: 4,
  },
  // Achievement styles
  achievementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  achievementStat: {
    alignItems: 'center',
  },
  achievementNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD93D',
  },
  achievementLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  achievementsSection: {
    marginBottom: 20,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementDate: {
    fontSize: 10,
    color: '#4A90E2',
    marginTop: 4,
  },
  badgesSection: {
    marginBottom: 20,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  badgeCategory: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 4,
  },
  badgeDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  goalsSection: {
    marginBottom: 20,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  goalEmoji: {
    fontSize: 20,
    opacity: 0.7,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  goalDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  goalProgress: {
    marginTop: 8,
  },
  goalProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  goalProgressText: {
    fontSize: 10,
    color: '#4A90E2',
    marginTop: 4,
  },
});

export default ChildProgressScreen;