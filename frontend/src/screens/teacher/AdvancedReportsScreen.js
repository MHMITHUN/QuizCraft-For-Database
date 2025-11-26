
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

import { analyticsAPI, classesAPI, quizAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';

const formatPercent = (value) => {
  if (!Number.isFinite(value)) {
    return '--%';
  }
  return `${Number(value).toFixed(0)}%`;
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return Number(value).toLocaleString();
};

export default function AdvancedReportsScreen({ navigation }) {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);

  const palette = useMemo(() => ({
    background: theme === 'light' ? '#F8FAFC' : '#020817',
    surface: theme === 'light' ? '#FFFFFF' : '#0F172A',
    border: theme === 'light' ? '#E2E8F0' : '#1F2937',
    textPrimary: theme === 'light' ? '#0F172A' : '#F8FAFC',
    textSecondary: theme === 'light' ? '#64748B' : '#94A3B8',
  }), [theme]);

  const uniqueStudentCount = useMemo(() => {
    const ids = new Set();
    (classes || []).forEach((klass) => {
      (klass.students || []).forEach((student) => {
        if (student?._id) {
          ids.add(String(student._id));
        }
      });
    });
    return ids.size;
  }, [classes]);

  const trendDelta = useMemo(() => {
    if (!performanceTrend?.length) {
      return null;
    }
    const first = performanceTrend[0]?.percentage || 0;
    const last = performanceTrend[performanceTrend.length - 1]?.percentage || 0;
    if (!Number.isFinite(first) || !Number.isFinite(last)) {
      return null;
    }
    return last - first;
  }, [performanceTrend]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, quizzesRes, statsRes] = await Promise.allSettled([
        classesAPI.mine(),
        quizAPI.getMyQuizzes(),
        analyticsAPI.getMyStats(),
      ]);

      if (classesRes.status === 'fulfilled') {
        setClasses(classesRes.value?.data?.data?.classes || []);
      } else {
        setClasses([]);
      }

      if (quizzesRes.status === 'fulfilled') {
        const quizPayload = quizzesRes.value?.data?.data?.quizzes || quizzesRes.value?.data?.quizzes || [];
        setQuizzes(Array.isArray(quizPayload) ? quizPayload : []);
      } else {
        setQuizzes([]);
      }

      if (statsRes.status === 'fulfilled') {
        const payload = statsRes.value?.data?.data || {};
        setStats(payload?.stats || null);
        setRecentQuizzes(payload?.recentQuizzes || []);
        setPerformanceTrend(payload?.performanceTrend || []);
      } else {
        setStats(null);
        setRecentQuizzes([]);
        setPerformanceTrend([]);
      }
    } catch (error) {
      Toast.error('Unable to load advanced reports');
      setClasses([]);
      setQuizzes([]);
      setStats(null);
      setRecentQuizzes([]);
      setPerformanceTrend([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [loadReports]);

  const summaryCards = useMemo(() => ([
    {
      key: 'classes',
      label: 'Active classes',
      value: classes.length,
      icon: 'layers',
      color: '#6366F1',
    },
    {
      key: 'students',
      label: 'Unique students',
      value: uniqueStudentCount,
      icon: 'people',
      color: '#0EA5E9',
    },
    {
      key: 'quizzes',
      label: 'Quizzes created',
      value: quizzes.length,
      icon: 'book',
      color: '#F59E0B',
    },
    {
      key: 'averageScore',
      label: 'Average score',
      value: formatPercent(stats?.averageScore),
      icon: 'stats-chart',
      color: '#10B981',
    },
  ]), [classes.length, uniqueStudentCount, quizzes.length, stats?.averageScore]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}> 
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Compiling your reports...</Text>
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
            <Text style={styles.heroTitle}>Advanced reports</Text>
            <Text style={styles.heroSubtitle}>{formatNumber(quizzes.length)} quizzes - {formatNumber(classes.length)} classes</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => Toast.info('Bulk export is coming soon')}>
            <Ionicons name="download" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.key} style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <View style={[styles.summaryIcon, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{card.value}</Text>
              <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Performance trend</Text>
            <Text style={[styles.sectionMeta, { color: trendDelta >= 0 ? '#10B981' : '#EF4444' }]}>
              {trendDelta === null ? 'No data' : `${trendDelta >= 0 ? '+' : ''}${trendDelta.toFixed(1)} pts`}
            </Text>
          </View>
          {performanceTrend.length ? (
            <View style={[styles.trendCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              {performanceTrend.map((point, index) => (
                <View key={point.completedAt || index} style={styles.trendRow}>
                  <Text style={[styles.trendLabel, { color: palette.textSecondary }]}>
                    {new Date(point.completedAt).toLocaleDateString()}
                  </Text>
                  <View style={styles.trendBarContainer}>
                    <View style={[styles.trendBar, { width: `${Math.min(100, Math.max(0, point.percentage || 0))}%` }]} />
                  </View>
                  <Text style={[styles.trendValue, { color: palette.textPrimary }]}>{formatPercent(point.percentage)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No recent attempts to analyse</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Recent quizzes</Text>
            <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{recentQuizzes.length}</Text>
          </View>
          {recentQuizzes.length ? (
            recentQuizzes.map((item) => (
              <View key={item._id} style={[styles.quizCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.quizInfo}>
                  <Text style={[styles.quizTitle, { color: palette.textPrimary }]} numberOfLines={1}>{item.quiz?.title || 'Quiz'}</Text>
                  <Text style={[styles.quizMeta, { color: palette.textSecondary }]}>Attempted {new Date(item.completedAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.quizStats}>
                  <Text style={styles.quizStatValue}>{formatPercent(item.percentage)}</Text>
                  <Text style={[styles.quizStatLabel, { color: palette.textSecondary }]}>Score</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No recent quiz activity</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Your totals</Text>
          <View style={[styles.metricsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Passed quizzes</Text>
              <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{stats?.passedQuizzes || 0}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Total points</Text>
              <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{formatNumber(stats?.totalPoints || 0)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Total time teaching</Text>
              <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{formatNumber(Math.round((stats?.totalTimeTaken || 0) / 60))} mins</Text>
            </View>
          </View>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  summaryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trendLabel: {
    width: 90,
    fontSize: 12,
  },
  trendBarContainer: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1F293700',
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  trendBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  trendValue: {
    width: 60,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
  },
  quizCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizInfo: {
    flex: 1,
    marginRight: 12,
  },
  quizTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  quizMeta: {
    fontSize: 12,
  },
  quizStats: {
    alignItems: 'flex-end',
  },
  quizStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  quizStatLabel: {
    fontSize: 11,
  },
  metricsCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 13,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
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
});




