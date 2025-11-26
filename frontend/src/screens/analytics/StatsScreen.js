import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const AnimatedNumber = ({ value = 0, formatter, textStyle, duration = 900 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.stopAnimation();
    animatedValue.setValue(0);
    const listener = animatedValue.addListener(({ value: v }) => setDisplayValue(v));
    Animated.timing(animatedValue, {
      toValue: Number.isFinite(value) ? value : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, duration, animatedValue]);

  const formatted = formatter ? formatter(displayValue) : Math.round(displayValue).toString();

  return <Text style={textStyle}>{formatted}</Text>;
};

const ProgressBar = ({ value = 0, label, color }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(100, Math.max(0, value)),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, widthAnim]);

  return (
    <View style={styles.progressWrapper}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: color },
          ]}
        />
      </View>
      {label ? <Text style={styles.progressLabel}>{label}</Text> : null}
    </View>
  );
};

export default function StatsScreen({ navigation }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [statsResponse, setStatsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDark = theme === 'dark';

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        const res = await analyticsAPI.getMyStats();
        if (!mounted) return;
        setStatsResponse(res?.data?.data || {});
        setError(null);
      } catch (e) {
        console.error('Stats fetch error:', e);
        if (!mounted) return;
        const msg = e?.message || '';
        if (msg.includes('Not authorized') || msg.includes('Invalid') || msg.includes('expired')) {
          setError(t('auth:sessionExpired') || 'Session expired. Please sign in again.');
        } else {
          setError(t('analytics:failedStatsDescription') || 'Failed to fetch statistics. Please try again.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!loading) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, fadeAnim]);

  const stats = statsResponse?.stats || {};
  const totalQuizzes = stats.totalQuizzes || 0;
  const avgScore = stats.averageScore || 0;
  const avgScoreClamped = Math.min(100, Math.max(0, avgScore));
  const passedQuizzes = stats.passedQuizzes || 0;
  const passRate = totalQuizzes ? (passedQuizzes / totalQuizzes) * 100 : 0;
  const totalTimeTaken = stats.totalTimeTaken || 0;
  const avgTimePerQuiz = totalQuizzes ? totalTimeTaken / totalQuizzes : 0;
  const totalPoints = stats.totalPoints || 0;
  const userPoints = statsResponse?.userPoints || totalPoints;
  const recentQuizzes = statsResponse?.recentQuizzes || [];
  const performanceTrend = statsResponse?.performanceTrend || [];

  const chartData = useMemo(() => {
    if (!performanceTrend.length) return null;
    const labels = performanceTrend.map((item, idx) => `#${idx + 1}`);
    const data = performanceTrend.map((item) => Number(item?.percentage || 0));
    return { labels, data };
  }, [performanceTrend]);

  const insights = useMemo(() => {
    const result = [];
    if (totalQuizzes === 0) {
      result.push(t('analytics:noActivity') || 'No quiz activity yet. Take a quiz to see insights here!');
      return result;
    }
    result.push(
      `${t('analytics:attempts') || 'Quizzes Attempted'}: ${totalQuizzes}`,
      `${t('analytics:avgScore') || 'Average Score'}: ${avgScore.toFixed(1)}%`,
    );
    if (passRate) {
      result.push(`${t('analytics:passRate') || 'Pass Rate'}: ${passRate.toFixed(0)}%`);
    }
    if (avgTimePerQuiz) {
      result.push(`${t('analytics:averageTime') || 'Average Time'}: ${formatDuration(avgTimePerQuiz)}`);
    }
    return result;
  }, [totalQuizzes, avgScore, passRate, avgTimePerQuiz, t]);

  const summaryCards = [
    {
      key: 'quizzes',
      title: t('analytics:attempts') || 'Quizzes Attempted',
      value: totalQuizzes,
      icon: 'layers-outline',
      gradient: ['#38bdf8', '#2563eb'],
    },
    {
      key: 'score',
      title: t('analytics:avgScore') || 'Average Score',
      value: avgScore,
      formatter: (v) => `${Math.round(v)}%`,
      icon: 'sparkles-outline',
      gradient: ['#34d399', '#059669'],
    },
    {
      key: 'time',
      title: t('analytics:averageTime') || 'Avg. Time / Quiz',
      value: avgTimePerQuiz,
      formatter: (v) => formatDuration(v),
      icon: 'time-outline',
      gradient: ['#f97316', '#ea580c'],
    },
    {
      key: 'points',
      title: t('analytics:totalPoints') || 'Total Points',
      value: userPoints,
      icon: 'trophy-outline',
      gradient: ['#fbbf24', '#f59e0b'],
    },
  ];

  const content = (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={isDark ? ['#312e81', '#1e1b4b'] : ['#4f46e5', '#7c3aed']}
        style={styles.heroCard}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroBadge}>
            <Ionicons name="stats-chart-outline" size={22} color="#F9FAFB" />
          </View>
          <Text style={styles.heroTitle}>{t('analytics:stats') || 'Your Learning Pulse'}</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          {totalQuizzes
            ? t('analytics:statsTagline') || 'Here’s a snapshot of how you’ve been performing lately.'
            : t('analytics:statsEmptyTagline') || 'Start a quiz to begin tracking your progress.'}
        </Text>

        <View style={styles.heroProgressRow}>
          <View style={styles.heroProgressItem}>
            <Text style={styles.heroLabel}>{t('analytics:avgScore') || 'Average Score'}</Text>
            <AnimatedNumber
              value={avgScoreClamped}
              formatter={(v) => `${v.toFixed(1)}%`}
              textStyle={styles.heroMetric}
            />
            <ProgressBar value={avgScoreClamped} color="#FBBF24" />
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroProgressItem}>
            <Text style={styles.heroLabel}>{t('analytics:passRate') || 'Pass Rate'}</Text>
            <AnimatedNumber
              value={passRate}
              formatter={(v) => `${Math.min(100, Math.max(0, v)).toFixed(0)}%`}
              textStyle={styles.heroMetric}
            />
            <ProgressBar value={passRate} color="#34D399" />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <LinearGradient key={card.key} colors={card.gradient} style={styles.summaryCard}>
            <View style={styles.summaryIconWrapper}>
              <Ionicons name={card.icon} size={20} color="rgba(249, 250, 251, 0.85)" />
            </View>
            <Text style={styles.summaryLabel}>{card.title}</Text>
            <AnimatedNumber
              value={card.value}
              formatter={card.formatter}
              textStyle={styles.summaryValue}
            />
          </LinearGradient>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('analytics:performanceTrend') || 'Performance Trend'}</Text>
          <View style={styles.sectionChip}>
            <Ionicons name="trending-up-outline" size={16} color="#4F46E5" />
            <Text style={styles.sectionChipText}>{performanceTrend.length || 0} {t('analytics:recent') || 'recent'}</Text>
          </View>
        </View>
        {chartData ? (
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  data: chartData.data,
                  color: () => '#4F46E5',
                  strokeWidth: 3,
                },
              ],
            }}
            width={width - 48}
            height={220}
            yAxisSuffix="%"
            withDots
            withShadow
            bezier
            chartConfig={{
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#4F46E5',
              },
            }}
            style={styles.chartStyle}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{t('analytics:noTrendTitle') || 'No activity yet'}</Text>
            <Text style={styles.emptyDescription}>
              {t('analytics:noTrendDescription') || 'Complete a few quizzes to unlock your performance timeline.'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('analytics:insights') || 'Smart hints for you'}</Text>
          <Ionicons name="bulb-outline" size={18} color="#FBBF24" />
        </View>
        {insights.map((insight, idx) => (
          <View key={`${insight}-${idx}`} style={styles.insightRow}>
            <View style={styles.insightBullet} />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('analytics:recentQuizzes') || 'Recent quizzes'}</Text>
          <View style={styles.sectionChip}>
            <Ionicons name="flash-outline" size={16} color="#4F46E5" />
            <Text style={styles.sectionChipText}>{recentQuizzes.length} {t('analytics:logged') || 'logged'}</Text>
          </View>
        </View>
        {recentQuizzes.length ? (
          recentQuizzes.map((entry) => {
            const quiz = entry.quiz || {};
            const score = entry.percentage || entry.score || 0;
            const completedAt = entry.completedAt ? new Date(entry.completedAt) : null;
            const completedLabel = completedAt
              ? completedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : t('common:unknown') || 'Unknown';
            const onPress = () => {
              if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('QuizDetail', { id: quiz?._id || quiz?.id });
              }
            };
            return (
              <TouchableOpacity
                key={entry._id || `${quiz?._id}-${completedAt}`}
                style={styles.recentCard}
                onPress={onPress}
                disabled={!quiz?._id}
                activeOpacity={0.85}
              >
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {quiz?.title || t('analytics:unknownQuiz') || 'Untitled quiz'}
                  </Text>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>{Math.round(score)}%</Text>
                  </View>
                </View>
                <View style={styles.recentMeta}>
                  <Text style={styles.recentMetaText}>
                    <Ionicons name="albums-outline" size={14} color="#9CA3AF" />{' '}
                    {quiz?.category || t('analytics:uncategorised') || 'General'}
                  </Text>
                  <Text style={styles.recentMetaText}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" /> {completedLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{t('analytics:noRecentTitle') || 'Nothing to show yet'}</Text>
            <Text style={styles.emptyDescription}>
              {t('analytics:noRecentDescription') || 'Your latest quiz attempts will appear here once you get started.'}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#F3F4F6' }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingLabel}>{t('analytics:loadingStats') || 'Loading your analytics...'}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
              <Text style={styles.errorTitle}>{t('analytics:failedStatsTitle') || 'Could not load stats'}</Text>
              <Text style={styles.errorDescription}>
                {error || t('analytics:failedStatsDescription') || 'Please try again in a moment.'}
              </Text>
              <TouchableOpacity style={{marginTop: 8}} onPress={() => { setLoading(true); setError(null); analyticsAPI.getMyStats().then(res => { setStatsResponse(res?.data?.data || {}); }).catch(e => { setError(e?.message || 'Failed to load'); }).finally(() => setLoading(false)); }}>
                <Text style={{color:'#4F46E5', fontWeight:'700'}}>{t('common:retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            content
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingLabel: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  contentContainer: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.4,
  },
  heroSubtitle: {
    color: 'rgba(249, 250, 251, 0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  heroProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  heroProgressItem: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(249, 250, 251, 0.85)',
    marginBottom: 6,
  },
  heroMetric: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 12,
  },
  heroDivider: {
    width: 1,
    height: '75%',
    backgroundColor: 'rgba(249, 250, 251, 0.16)',
    alignSelf: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 16 * 2 - 12) / 2,
    borderRadius: 16,
    padding: 16,
  },
  summaryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: 'rgba(249, 250, 251, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  sectionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  chartStyle: {
    borderRadius: 16,
    marginLeft: -12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    marginTop: 7,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  progressWrapper: {
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 250, 251, 0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(249, 250, 251, 0.75)',
  },
  recentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    paddingRight: 12,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  recentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  recentMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorDescription: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
  },
});
