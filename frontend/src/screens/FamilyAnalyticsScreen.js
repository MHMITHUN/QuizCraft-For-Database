import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { ProgressBar, Badge } from 'react-native-paper';
import { parentDashboard } from '../services/parentDashboard';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FamilyAnalyticsScreen = ({ navigation }) => {
  const [children, setChildren] = useState([]);
  const [familyStats, setFamilyStats] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFamilyAnalytics();
  }, [timeframe]);

  const loadFamilyAnalytics = async () => {
    try {
      setLoading(true);
      const [childrenData, statsData, comparisonData] = await Promise.all([
        parentDashboard.getLinkedChildren(),
        parentDashboard.getFamilyStats(),
        parentDashboard.getChildrenComparison(timeframe)
      ]);
      
      setChildren(childrenData || []);
      setFamilyStats(statsData || {});
      setCompareData(comparisonData || {});
    } catch (error) {
      console.error('Error loading family analytics:', error);
      showToast('Failed to load family analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFamilyAnalytics();
    setRefreshing(false);
  };

  const getPerformanceColor = (score) => {
    if (score >= 85) return '#4CAF50';
    if (score >= 70) return '#FF9800';
    return '#F44336';
  };

  const getEngagementLevel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Family Summary */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.summaryCard}>
        <Text style={styles.cardTitle}>👨‍👩‍👧‍👦 Family Learning Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{familyStats?.totalChildren || 0}</Text>
            <Text style={styles.summaryLabel}>Children</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{familyStats?.totalQuizzes || 0}</Text>
            <Text style={styles.summaryLabel}>Total Quizzes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{familyStats?.averageScore || 0}%</Text>
            <Text style={styles.summaryLabel}>Family Average</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{familyStats?.totalStudyTime || 0}h</Text>
            <Text style={styles.summaryLabel}>Study Time</Text>
          </View>
        </View>
      </Animated.View>

      {/* Children Performance Comparison */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.chartCard}>
        <Text style={styles.cardTitle}>📊 Performance Comparison</Text>
        
        {compareData?.performanceComparison && (
          <BarChart
            data={{
              labels: children.map(child => child.name.substring(0, 8)),
              datasets: [{
                data: compareData.performanceComparison.map(p => p.averageScore)
              }]
            }}
            width={SCREEN_WIDTH - 60}
            height={220}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              barPercentage: 0.7,
            }}
            style={styles.chart}
          />
        )}

        <View style={styles.performanceDetails}>
          {compareData?.performanceComparison?.map((child, index) => (
            <TouchableOpacity 
              key={child.id} 
              style={styles.childPerformanceRow}
              onPress={() => navigation.navigate('ChildProgress', { 
                childId: child.id, 
                childName: child.name 
              })}
            >
              <View style={styles.childInfo}>
                <Text style={styles.childAvatar}>{child.avatar}</Text>
                <View>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childGrade}>Grade {child.grade}</Text>
                </View>
              </View>
              
              <View style={styles.performanceStats}>
                <View style={styles.scoreContainer}>
                  <Text style={[styles.averageScore, { color: getPerformanceColor(child.averageScore) }]}>
                    {child.averageScore}%
                  </Text>
                  <View style={styles.trendIndicator}>
                    <MaterialIcons 
                      name={child.trend > 0 ? "trending-up" : child.trend < 0 ? "trending-down" : "trending-flat"} 
                      size={16} 
                      color={child.trend > 0 ? "#4CAF50" : child.trend < 0 ? "#F44336" : "#666"} 
                    />
                    <Text style={[styles.trendText, { 
                      color: child.trend > 0 ? "#4CAF50" : child.trend < 0 ? "#F44336" : "#666" 
                    }]}>
                      {child.trend > 0 ? '+' : ''}{child.trend}%
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Study Time Distribution */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.chartCard}>
        <Text style={styles.cardTitle}>⏰ Study Time Distribution</Text>
        
        {compareData?.studyTimeDistribution && (
          <PieChart
            data={compareData.studyTimeDistribution.map((child, index) => ({
              name: child.name,
              population: child.studyTime,
              color: ['#4A90E2', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'][index % 5],
              legendFontColor: '#333',
              legendFontSize: 12
            }))}
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

        <View style={styles.studyTimeBreakdown}>
          {compareData?.studyTimeDistribution?.map((child, index) => (
            <View key={child.id} style={styles.studyTimeRow}>
              <View style={styles.studyTimeChild}>
                <View style={[styles.colorIndicator, { 
                  backgroundColor: ['#4A90E2', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'][index % 5] 
                }]} />
                <Text style={styles.studyTimeChildName}>{child.name}</Text>
              </View>
              <Text style={styles.studyTimeValue}>{child.studyTime}h</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Engagement Overview */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.engagementCard}>
        <Text style={styles.cardTitle}>🎯 Engagement Levels</Text>
        
        <View style={styles.engagementGrid}>
          {compareData?.engagementLevels?.map((child, index) => (
            <Animated.View 
              key={child.id}
              entering={ZoomIn.delay(450 + index * 100)}
              style={styles.engagementItem}
            >
              <Text style={styles.engagementAvatar}>{child.avatar}</Text>
              <Text style={styles.engagementName}>{child.name}</Text>
              <View style={styles.engagementLevel}>
                <ProgressBar 
                  progress={child.engagement / 100} 
                  color={child.engagement >= 80 ? '#4CAF50' : child.engagement >= 60 ? '#FF9800' : '#F44336'}
                  style={styles.engagementBar}
                />
                <Text style={styles.engagementPercent}>{child.engagement}%</Text>
              </View>
              <Badge 
                style={[styles.engagementBadge, {
                  backgroundColor: child.engagement >= 80 ? '#E8F5E8' : child.engagement >= 60 ? '#FFF3E0' : '#FFE8E6'
                }]}
              >
                <Text style={[styles.engagementBadgeText, {
                  color: child.engagement >= 80 ? '#4CAF50' : child.engagement >= 60 ? '#FF9800' : '#F44336'
                }]}>
                  {getEngagementLevel(child.engagement)}
                </Text>
              </Badge>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderSubjectsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Subject Performance Matrix */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.matrixCard}>
        <Text style={styles.cardTitle}>📚 Subject Performance Matrix</Text>
        
        {compareData?.subjectMatrix && (
          <View style={styles.subjectMatrix}>
            <View style={styles.matrixHeader}>
              <Text style={styles.matrixHeaderCell}>Subject</Text>
              {children.map(child => (
                <Text key={child.id} style={styles.matrixHeaderCell}>
                  {child.name.substring(0, 6)}
                </Text>
              ))}
            </View>
            
            {compareData.subjectMatrix.map((subject, index) => (
              <Animated.View 
                key={subject.name}
                entering={SlideInRight.delay(150 + index * 100)}
                style={styles.matrixRow}
              >
                <Text style={styles.matrixSubject}>{subject.name}</Text>
                {subject.scores.map((score, childIndex) => (
                  <View key={childIndex} style={styles.matrixScoreCell}>
                    <Text style={[styles.matrixScore, { color: getPerformanceColor(score) }]}>
                      {score}%
                    </Text>
                  </View>
                ))}
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Subject Strengths & Weaknesses */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.insightsCard}>
        <Text style={styles.cardTitle}>💡 Subject Insights</Text>
        
        <View style={styles.insightsContainer}>
          <View style={styles.strengthsSection}>
            <Text style={styles.insightsSubtitle}>🌟 Family Strengths</Text>
            {compareData?.familyStrengths?.map((strength, index) => (
              <View key={index} style={styles.insightItem}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightSubject}>{strength.subject}</Text>
                  <Text style={styles.insightScore}>{strength.averageScore}%</Text>
                </View>
                <Text style={styles.insightDescription}>{strength.insight}</Text>
              </View>
            ))}
          </View>

          <View style={styles.weaknessesSection}>
            <Text style={styles.insightsSubtitle}>⚠️ Areas for Improvement</Text>
            {compareData?.improvementAreas?.map((area, index) => (
              <View key={index} style={styles.insightItem}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightSubject}>{area.subject}</Text>
                  <Text style={[styles.insightScore, { color: '#F44336' }]}>{area.averageScore}%</Text>
                </View>
                <Text style={styles.insightDescription}>{area.suggestion}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Subject Progress Trends */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.chartCard}>
        <Text style={styles.cardTitle}>📈 Subject Progress Trends</Text>
        
        {compareData?.progressTrends && (
          <LineChart
            data={{
              labels: compareData.progressTrends.labels,
              datasets: compareData.progressTrends.datasets.map((dataset, index) => ({
                data: dataset.data,
                color: (opacity = 1) => `rgba(${['74, 144, 226', '76, 175, 80', '255, 152, 0', '156, 39, 176'][index % 4]}, ${opacity})`,
                strokeWidth: 2
              }))
            }}
            width={SCREEN_WIDTH - 60}
            height={220}
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
        )}

        <View style={styles.trendsLegend}>
          {compareData?.progressTrends?.datasets?.map((dataset, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { 
                backgroundColor: ['#4A90E2', '#4CAF50', '#FF9800', '#9C27B0'][index % 4] 
              }]} />
              <Text style={styles.legendLabel}>{dataset.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderGoalsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Family Goals Overview */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.goalsCard}>
        <Text style={styles.cardTitle}>🎯 Family Goals Progress</Text>
        
        <View style={styles.familyGoalsStats}>
          <View style={styles.goalsStat}>
            <Text style={styles.goalsStatValue}>{compareData?.familyGoals?.totalGoals || 0}</Text>
            <Text style={styles.goalsStatLabel}>Total Goals</Text>
          </View>
          <View style={styles.goalsStat}>
            <Text style={styles.goalsStatValue}>{compareData?.familyGoals?.completedGoals || 0}</Text>
            <Text style={styles.goalsStatLabel}>Completed</Text>
          </View>
          <View style={styles.goalsStat}>
            <Text style={styles.goalsStatValue}>{compareData?.familyGoals?.avgProgress || 0}%</Text>
            <Text style={styles.goalsStatLabel}>Avg Progress</Text>
          </View>
        </View>
      </Animated.View>

      {/* Individual Goals Progress */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.childrenGoalsCard}>
        <Text style={styles.cardTitle}>👥 Individual Progress</Text>
        
        {compareData?.individualGoals?.map((child, index) => (
          <Animated.View 
            key={child.id}
            entering={SlideInRight.delay(250 + index * 100)}
            style={styles.childGoalCard}
          >
            <View style={styles.childGoalHeader}>
              <View style={styles.childGoalInfo}>
                <Text style={styles.childGoalAvatar}>{child.avatar}</Text>
                <View>
                  <Text style={styles.childGoalName}>{child.name}</Text>
                  <Text style={styles.childGoalCount}>{child.activeGoals} active goals</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.setGoalsButton}
                onPress={() => navigation.navigate('GoalSetting', { childId: child.id })}
              >
                <Feather name="target" size={14} color="#4A90E2" />
                <Text style={styles.setGoalsText}>Set Goals</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.goalsProgress}>
              {child.goals?.map((goal, goalIndex) => (
                <View key={goalIndex} style={styles.goalProgressItem}>
                  <View style={styles.goalProgressHeader}>
                    <Text style={styles.goalProgressTitle}>{goal.title}</Text>
                    <Text style={styles.goalProgressPercent}>{goal.progress}%</Text>
                  </View>
                  <ProgressBar 
                    progress={goal.progress / 100} 
                    color="#4A90E2"
                    style={styles.goalProgressBar}
                  />
                  <Text style={styles.goalProgressDescription}>{goal.description}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Family Challenges */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.challengesCard}>
        <Text style={styles.cardTitle}>🏆 Family Challenges</Text>
        
        {compareData?.familyChallenges?.map((challenge, index) => (
          <View key={index} style={styles.challengeItem}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                <View>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>
                </View>
              </View>
              <View style={styles.challengeProgress}>
                <Text style={styles.challengeProgressText}>{challenge.progress}%</Text>
              </View>
            </View>
            
            <View style={styles.challengeParticipants}>
              <Text style={styles.participantsLabel}>Participants:</Text>
              <View style={styles.participantsList}>
                {challenge.participants?.map((participant, pIndex) => (
                  <Text key={pIndex} style={styles.participantAvatar}>{participant.avatar}</Text>
                ))}
              </View>
            </View>
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverviewTab();
      case 'subjects':
        return renderSubjectsTab();
      case 'goals':
        return renderGoalsTab();
      default:
        return renderOverviewTab();
    }
  };

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
          <Text style={styles.headerTitle}>Family Analytics</Text>
          <Text style={styles.headerSubtitle}>Compare & track progress</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => showToast('Export feature coming soon!', 'info')}
        >
          <Feather name="download" size={20} color="#4A90E2" />
        </TouchableOpacity>
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
            { key: 'overview', label: 'Overview', icon: 'pie-chart' },
            { key: 'subjects', label: 'Subjects', icon: 'book' },
            { key: 'goals', label: 'Goals', icon: 'target' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeView === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveView(tab.key)}
            >
              <Feather 
                name={tab.icon} 
                size={18} 
                color={activeView === tab.key ? "#4A90E2" : "#666"} 
              />
              <Text style={[
                styles.tabText,
                activeView === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Tab Content */}
      <View style={styles.content}>
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4A90E2"
          colors={['#4A90E2']}
        />
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  headerActionButton: {
    padding: 8,
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
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chart: {
    borderRadius: 8,
  },
  performanceDetails: {
    marginTop: 16,
  },
  childPerformanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  childAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  childName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  childGrade: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  averageScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendText: {
    fontSize: 10,
    marginLeft: 2,
  },
  studyTimeBreakdown: {
    marginTop: 16,
  },
  studyTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  studyTimeChild: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  studyTimeChildName: {
    fontSize: 14,
    color: '#333',
  },
  studyTimeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  engagementCard: {
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
  engagementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  engagementItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  engagementAvatar: {
    fontSize: 24,
    marginBottom: 8,
  },
  engagementName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  engagementLevel: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  engagementBar: {
    width: '100%',
    height: 6,
    marginBottom: 4,
  },
  engagementPercent: {
    fontSize: 11,
    color: '#666',
  },
  engagementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  engagementBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Additional styles for subjects and goals tabs would continue here...
  // (Truncated for brevity, but would include all the remaining styles)
  matrixCard: {
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
  subjectMatrix: {
    marginTop: 16,
  },
  matrixHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  matrixHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  matrixRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  matrixSubject: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  matrixScoreCell: {
    flex: 1,
    alignItems: 'center',
  },
  matrixScore: {
    fontSize: 12,
    fontWeight: 'bold',
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
  insightsContainer: {
    marginTop: 16,
  },
  strengthsSection: {
    marginBottom: 20,
  },
  weaknessesSection: {
    marginBottom: 0,
  },
  insightsSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  insightItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightSubject: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  insightScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  insightDescription: {
    fontSize: 11,
    color: '#666',
  },
  trendsLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
  goalsCard: {
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
  familyGoalsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalsStat: {
    alignItems: 'center',
  },
  goalsStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  goalsStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  childrenGoalsCard: {
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
  childGoalCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  childGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  childGoalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childGoalAvatar: {
    fontSize: 20,
    marginRight: 12,
  },
  childGoalName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  childGoalCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  setGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  setGoalsText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  goalsProgress: {
    gap: 12,
  },
  goalProgressItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalProgressTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  goalProgressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  goalProgressBar: {
    height: 4,
    marginBottom: 4,
  },
  goalProgressDescription: {
    fontSize: 10,
    color: '#666',
  },
  challengesCard: {
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
  challengeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  challengeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  challengeDescription: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  challengeProgress: {
    alignItems: 'center',
  },
  challengeProgressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  challengeParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsLabel: {
    fontSize: 11,
    color: '#666',
    marginRight: 8,
  },
  participantsList: {
    flexDirection: 'row',
  },
  participantAvatar: {
    fontSize: 16,
    marginRight: 4,
  },
});

export default FamilyAnalyticsScreen;