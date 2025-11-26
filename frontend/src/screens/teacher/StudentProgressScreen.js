
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { classesAPI, analyticsAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';

const formatPercent = (value) => {
  if (!Number.isFinite(value)) {
    return '--%';
  }
  return `${Math.round(value)}%`;
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return Number(value).toLocaleString();
};

const buildInitials = (value) => {
  if (typeof value !== 'string') {
    return '?';
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
};

export default function StudentProgressScreen({ navigation }) {
  const { theme } = useTheme();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const palette = useMemo(() => ({
    background: theme === 'light' ? '#F8FAFC' : '#020817',
    surface: theme === 'light' ? '#FFFFFF' : '#0F172A',
    border: theme === 'light' ? '#E2E8F0' : '#1F2937',
    textPrimary: theme === 'light' ? '#0F172A' : '#F8FAFC',
    textSecondary: theme === 'light' ? '#64748B' : '#94A3B8',
  }), [theme]);

  const selectedClass = useMemo(() => classes.find((item) => item._id === selectedClassId) || null, [classes, selectedClassId]);

  const fetchLeaderboard = useCallback(async (classId) => {
    if (!classId) {
      setLeaderboard([]);
      return;
    }
    setLoadingClass(true);
    try {
      const response = await analyticsAPI.getClassLeaderboard(classId);
      setLeaderboard(response?.data?.data?.leaderboard || []);
    } catch (error) {
      setLeaderboard([]);
      Toast.error('Unable to load class performance');
    } finally {
      setLoadingClass(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await classesAPI.mine();
      const classList = response?.data?.data?.classes || [];
      setClasses(classList);
      if (classList.length) {
        const initialId = classList[0]._id;
        setSelectedClassId(initialId);
        await fetchLeaderboard(initialId);
      } else {
        setSelectedClassId(null);
        setLeaderboard([]);
      }
    } catch (error) {
      Toast.error('Unable to load teacher classes');
      setClasses([]);
      setSelectedClassId(null);
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchLeaderboard]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClasses();
  }, [loadClasses]);

  const handleSelectClass = useCallback((classId) => {
    if (!classId || classId === selectedClassId) {
      return;
    }
    setSelectedClassId(classId);
    fetchLeaderboard(classId);
  }, [selectedClassId, fetchLeaderboard]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) {
      return leaderboard;
    }
    const query = searchQuery.trim().toLowerCase();
    return leaderboard.filter((entry) => {
      const name = (entry.name || '').toLowerCase();
      const email = (entry.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [leaderboard, searchQuery]);

  const averageScore = useMemo(() => {
    if (!leaderboard.length) {
      return null;
    }
    const total = leaderboard.reduce((sum, entry) => sum + (entry.averageScore || 0), 0);
    return total / leaderboard.length;
  }, [leaderboard]);

  const averageAccuracy = useMemo(() => {
    if (!leaderboard.length) {
      return null;
    }
    const total = leaderboard.reduce((sum, entry) => sum + (entry.accuracy || 0), 0);
    return total / leaderboard.length;
  }, [leaderboard]);

  const totalAttempts = useMemo(() => (
    leaderboard.reduce((sum, entry) => sum + (entry.quizzesTaken || 0), 0)
  ), [leaderboard]);

  const topPerformers = useMemo(() => (
    leaderboard
      .slice()
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
      .slice(0, 3)
  ), [leaderboard]);

  const needsSupport = useMemo(() => (
    leaderboard.filter((entry) => (entry.averageScore || 0) < 60).slice(0, 3)
  ), [leaderboard]);

  const studentsWithoutAttempts = useMemo(() => {
    const roster = Array.isArray(selectedClass?.students) ? selectedClass.students : [];
    const attemptIds = new Set(leaderboard.map((entry) => String(entry.userId)));
    return roster.filter((student) => !attemptIds.has(String(student._id)));
  }, [selectedClass, leaderboard]);

  const heroSubtitle = selectedClass ? `${formatNumber(selectedClass.students?.length || 0)} students` : 'Select a class';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}> 
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading student progress...</Text>
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
            <Text style={styles.heroTitle} numberOfLines={1}>{selectedClass?.name || 'Student progress'}</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Gradebook')}>
            <Ionicons name="grid" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.classSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {classes.map((classItem) => (
              <TouchableOpacity
                key={classItem._id}
                style={[
                  styles.classChip,
                  {
                    backgroundColor: classItem._id === selectedClassId ? '#4F46E5' : 'transparent',
                    borderColor: classItem._id === selectedClassId ? '#4F46E5' : palette.border,
                  },
                ]}
                onPress={() => handleSelectClass(classItem._id)}
              >
                <Text style={[
                  styles.classChipText,
                  { color: classItem._id === selectedClassId ? '#FFFFFF' : palette.textPrimary },
                ]}>
                  {classItem.name}
                </Text>
              </TouchableOpacity>
            ))}
            {!classes.length ? (
              <View style={[styles.classChip, { borderColor: palette.border }]}> 
                <Text style={[styles.classChipText, { color: palette.textSecondary }]}>No classes found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="stats-chart" size={20} color="#6366F1" />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatPercent(averageScore)}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Average score</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="speedometer" size={20} color="#F59E0B" />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatPercent(averageAccuracy)}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Average accuracy</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="ribbon" size={20} color="#0EA5E9" />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatNumber(totalAttempts)}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Assessments submitted</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="people" size={20} color="#10B981" />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatNumber(filteredLeaderboard.length)}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Students in view</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <Ionicons name="search" size={18} color={palette.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: palette.textPrimary }]}
            placeholder="Search learners"
            placeholderTextColor={palette.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loadingClass ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Updating class metrics...</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Top performers</Text>
            <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{topPerformers.length}</Text>
          </View>
          {topPerformers.length ? (
            topPerformers.map((entry) => (
              <View key={entry.userId || entry.email} style={[styles.highlightCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
                <View style={styles.highlightAvatar}>
                  <Text style={styles.highlightAvatarText}>{buildInitials(entry.name || entry.email)}</Text>
                </View>
                <View style={styles.highlightInfo}>
                  <Text style={[styles.highlightName, { color: palette.textPrimary }]} numberOfLines={1}>{entry.name || 'Student'}</Text>
                  <Text style={[styles.highlightMeta, { color: palette.textSecondary }]} numberOfLines={1}>{entry.email || 'No email'}</Text>
                </View>
                <View style={styles.highlightStats}>
                  <Text style={styles.highlightScore}>{formatPercent(entry.averageScore)}</Text>
                  <Text style={[styles.highlightLabel, { color: palette.textSecondary }]}>Avg score</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}> 
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No attempts yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Needs support</Text>
            <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{needsSupport.length}</Text>
          </View>
          {needsSupport.length ? (
            needsSupport.map((entry) => (
              <View key={entry.userId || entry.email} style={[styles.supportCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
                <View style={styles.supportInfo}>
                  <Text style={[styles.supportName, { color: palette.textPrimary }]} numberOfLines={1}>{entry.name || 'Student'}</Text>
                  <Text style={[styles.supportMeta, { color: palette.textSecondary }]} numberOfLines={1}>{entry.email || 'No email'}</Text>
                </View>
                <View style={styles.supportBadge}>
                  <Text style={styles.supportBadgeText}>{formatPercent(entry.averageScore)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}> 
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No students flagged</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>All students</Text>
            <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{filteredLeaderboard.length}</Text>
          </View>
          {filteredLeaderboard.length ? (
            filteredLeaderboard.map((entry) => (
              <View key={entry.userId || entry.email} style={[styles.studentRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.studentBadge}>
                  <Text style={styles.studentBadgeText}>{buildInitials(entry.name || entry.email)}</Text>
                </View>
                <View style={styles.studentSummary}>
                  <Text style={[styles.studentSummaryName, { color: palette.textPrimary }]} numberOfLines={1}>{entry.name || 'Student'}</Text>
                  <Text style={[styles.studentSummaryMeta, { color: palette.textSecondary }]} numberOfLines={1}>{entry.email || 'No email'}</Text>
                </View>
                <View style={styles.studentMetric}>
                  <Text style={styles.studentMetricValue}>{formatPercent(entry.averageScore)}</Text>
                  <Text style={[styles.studentMetricLabel, { color: palette.textSecondary }]}>Score</Text>
                </View>
                <View style={styles.studentMetric}>
                  <Text style={styles.studentMetricValue}>{formatNumber(entry.quizzesTaken)}</Text>
                  <Text style={[styles.studentMetricLabel, { color: palette.textSecondary }]}>Quizzes</Text>
                </View>
                <View style={styles.studentMetric}>
                  <Text style={styles.studentMetricValue}>{formatPercent(entry.accuracy)}</Text>
                  <Text style={[styles.studentMetricLabel, { color: palette.textSecondary }]}>Accuracy</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No matching students</Text>
            </View>
          )}
        </View>

        {studentsWithoutAttempts.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Waiting to start</Text>
              <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{studentsWithoutAttempts.length}</Text>
            </View>
            {studentsWithoutAttempts.map((student) => (
              <View key={student._id || student.email} style={[styles.supportCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.supportInfo}>
                  <Text style={[styles.supportName, { color: palette.textPrimary }]} numberOfLines={1}>{student.name || 'Student'}</Text>
                  <Text style={[styles.supportMeta, { color: palette.textSecondary }]} numberOfLines={1}>{student.email || 'No email'}</Text>
                </View>
                <View style={styles.supportBadge}>
                  <Text style={styles.supportBadgeText}>No attempts</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
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
    marginHorizontal: 12,
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
  classSelector: {
    marginTop: 24,
  },
  classChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
  classChipText: {
    fontSize: 14,
    fontWeight: '600',
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
    gap: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
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
  },
  highlightCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  highlightAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  highlightInfo: {
    flex: 1,
  },
  highlightName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  highlightMeta: {
    fontSize: 13,
  },
  highlightStats: {
    alignItems: 'flex-end',
  },
  highlightScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  highlightLabel: {
    fontSize: 12,
  },
  supportCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportInfo: {
    flex: 1,
    marginRight: 12,
  },
  supportName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  supportMeta: {
    fontSize: 13,
  },
  supportBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },
  supportBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  studentRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentBadgeText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  studentSummary: {
    flex: 1,
  },
  studentSummaryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  studentSummaryMeta: {
    fontSize: 12,
  },
  studentMetric: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  studentMetricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  studentMetricLabel: {
    fontSize: 11,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});



