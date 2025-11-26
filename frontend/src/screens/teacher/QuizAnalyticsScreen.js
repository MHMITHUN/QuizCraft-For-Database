
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { analyticsAPI, quizAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';

const formatPercent = (value) => {
  if (!Number.isFinite(value)) {
    return '--%';
  }
  return `${Number(value).toFixed(0)}%`;
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return '--';
  }
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

export default function QuizAnalyticsScreen({ route, navigation }) {
  const quizId = route?.params?.quizId;
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const palette = useMemo(() => ({
    background: theme === 'light' ? '#F8FAFC' : '#020817',
    surface: theme === 'light' ? '#FFFFFF' : '#0F172A',
    border: theme === 'light' ? '#E2E8F0' : '#1F2937',
    textPrimary: theme === 'light' ? '#0F172A' : '#F8FAFC',
    textSecondary: theme === 'light' ? '#64748B' : '#94A3B8',
  }), [theme]);

  const overview = analytics?.overview || {};
  const scoreDistribution = analytics?.scoreDistribution || [];
  const questionAnalytics = analytics?.questionAnalytics || [];
  const recentAttempts = analytics?.recentAttempts || [];

  const loadAnalytics = useCallback(async () => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    try {
      const [quizRes, analyticsRes] = await Promise.allSettled([
        quizAPI.getById(quizId),
        analyticsAPI.getQuizAnalytics(quizId),
      ]);

      if (quizRes.status === 'fulfilled') {
        setQuiz(quizRes.value?.data?.data?.quiz || null);
      } else {
        setQuiz(null);
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value?.data?.data || null);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      Toast.error('Unable to load quiz analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [quizId]);

  useEffect(() => {
    setLoading(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const heroSubtitle = quiz ? `${quiz.questions?.length || 0} questions` : '';

  const distributionMax = useMemo(() => {
    if (!scoreDistribution.length) {
      return 0;
    }
    return Math.max(...scoreDistribution.map((item) => item.count || 0));
  }, [scoreDistribution]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}> 
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Preparing analytics...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}> 
        <Ionicons name="alert-circle" size={58} color="#EF4444" />
        <Text style={[styles.errorText, { color: palette.textPrimary }]}>We could not find that quiz</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}> 
      <LinearGradient colors={theme === 'light' ? ['#312E81', '#5B21B6'] : ['#0F172A', '#1E1B4B']} style={styles.hero}>
        <View style={styles.heroHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle} numberOfLines={1}>{quiz.title || 'Quiz analytics'}</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => Toast.info('Exporting reports will be available soon')}>
            <Ionicons name="download" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Total attempts</Text>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{overview.totalAttempts || 0}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Average score</Text>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{formatPercent(overview.averageScore)}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Pass rate</Text>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{formatPercent(overview.passRate)}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Average duration</Text>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{formatTime(overview.averageTime)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Score distribution</Text>
          {scoreDistribution.length ? (
            scoreDistribution.map((bucket) => (
              <View key={bucket.range} style={styles.distributionRow}>
                <Text style={[styles.distributionLabel, { color: palette.textSecondary }]}>{bucket.range}</Text>
                <View style={[styles.distributionBarContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
                  <View
                    style={[styles.distributionBar, { width: distributionMax ? `${Math.max(5, (bucket.count || 0) / distributionMax * 100)}%` : '0%' }]}
                  />
                </View>
                <Text style={[styles.distributionCount, { color: palette.textPrimary }]}>{bucket.count || 0}</Text>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}> 
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No attempts yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Question performance</Text>
          {questionAnalytics.length ? (
            questionAnalytics.map((question, index) => (
              <View key={index} style={[styles.questionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.questionHeader}>
                  <Text style={[styles.questionIndex, { color: palette.textSecondary }]}>Question {index + 1}</Text>
                  <Text style={[styles.questionBadge, { color: palette.textPrimary }]}>{formatPercent(question.correctRate)}</Text>
                </View>
                <Text style={[styles.questionText, { color: palette.textPrimary }]}>{question.questionText}</Text>
                <View style={styles.questionStats}>
                  <Text style={[styles.questionStat, { color: palette.textSecondary }]}>Attempts: {question.totalAttempts || 0}</Text>
                  <Text style={[styles.questionStat, { color: palette.textSecondary }]}>Difficulty: {question.difficulty || 'n/a'}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No question-level analytics yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Recent attempts</Text>
          {recentAttempts.length ? (
            recentAttempts.slice(0, 10).map((attempt) => (
              <View key={attempt._id} style={[styles.attemptCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
                <View style={styles.attemptInfo}>
                  <Text style={[styles.attemptName, { color: palette.textPrimary }]} numberOfLines={1}>{attempt.user?.name || 'Student'}</Text>
                  <Text style={[styles.attemptMeta, { color: palette.textSecondary }]} numberOfLines={1}>{attempt.user?.email || 'No email'}</Text>
                </View>
                <View style={styles.attemptStats}>
                  <Text style={styles.attemptScore}>{formatPercent(attempt.percentage)}</Text>
                  <Text style={[styles.attemptLabel, { color: palette.textSecondary }]}>Score</Text>
                </View>
                <View style={styles.attemptStats}>
                  <Text style={styles.attemptScore}>{formatTime(attempt.timeTaken)}</Text>
                  <Text style={[styles.attemptLabel, { color: palette.textSecondary }]}>Time</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}> 
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No attempts recorded yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: {
    flex: 1,
    marginHorizontal: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 13,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  distributionLabel: {
    width: 64,
    fontSize: 13,
  },
  distributionBarContainer: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  distributionCount: {
    width: 36,
    fontSize: 13,
    textAlign: 'right',
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionIndex: {
    fontSize: 13,
    fontWeight: '600',
  },
  questionBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  questionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  questionStat: {
    fontSize: 12,
  },
  attemptCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attemptInfo: {
    flex: 1,
  },
  attemptName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  attemptMeta: {
    fontSize: 12,
  },
  attemptStats: {
    alignItems: 'flex-end',
  },
  attemptScore: {
    fontSize: 15,
    fontWeight: '600',
  },
  attemptLabel: {
    fontSize: 11,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});


