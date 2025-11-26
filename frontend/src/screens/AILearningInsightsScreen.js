import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { aiAnalytics } from '../services/aiAnalytics';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AILearningInsightsScreen = ({ navigation, route }) => {
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState(null);
  const [learningPath, setLearningPath] = useState([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState([]);
  const [comparativeData, setComparativeData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAIInsights();
  }, []);

  const loadAIInsights = async () => {
    try {
      setLoading(true);
      
      const [
        performanceInsights,
        personalizedPath,
        gaps,
        comparative
      ] = await Promise.all([
        aiAnalytics.analyzeStudentPerformance(userId),
        aiAnalytics.generateLearningPath(userId),
        aiAnalytics.detectKnowledgeGaps(userId),
        aiAnalytics.generateComparativeAnalytics(userId)
      ]);

      setInsights(performanceInsights);
      setLearningPath(personalizedPath);
      setKnowledgeGaps(gaps);
      setComparativeData(comparative);

    } catch (error) {
      console.error('Error loading AI insights:', error);
      showToast('Failed to load learning insights', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAIInsights();
    setRefreshing(false);
    showToast('Insights refreshed!', 'success');
  };

  const renderOverviewTab = () => {
    if (!insights) return null;

    const performanceData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: insights.predictions?.weeklyImprovement || [70, 75, 78, 82],
        strokeWidth: 3,
        color: () => '#4A90E2',
      }]
    };

    const masteryData = insights.masteryProgress?.map(item => ({
      name: item.category,
      population: item.masteryLevel,
      color: item.status === 'mastered' ? '#4CAF50' : 
             item.status === 'learning' ? '#FF9800' : '#F44336',
      legendFontColor: '#333',
      legendFontSize: 12,
    })) || [];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Current Level Card */}
        <Animated.View 
          entering={FadeInUp.delay(100)} 
          style={styles.levelCard}
        >
          <View style={styles.levelHeader}>
            <MaterialIcons name="trending-up" size={32} color="#4A90E2" />
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Current Level</Text>
              <Text style={styles.levelValue}>{insights.currentLevel}</Text>
            </View>
            <View style={styles.velocityBadge}>
              <Text style={styles.velocityText}>
                {insights.learningVelocity > 0 ? '+' : ''}{insights.learningVelocity?.toFixed(1)}%
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Performance Prediction Chart */}
        <Animated.View 
          entering={FadeInUp.delay(200)} 
          style={styles.chartCard}
        >
          <Text style={styles.chartTitle}>Performance Prediction</Text>
          <LineChart
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
            bezier
            style={styles.chart}
          />
        </Animated.View>

        {/* Mastery Progress */}
        {masteryData.length > 0 && (
          <Animated.View 
            entering={FadeInUp.delay(300)} 
            style={styles.chartCard}
          >
            <Text style={styles.chartTitle}>Subject Mastery</Text>
            <PieChart
              data={masteryData}
              width={SCREEN_WIDTH - 60}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </Animated.View>
        )}

        {/* Strengths and Weaknesses */}
        <Animated.View 
          entering={FadeInUp.delay(400)} 
          style={styles.strengthsWeaknessesCard}
        >
          <Text style={styles.sectionTitle}>Strengths & Areas for Improvement</Text>
          
          {insights.strengths?.length > 0 && (
            <View style={styles.strengthsSection}>
              <Text style={styles.subsectionTitle}>🎯 Your Strengths</Text>
              {insights.strengths.map((strength, index) => (
                <View key={index} style={styles.strengthItem}>
                  <Feather name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.strengthText}>{strength.topic || strength}</Text>
                  {strength.score && (
                    <Text style={styles.scoreText}>{strength.score}%</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {insights.weaknesses?.length > 0 && (
            <View style={styles.weaknessesSection}>
              <Text style={styles.subsectionTitle}>📈 Areas for Growth</Text>
              {insights.weaknesses.map((weakness, index) => (
                <View key={index} style={styles.weaknessItem}>
                  <Feather name="trending-up" size={16} color="#FF9800" />
                  <Text style={styles.weaknessText}>{weakness.topic || weakness}</Text>
                  {weakness.score && (
                    <Text style={styles.scoreText}>{weakness.score}%</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Recommendations */}
        {insights.recommendedActions?.length > 0 && (
          <Animated.View 
            entering={FadeInUp.delay(500)} 
            style={styles.recommendationsCard}
          >
            <Text style={styles.sectionTitle}>🎯 AI Recommendations</Text>
            {insights.recommendedActions.map((action, index) => (
              <TouchableOpacity key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationIcon}>
                  <Feather name="lightbulb" size={20} color="#4A90E2" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>{action.title || action}</Text>
                  {action.description && (
                    <Text style={styles.recommendationDescription}>{action.description}</Text>
                  )}
                </View>
                <Feather name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  const renderLearningPathTab = () => {
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          entering={FadeInUp.delay(100)} 
          style={styles.pathHeaderCard}
        >
          <Text style={styles.pathTitle}>🎯 Your Personalized Learning Path</Text>
          <Text style={styles.pathDescription}>
            AI-curated quizzes designed specifically for your learning needs
          </Text>
        </Animated.View>

        {learningPath.map((step, index) => (
          <Animated.View 
            key={step.id} 
            entering={SlideInRight.delay(100 * (index + 1))} 
            style={styles.pathStepCard}
          >
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.order}</Text>
            </View>
            
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.quiz?.title}</Text>
              <Text style={styles.stepCategory}>{step.quiz?.category}</Text>
              <Text style={styles.stepReason}>{step.reason}</Text>
              
              <View style={styles.stepMetadata}>
                <View style={styles.metadataItem}>
                  <Feather name="clock" size={14} color="#666" />
                  <Text style={styles.metadataText}>{step.estimatedTime} min</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Feather name="bar-chart" size={14} color="#666" />
                  <Text style={styles.metadataText}>{step.difficulty}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Feather name="target" size={14} color="#666" />
                  <Text style={styles.metadataText}>{step.confidence}% match</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.startQuizButton}
                onPress={() => navigation.navigate('QuizDetail', { quizId: step.quiz._id })}
              >
                <Text style={styles.startQuizButtonText}>Start Quiz</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}

        {learningPath.length === 0 && (
          <Animated.View 
            entering={FadeInUp.delay(200)} 
            style={styles.emptyStateCard}
          >
            <Feather name="compass" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Learning Path Available</Text>
            <Text style={styles.emptyStateDescription}>
              Take a few more quizzes to help our AI create a personalized learning path for you!
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  const renderKnowledgeGapsTab = () => {
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          entering={FadeInUp.delay(100)} 
          style={styles.gapsHeaderCard}
        >
          <Text style={styles.gapsTitle}>🔍 Knowledge Gap Analysis</Text>
          <Text style={styles.gapsDescription}>
            Areas where additional practice could significantly improve your performance
          </Text>
        </Animated.View>

        {knowledgeGaps.map((gap, index) => (
          <Animated.View 
            key={index} 
            entering={SlideInRight.delay(100 * (index + 1))} 
            style={[
              styles.gapCard,
              { borderLeftColor: getSeverityColor(gap.severity) }
            ]}
          >
            <View style={styles.gapHeader}>
              <Text style={styles.gapTopic}>{gap.topic}</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(gap.severity) }]}>
                <Text style={styles.severityText}>{gap.severity}</Text>
              </View>
            </View>

            <Text style={styles.gapDescription}>
              Priority: {gap.priority}/10 | Estimated study time: {gap.estimatedStudyTime}h
            </Text>

            {gap.fundamentalConcepts?.length > 0 && (
              <View style={styles.conceptsSection}>
                <Text style={styles.conceptsTitle}>Key Concepts to Review:</Text>
                {gap.fundamentalConcepts.map((concept, idx) => (
                  <Text key={idx} style={styles.conceptItem}>• {concept}</Text>
                ))}
              </View>
            )}

            {gap.remediationQuizzes?.length > 0 && (
              <View style={styles.remediationSection}>
                <Text style={styles.remediationTitle}>Recommended Practice:</Text>
                {gap.remediationQuizzes.slice(0, 3).map((quiz, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.remediationQuiz}
                    onPress={() => navigation.navigate('QuizDetail', { quizId: quiz.id })}
                  >
                    <Text style={styles.remediationQuizText}>{quiz.title}</Text>
                    <Feather name="arrow-right" size={14} color="#4A90E2" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>
        ))}

        {knowledgeGaps.length === 0 && (
          <Animated.View 
            entering={FadeInUp.delay(200)} 
            style={styles.emptyStateCard}
          >
            <Feather name="award" size={48} color="#4CAF50" />
            <Text style={styles.emptyStateTitle}>Great Job!</Text>
            <Text style={styles.emptyStateDescription}>
              No significant knowledge gaps detected. Keep up the excellent work!
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
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
      case 'learning-path':
        return renderLearningPathTab();
      case 'knowledge-gaps':
        return renderKnowledgeGapsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Analyzing your learning patterns...</Text>
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
          <Text style={styles.headerTitle}>AI Learning Insights</Text>
          <Text style={styles.headerSubtitle}>Personalized analytics & recommendations</Text>
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
            { key: 'learning-path', label: 'Learning Path', icon: 'map' },
            { key: 'knowledge-gaps', label: 'Knowledge Gaps', icon: 'search' }
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
  levelCard: {
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
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
    marginLeft: 16,
  },
  levelTitle: {
    fontSize: 14,
    color: '#666',
  },
  levelValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  velocityBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  velocityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
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
  strengthsWeaknessesCard: {
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
  strengthsSection: {
    marginBottom: 20,
  },
  weaknessesSection: {
    marginTop: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  strengthText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  weaknessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  weaknessText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  recommendationsCard: {
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
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationContent: {
    flex: 1,
    marginLeft: 12,
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
  // Learning Path Styles
  pathHeaderCard: {
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
  pathTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pathDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pathStepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepCategory: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 8,
  },
  stepReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  stepMetadata: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  startQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  startQuizButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  // Knowledge Gaps Styles
  gapsHeaderCard: {
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
  gapsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  gapsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  gapCard: {
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
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gapTopic: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  gapDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  conceptsSection: {
    marginBottom: 12,
  },
  conceptsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  conceptItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  remediationSection: {
    marginTop: 8,
  },
  remediationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  remediationQuiz: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 4,
  },
  remediationQuizText: {
    fontSize: 12,
    color: '#4A90E2',
    flex: 1,
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
});

export default AILearningInsightsScreen;