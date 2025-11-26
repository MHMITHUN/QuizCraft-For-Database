import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { ProgressBar } from 'react-native-paper';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ReportDetailScreen = ({ navigation, route }) => {
  const { report } = route.params;
  const [activeSection, setActiveSection] = useState('summary');
  const viewShotRef = useRef();

  const exportReport = async () => {
    try {
      // Capture screenshot of the report
      const uri = await viewShotRef.current.capture();
      
      // Share the report
      const result = await Share.share({
        message: `${report.childName} - ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report`,
        url: uri,
        title: 'Learning Progress Report'
      });

      if (result.action === Share.sharedAction) {
        showToast('Report shared successfully!', 'success');
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      showToast('Failed to share report', 'error');
    }
  };

  const saveReport = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      const filename = `${report.childName}_${report.type}_report_${new Date().toISOString().split('T')[0]}.png`;
      
      // For demo purposes, just show success message
      // In real app, would save to device storage
      showToast('Report saved to gallery!', 'success');
    } catch (error) {
      console.error('Error saving report:', error);
      showToast('Failed to save report', 'error');
    }
  };

  const renderReportHeader = () => (
    <Animated.View entering={FadeInUp.delay(100)} style={styles.reportHeader}>
      <View style={styles.reportTitleContainer}>
        <Text style={styles.reportTitle}>
          {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
        </Text>
        <Text style={styles.reportSubtitle}>
          {report.childName} • {new Date(report.dateGenerated).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.reportGrade}>
        <Text style={styles.gradeLabel}>Overall Grade</Text>
        <View style={[styles.gradeBadge, { 
          backgroundColor: report.overallGrade >= 85 ? '#4CAF50' : 
                          report.overallGrade >= 70 ? '#FF9800' : '#F44336' 
        }]}>
          <Text style={styles.gradeText}>{report.overallGrade}/100</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderSummarySection = () => (
    <View style={styles.sectionContainer}>
      {/* Key Metrics */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.metricsCard}>
        <Text style={styles.cardTitle}>📊 Key Metrics</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <MaterialIcons name="quiz" size={24} color="#4A90E2" />
            <Text style={styles.metricValue}>{report.summary.totalQuizzes}</Text>
            <Text style={styles.metricLabel}>Quizzes Completed</Text>
          </View>
          
          <View style={styles.metricItem}>
            <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.metricValue}>{report.summary.averageScore}%</Text>
            <Text style={styles.metricLabel}>Average Score</Text>
          </View>
          
          <View style={styles.metricItem}>
            <MaterialIcons name="access-time" size={24} color="#FF9800" />
            <Text style={styles.metricValue}>{report.summary.studyTime}h</Text>
            <Text style={styles.metricLabel}>Study Time</Text>
          </View>
          
          <View style={styles.metricItem}>
            <MaterialIcons name="emoji-events" size={24} color="#FFD93D" />
            <Text style={styles.metricValue}>{report.summary.achievements}</Text>
            <Text style={styles.metricLabel}>Achievements</Text>
          </View>
        </View>
      </Animated.View>

      {/* Performance Overview */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.chartCard}>
        <Text style={styles.cardTitle}>📈 Performance Trend</Text>
        
        <LineChart
          data={{
            labels: report.performanceData.labels,
            datasets: [{
              data: report.performanceData.scores,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              strokeWidth: 2
            }]
          }}
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
        
        <View style={styles.trendInsight}>
          <View style={styles.trendIndicator}>
            <MaterialIcons 
              name={report.summary.improvement > 0 ? "trending-up" : "trending-down"} 
              size={20} 
              color={report.summary.improvement > 0 ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[styles.trendText, { 
              color: report.summary.improvement > 0 ? "#4CAF50" : "#F44336" 
            }]}>
              {report.summary.improvement > 0 ? '+' : ''}{report.summary.improvement}% from last period
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Subject Breakdown */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.chartCard}>
        <Text style={styles.cardTitle}>📚 Subject Performance</Text>
        
        <PieChart
          data={report.subjectBreakdown.map((subject, index) => ({
            name: subject.name,
            population: subject.score,
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
        
        <View style={styles.subjectList}>
          {report.subjectBreakdown.map((subject, index) => (
            <View key={index} style={styles.subjectItem}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <View style={styles.subjectScore}>
                <Text style={styles.subjectPercent}>{subject.score}%</Text>
                <View style={styles.subjectProgress}>
                  <ProgressBar 
                    progress={subject.score / 100} 
                    color="#4A90E2"
                    style={styles.progressBar}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );

  const renderHighlightsSection = () => (
    <View style={styles.sectionContainer}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.highlightsCard}>
        <Text style={styles.cardTitle}>🌟 Highlights</Text>
        
        {report.highlights.map((highlight, index) => (
          <Animated.View 
            key={index}
            entering={SlideInRight.delay(250 + index * 100)}
            style={styles.highlightItem}
          >
            <View style={styles.highlightIcon}>
              <Text style={styles.highlightEmoji}>{highlight.icon}</Text>
            </View>
            <View style={styles.highlightContent}>
              <Text style={styles.highlightTitle}>{highlight.title}</Text>
              <Text style={styles.highlightDescription}>{highlight.description}</Text>
              {highlight.metric && (
                <Text style={styles.highlightMetric}>{highlight.metric}</Text>
              )}
            </View>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );

  const renderConcernsSection = () => (
    <View style={styles.sectionContainer}>
      {report.concerns.length > 0 ? (
        <Animated.View entering={FadeInUp.delay(200)} style={styles.concernsCard}>
          <Text style={styles.cardTitle}>⚠️ Areas for Improvement</Text>
          
          {report.concerns.map((concern, index) => (
            <View key={index} style={styles.concernItem}>
              <View style={styles.concernHeader}>
                <Text style={styles.concernTitle}>{concern.issue}</Text>
                <View style={[styles.severityBadge, {
                  backgroundColor: concern.severity === 'high' ? '#FFE8E6' : 
                                  concern.severity === 'medium' ? '#FFF3E0' : '#E8F5E8'
                }]}>
                  <Text style={[styles.severityText, {
                    color: concern.severity === 'high' ? '#F44336' : 
                           concern.severity === 'medium' ? '#FF9800' : '#4CAF50'
                  }]}>
                    {concern.severity}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.concernDescription}>{concern.description}</Text>
              
              {concern.suggestions && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Recommended Actions:</Text>
                  {concern.suggestions.map((suggestion, idx) => (
                    <Text key={idx} style={styles.suggestionText}>• {suggestion}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.delay(200)} style={styles.noConcernsCard}>
          <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
          <Text style={styles.noConcernsTitle}>Great Job! 🎉</Text>
          <Text style={styles.noConcernsText}>
            No major concerns identified. {report.childName} is performing well across all areas!
          </Text>
        </Animated.View>
      )}
    </View>
  );

  const renderRecommendationsSection = () => (
    <View style={styles.sectionContainer}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.recommendationsCard}>
        <Text style={styles.cardTitle}>💡 Recommendations</Text>
        
        {report.recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationItem}>
            <View style={styles.recommendationHeader}>
              <View style={styles.recommendationIcon}>
                <Text style={styles.recommendationEmoji}>{rec.icon}</Text>
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>{rec.description}</Text>
              </View>
              <View style={[styles.priorityBadge, {
                backgroundColor: rec.priority === 'high' ? '#FFE8E6' : 
                                rec.priority === 'medium' ? '#FFF3E0' : '#E8F5E8'
              }]}>
                <Text style={[styles.priorityText, {
                  color: rec.priority === 'high' ? '#F44336' : 
                         rec.priority === 'medium' ? '#FF9800' : '#4CAF50'
                }]}>
                  {rec.priority}
                </Text>
              </View>
            </View>
            
            {rec.steps && (
              <View style={styles.stepsContainer}>
                <Text style={styles.stepsTitle}>Action Steps:</Text>
                {rec.steps.map((step, idx) => (
                  <Text key={idx} style={styles.stepText}>{idx + 1}. {step}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'summary':
        return renderSummarySection();
      case 'highlights':
        return renderHighlightsSection();
      case 'concerns':
        return renderConcernsSection();
      case 'recommendations':
        return renderRecommendationsSection();
      default:
        return renderSummarySection();
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
          <Text style={styles.headerTitle}>Progress Report</Text>
          <Text style={styles.headerSubtitle}>{report.childName}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={saveReport}
          >
            <Feather name="download" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={exportReport}
          >
            <Feather name="share" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderReportHeader()}

          {/* Section Navigation */}
          <Animated.View entering={FadeInUp.delay(150)} style={styles.sectionTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'summary', label: 'Summary', icon: 'bar-chart-2' },
                { key: 'highlights', label: 'Highlights', icon: 'star' },
                { key: 'concerns', label: 'Concerns', icon: 'alert-triangle' },
                { key: 'recommendations', label: 'Actions', icon: 'target' }
              ].map((section) => (
                <TouchableOpacity
                  key={section.key}
                  style={[
                    styles.sectionTab,
                    activeSection === section.key && styles.activeSectionTab
                  ]}
                  onPress={() => setActiveSection(section.key)}
                >
                  <Feather 
                    name={section.icon} 
                    size={16} 
                    color={activeSection === section.key ? "#4A90E2" : "#666"} 
                  />
                  <Text style={[
                    styles.sectionTabText,
                    activeSection === section.key && styles.activeSectionTabText
                  ]}>
                    {section.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Section Content */}
          {renderSectionContent()}
        </ScrollView>
      </ViewShot>
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
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  reportHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reportGrade: {
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 8,
  },
  activeSectionTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  sectionTabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  activeSectionTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  sectionContainer: {
    padding: 20,
  },
  metricsCard: {
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  trendInsight: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  subjectList: {
    marginTop: 16,
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  subjectScore: {
    alignItems: 'flex-end',
    flex: 1,
  },
  subjectPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  subjectProgress: {
    marginTop: 4,
    width: 60,
  },
  progressBar: {
    height: 4,
  },
  highlightsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightEmoji: {
    fontSize: 20,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  highlightDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  highlightMetric: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginTop: 4,
  },
  concernsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  concernItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  concernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  concernTitle: {
    fontSize: 14,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  noConcernsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noConcernsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  noConcernsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  recommendationsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recommendationItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationEmoji: {
    fontSize: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepsContainer: {
    marginTop: 12,
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  stepText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
  },
});

export default ReportDetailScreen;