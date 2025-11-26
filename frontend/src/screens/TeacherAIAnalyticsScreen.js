import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import { aiAnalytics } from '../services/aiAnalytics';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TeacherAIAnalyticsScreen = ({ navigation, route }) => {
  const { classId, className } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [classAnalytics, setClassAnalytics] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTeacherAnalytics();
  }, []);

  const loadTeacherAnalytics = async () => {
    try {
      setLoading(true);
      
      const [
        analytics,
        atRisk
      ] = await Promise.all([
        // Mock class analytics - would come from backend
        generateMockClassAnalytics(),
        aiAnalytics.predictAtRiskStudents(classId)
      ]);

      setClassAnalytics(analytics);
      setAtRiskStudents(atRisk);

    } catch (error) {
      console.error('Error loading teacher analytics:', error);
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateMockClassAnalytics = () => {
    // Mock data generation - in real implementation this would come from backend
    return {
      totalStudents: 28,
      activeStudents: 25,
      averageScore: 78.5,
      completionRate: 82,
      improvementRate: 12.3,
      weeklyActivity: [45, 52, 38, 61, 47, 58, 42],
      categoryPerformance: [
        { category: 'Mathematics', average: 82, students: 28 },
        { category: 'Science', average: 76, students: 24 },
        { category: 'History', average: 71, students: 22 },
        { category: 'Literature', average: 84, students: 20 }
      ],
      difficultyBreakdown: [
        { difficulty: 'Easy', performance: 91 },
        { difficulty: 'Medium', performance: 78 },
        { difficulty: 'Hard', performance: 63 }
      ],
      topPerformers: [
        { name: 'Alice Johnson', score: 94, improvement: 8 },
        { name: 'Bob Smith', score: 91, improvement: 12 },
        { name: 'Carol Davis', score: 89, improvement: 6 }
      ],
      strugglingStudents: [
        { name: 'David Wilson', score: 52, decline: -15 },
        { name: 'Eva Brown', score: 58, decline: -8 },
        { name: 'Frank Miller', score: 61, decline: -5 }
      ],
      engagementMetrics: {
        quizzesPerWeek: 3.2,
        averageTimeSpent: 18, // minutes
        participationRate: 85
      }
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTeacherAnalytics();
    setRefreshing(false);
    showToast('Analytics refreshed!', 'success');
  };

  const handleStudentDetails = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const generateInterventionPlan = async (student) => {
    try {
      // Mock intervention plan generation
      const plan = {
        immediate: [
          'Schedule one-on-one session this week',
          'Assign foundational review quizzes',
          'Provide additional practice materials'
        ],
        shortTerm: [
          'Monitor progress weekly',
          'Pair with peer mentor',
          'Adjust difficulty level'
        ],
        longTerm: [
          'Develop personalized learning path',
          'Regular parent communication',
          'Track improvement metrics'
        ]
      };

      Alert.alert(
        'Intervention Plan Generated',
        `AI-generated plan for ${student.studentName}:\n\nImmediate Actions:\n${plan.immediate.map(action => `• ${action}`).join('\n')}\n\nWould you like to view the full plan?`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'View Full Plan', onPress: () => showInterventionPlan(student, plan) }
        ]
      );
    } catch (error) {
      showToast('Failed to generate intervention plan', 'error');
    }
  };

  const showInterventionPlan = (student, plan) => {
    navigation.navigate('InterventionPlan', { student, plan });
  };

  const renderOverviewTab = () => {
    if (!classAnalytics) return null;

    const activityData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: classAnalytics.weeklyActivity,
        color: () => '#4A90E2',
        strokeWidth: 3
      }]
    };

    const performanceData = {
      labels: classAnalytics.categoryPerformance.map(cat => cat.category.substring(0, 8)),
      datasets: [{
        data: classAnalytics.categoryPerformance.map(cat => cat.average),
      }]
    };

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Class Summary Cards */}
        <View style={styles.summaryCardsContainer}>
          <Animated.View entering={FadeInUp.delay(100)} style={styles.summaryCard}>
            <MaterialIcons name="people" size={24} color="#4A90E2" />
            <Text style={styles.summaryNumber}>{classAnalytics.totalStudents}</Text>
            <Text style={styles.summaryLabel}>Total Students</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(150)} style={styles.summaryCard}>
            <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.summaryNumber}>{classAnalytics.averageScore}%</Text>
            <Text style={styles.summaryLabel}>Class Average</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200)} style={styles.summaryCard}>
            <MaterialIcons name="check-circle" size={24} color="#FF9800" />
            <Text style={styles.summaryNumber}>{classAnalytics.completionRate}%</Text>
            <Text style={styles.summaryLabel}>Completion Rate</Text>
          </Animated.View>
        </View>

        {/* Weekly Activity Chart */}
        <Animated.View entering={FadeInUp.delay(250)} style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Quiz Activity</Text>
          <LineChart
            data={activityData}
            width={SCREEN_WIDTH - 60}
            height={220}
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

        {/* Category Performance Chart */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.chartCard}>
          <Text style={styles.chartTitle}>Subject Performance</Text>
          <BarChart
            data={performanceData}
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
            style={styles.chart}
          />
        </Animated.View>

        {/* Top Performers */}
        <Animated.View entering={FadeInUp.delay(350)} style={styles.performersCard}>
          <Text style={styles.sectionTitle}>🏆 Top Performers</Text>
          {classAnalytics.topPerformers.map((student, index) => (
            <TouchableOpacity key={index} style={styles.performerItem}>
              <View style={styles.performerRank}>
                <Text style={styles.performerRankText}>{index + 1}</Text>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerName}>{student.name}</Text>
                <Text style={styles.performerScore}>Score: {student.score}%</Text>
              </View>
              <View style={styles.performerImprovement}>
                <Feather name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.improvementText}>+{student.improvement}%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Engagement Metrics */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.engagementCard}>
          <Text style={styles.sectionTitle}>📊 Engagement Insights</Text>
          
          <View style={styles.engagementMetric}>
            <Feather name="activity" size={20} color="#4A90E2" />
            <Text style={styles.engagementLabel}>Average Quizzes/Week</Text>
            <Text style={styles.engagementValue}>{classAnalytics.engagementMetrics.quizzesPerWeek}</Text>
          </View>

          <View style={styles.engagementMetric}>
            <Feather name="clock" size={20} color="#4A90E2" />
            <Text style={styles.engagementLabel}>Avg Time per Quiz</Text>
            <Text style={styles.engagementValue}>{classAnalytics.engagementMetrics.averageTimeSpent}min</Text>
          </View>

          <View style={styles.engagementMetric}>
            <Feather name="users" size={20} color="#4A90E2" />
            <Text style={styles.engagementLabel}>Participation Rate</Text>
            <Text style={styles.engagementValue}>{classAnalytics.engagementMetrics.participationRate}%</Text>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderAtRiskTab = () => {
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100)} style={styles.riskHeaderCard}>
          <Text style={styles.riskTitle}>⚠️ Students Needing Attention</Text>
          <Text style={styles.riskDescription}>
            AI-identified students who may benefit from additional support
          </Text>
        </Animated.View>

        {atRiskStudents.map((student, index) => (
          <Animated.View 
            key={student.studentId} 
            entering={SlideInRight.delay(100 * (index + 1))} 
            style={[
              styles.riskCard,
              { borderLeftColor: getRiskColor(student.riskLevel) }
            ]}
          >
            <View style={styles.riskHeader}>
              <View style={styles.riskStudentInfo}>
                <Text style={styles.riskStudentName}>{student.studentName}</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(student.riskLevel) }]}>
                  <Text style={styles.riskBadgeText}>{student.riskLevel.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.riskScore}>Risk Score: {student.riskScore.toFixed(0)}/100</Text>
            </View>

            <View style={styles.riskFactors}>
              <Text style={styles.riskFactorsTitle}>Key Risk Factors:</Text>
              {Object.entries(student.riskFactors).map(([factor, value]) => 
                value > 0.3 && (
                  <View key={factor} style={styles.riskFactor}>
                    <View style={styles.riskFactorDot} />
                    <Text style={styles.riskFactorText}>
                      {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Text>
                    <Text style={styles.riskFactorValue}>{(value * 100).toFixed(0)}%</Text>
                  </View>
                )
              )}
            </View>

            <View style={styles.riskActions}>
              <TouchableOpacity 
                style={styles.riskActionButton}
                onPress={() => handleStudentDetails(student)}
              >
                <Feather name="user" size={16} color="#4A90E2" />
                <Text style={styles.riskActionText}>View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.riskActionButton, styles.interventionButton]}
                onPress={() => generateInterventionPlan(student)}
              >
                <Feather name="zap" size={16} color="#fff" />
                <Text style={[styles.riskActionText, styles.interventionButtonText]}>AI Plan</Text>
              </TouchableOpacity>
            </View>

            {student.recommendations?.length > 0 && (
              <View style={styles.recommendationsPreview}>
                <Text style={styles.recommendationsTitle}>Quick Actions:</Text>
                {student.recommendations.slice(0, 2).map((rec, idx) => (
                  <Text key={idx} style={styles.recommendationText}>• {rec.action}</Text>
                ))}
              </View>
            )}
          </Animated.View>
        ))}

        {atRiskStudents.length === 0 && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.emptyStateCard}>
            <Feather name="shield-check" size={48} color="#4CAF50" />
            <Text style={styles.emptyStateTitle}>All Students Doing Well!</Text>
            <Text style={styles.emptyStateDescription}>
              No students identified as at-risk based on current data.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  const renderInsightsTab = () => {
    if (!classAnalytics) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100)} style={styles.insightsHeaderCard}>
          <Text style={styles.insightsTitle}>🧠 AI-Generated Insights</Text>
          <Text style={styles.insightsDescription}>
            Data-driven observations and recommendations for your class
          </Text>
        </Animated.View>

        {/* Class Trends */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Feather name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.insightTitle}>Positive Trends</Text>
          </View>
          <Text style={styles.insightText}>
            • Class average improved by {classAnalytics.improvementRate}% this month
          </Text>
          <Text style={styles.insightText}>
            • Mathematics performance is notably strong (82% average)
          </Text>
          <Text style={styles.insightText}>
            • Student engagement increased on weekdays vs. weekends
          </Text>
        </Animated.View>

        {/* Areas for Attention */}
        <Animated.View entering={FadeInUp.delay(250)} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Feather name="alert-triangle" size={24} color="#FF9800" />
            <Text style={styles.insightTitle}>Areas Needing Attention</Text>
          </View>
          <Text style={styles.insightText}>
            • History performance is below class average (71%)
          </Text>
          <Text style={styles.insightText}>
            • 3 students showing declining performance trends
          </Text>
          <Text style={styles.insightText}>
            • Hard difficulty questions need more practice (63% success rate)
          </Text>
        </Animated.View>

        {/* Recommendations */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Feather name="lightbulb" size={24} color="#4A90E2" />
            <Text style={styles.insightTitle}>AI Recommendations</Text>
          </View>
          <TouchableOpacity style={styles.recommendationAction}>
            <Text style={styles.insightText}>• Create targeted History review sessions</Text>
            <Feather name="chevron-right" size={16} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.recommendationAction}>
            <Text style={styles.insightText}>• Implement peer tutoring for struggling students</Text>
            <Feather name="chevron-right" size={16} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.recommendationAction}>
            <Text style={styles.insightText}>• Gradually increase difficulty in Mathematics</Text>
            <Feather name="chevron-right" size={16} color="#4A90E2" />
          </TouchableOpacity>
        </Animated.View>

        {/* Learning Patterns */}
        <Animated.View entering={FadeInUp.delay(350)} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Feather name="activity" size={24} color="#9C27B0" />
            <Text style={styles.insightTitle}>Learning Patterns</Text>
          </View>
          <Text style={styles.insightText}>
            • Peak activity occurs on Tuesday and Thursday
          </Text>
          <Text style={styles.insightText}>
            • Students perform 12% better in morning sessions
          </Text>
          <Text style={styles.insightText}>
            • Quiz completion rates drop after 20 minutes
          </Text>
        </Animated.View>
      </ScrollView>
    );
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'at-risk':
        return renderAtRiskTab();
      case 'insights':
        return renderInsightsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Analyzing class performance...</Text>
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
          <Text style={styles.headerTitle}>AI Class Analytics</Text>
          <Text style={styles.headerSubtitle}>{className || 'Class Dashboard'}</Text>
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
            { key: 'overview', label: 'Overview', icon: 'bar-chart-2' },
            { key: 'at-risk', label: 'At Risk', icon: 'alert-triangle' },
            { key: 'insights', label: 'AI Insights', icon: 'brain' }
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

      {/* Student Details Modal */}
      <Modal
        visible={showStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedStudent?.studentName} - Details
              </Text>
              <TouchableOpacity onPress={() => setShowStudentModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedStudent && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalSectionTitle}>Risk Assessment</Text>
                <Text style={styles.modalText}>
                  Risk Level: {selectedStudent.riskLevel.toUpperCase()}
                </Text>
                <Text style={styles.modalText}>
                  Risk Score: {selectedStudent.riskScore.toFixed(0)}/100
                </Text>
                
                <Text style={styles.modalSectionTitle}>Recommendations</Text>
                {selectedStudent.recommendations?.map((rec, index) => (
                  <Text key={index} style={styles.modalText}>
                    • {rec.action}: {rec.description}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
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
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
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
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  performersCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  performerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  performerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  performerScore: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  performerImprovement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  improvementText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  engagementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  engagementMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  engagementLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  engagementValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  // At-Risk Tab Styles
  riskHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  riskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  riskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskStudentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  riskScore: {
    fontSize: 12,
    color: '#666',
  },
  riskFactors: {
    marginBottom: 12,
  },
  riskFactorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  riskFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  riskFactorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9800',
    marginRight: 8,
  },
  riskFactorText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  riskFactorValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  riskActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  riskActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  interventionButton: {
    backgroundColor: '#4A90E2',
  },
  riskActionText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  interventionButtonText: {
    color: '#fff',
  },
  recommendationsPreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  // Insights Tab Styles
  insightsHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  insightsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    flex: 1,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default TeacherAIAnalyticsScreen;