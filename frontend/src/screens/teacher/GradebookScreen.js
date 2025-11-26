
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
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { classesAPI, analyticsAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';

const formatPercent = (value) => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return `${Math.round(value)}%`;
};

const formatNumber = (value) => {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString();
};
export default function GradebookScreen({ navigation }) {
  const { theme } = useTheme();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classDetail, setClassDetail] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = theme === 'light';
  const palette = useMemo(() => ({
    background: isLight ? '#F8FAFC' : '#020817',
    surface: isLight ? '#FFFFFF' : '#10172A',
    border: isLight ? '#E2E8F0' : '#1F2937',
    muted: isLight ? '#64748B' : '#94A3B8',
    strong: isLight ? '#0F172A' : '#F8FAFC',
  }), [isLight]);

  const fetchClassData = useCallback(async (classId) => {
    setLoadingClass(true);
    try {
      const [detailRes, leaderboardRes] = await Promise.allSettled([
        classesAPI.getById(classId),
        analyticsAPI.getClassLeaderboard(classId),
      ]);

      if (detailRes.status === 'fulfilled') {
        setClassDetail(detailRes.value?.data?.data?.class || null);
      } else {
        setClassDetail(null);
      }

      if (leaderboardRes.status === 'fulfilled') {
        setLeaderboard(leaderboardRes.value?.data?.data?.leaderboard || []);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      Toast.error('Failed to load class analytics');
      setLeaderboard([]);
    } finally {
      setLoadingClass(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await classesAPI.mine();
      const classesData = response?.data?.data?.classes || [];
      setClasses(classesData);

      if (classesData.length) {
        const firstId = classesData[0]._id;
        setSelectedClassId(firstId);
        await fetchClassData(firstId);
      } else {
        setSelectedClassId(null);
        setClassDetail(null);
        setLeaderboard([]);
      }
    } catch (error) {
      Toast.error('Failed to load gradebook');
      setClasses([]);
      setClassDetail(null);
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchClassData]);

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
    fetchClassData(classId);
  }, [selectedClassId, fetchClassData]);

  const handleCopyCode = useCallback(async () => {
    if (!classDetail?.code) {
      return;
    }
    try {
      await Clipboard.setStringAsync(classDetail.code);
      Toast.success('Class code copied');
    } catch (error) {
      Toast.error('Unable to copy code');
    }
  }, [classDetail]);

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

  const totalAssessments = useMemo(() => (
    leaderboard.reduce((sum, entry) => sum + (entry.quizzesTaken || 0), 0)
  ), [leaderboard]);

  const averageAccuracy = useMemo(() => {
    if (!leaderboard.length) {
      return null;
    }
    const total = leaderboard.reduce((sum, entry) => sum + (entry.accuracy || 0), 0);
    return total / leaderboard.length;
  }, [leaderboard]);

  const studentsWithoutAttempts = useMemo(() => {
    if (!classDetail?.students?.length) {
      return [];
    }
    const attemptedIds = new Set((leaderboard || []).map((entry) => String(entry.userId)));
    return classDetail.students.filter((student) => !attemptedIds.has(String(student._id)));
  }, [classDetail, leaderboard]);

  const classStudentCount = classDetail?.students?.length || 0;
  const className = classDetail?.name || 'Select a class';
  const isInitialLoading = loading && !refreshing;

  const summaryCards = [
    {
      key: 'students',
      title: 'Students enrolled',
      value: formatNumber(classStudentCount),
      icon: 'people',
      color: '#4F46E5',
    },
    {
      key: 'avgScore',
      title: 'Average score',
      value: formatPercent(averageScore),
      icon: 'stats-chart',
      color: '#0EA5E9',
    },
    {
      key: 'assessments',
      title: 'Assessments completed',
      value: formatNumber(totalAssessments),
      icon: 'ribbon',
      color: '#F59E0B',
    },
    {
      key: 'accuracy',
      title: 'Average accuracy',
      value: formatPercent(averageAccuracy),
      icon: 'speedometer',
      color: '#10B981',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}> 
      <LinearGradient colors={isLight ? ['#312E81', '#5B21B6'] : ['#0F172A', '#1E1B4B']} style={styles.hero}>
        <View style={styles.heroHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroTitle}>{className}</Text>
            <Text style={styles.heroSubtitle}>Track progress, celebrate wins, and spot who needs help.</Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode} disabled={!classDetail?.code}>
            <Ionicons name="copy" size={18} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>{classDetail?.code || '----'}</Text>
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
            {classes.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[
                  styles.classChip,
                  { backgroundColor: item._id === selectedClassId ? '#4F46E5' : 'transparent', borderColor: palette.border },
                ]}
                onPress={() => handleSelectClass(item._id)}
              >
                <Text style={[styles.classChipText, { color: item._id === selectedClassId ? '#FFFFFF' : palette.strong }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
            {!classes.length && !isInitialLoading ? (
              <View style={[styles.classChip, { borderColor: palette.border }]}> 
                <Text style={[styles.classChipText, { color: palette.muted }]}>No classes yet</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.key} style={[styles.summaryCard, { borderColor: palette.border }]}> 
              <View style={[styles.summaryIcon, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.summaryValue, { color: palette.strong }]}>{card.value}</Text>
              <Text style={[styles.summaryLabel, { color: palette.muted }]}>{card.title}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search students"
            placeholderTextColor={palette.muted}
            style={[styles.searchInput, { color: palette.strong }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {isInitialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={[styles.loadingText, { color: palette.muted }]}>Loading gradebook...</Text>
          </View>
        ) : null}

        {!!loadingClass && !isInitialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={[styles.loadingText, { color: palette.muted }]}>Updating class data...</Text>
          </View>
        ) : null}

        {filteredLeaderboard.length ? (
          <View style={styles.leaderboard}>
            {filteredLeaderboard.map((entry) => {
              const initials = (entry.name || entry.email || '?')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('');
              return (
                <View
                  key={entry.userId || entry.email || entry.name}
                  style={[styles.studentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={styles.studentHeader}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{initials || '?'}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: palette.strong }]} numberOfLines={1}>
                        {entry.name || 'Student'}
                      </Text>
                      <Text style={[styles.studentEmail, { color: palette.muted }]} numberOfLines={1}>
                        {entry.email || 'No email on file'}
                      </Text>
                    </View>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>{formatPercent(entry.averageScore)}</Text>
                    </View>
                  </View>

                  <View style={styles.studentStatsRow}>
                    <View style={styles.studentStat}>
                      <Text style={[styles.studentStatLabel, { color: palette.muted }]}>Points</Text>
                      <Text style={[styles.studentStatValue, { color: palette.strong }]}>{formatNumber(entry.totalPoints)}</Text>
                    </View>
                    <View style={styles.studentStat}>
                      <Text style={[styles.studentStatLabel, { color: palette.muted }]}>Quizzes</Text>
                      <Text style={[styles.studentStatValue, { color: palette.strong }]}>{entry.quizzesTaken || 0}</Text>
                    </View>
                    <View style={styles.studentStat}>
                      <Text style={[styles.studentStatLabel, { color: palette.muted }]}>Accuracy</Text>
                      <Text style={[styles.studentStatValue, { color: palette.strong }]}>{formatPercent(entry.accuracy)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="school-outline" size={28} color="#6366F1" />
            <Text style={[styles.emptyTitle, { color: palette.strong }]}>No submissions yet</Text>
            <Text style={[styles.emptySubtitle, { color: palette.muted }]}>Once students start attempting quizzes, their performance will appear here.</Text>
          </View>
        )}

        {studentsWithoutAttempts.length ? (
          <View style={styles.pendingSection}>
            <Text style={[styles.pendingTitle, { color: palette.strong }]}>Haven't started</Text>
            <Text style={[styles.pendingSubtitle, { color: palette.muted }]}>Students yet to attempt an assigned quiz.</Text>
            {studentsWithoutAttempts.map((student) => (
              <View key={student._id || student.email} style={[styles.pendingStudent, { borderColor: palette.border }]}> 
                <Ionicons name="person-circle" size={22} color={palette.muted} />
                <View style={styles.pendingInfo}>
                  <Text style={[styles.pendingName, { color: palette.strong }]}>{student.name || 'Student'}</Text>
                  <Text style={[styles.pendingEmail, { color: palette.muted }]} numberOfLines={1}>{student.email || 'No email on file'}</Text>
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
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 90,
    justifyContent: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  classSelector: {
    marginBottom: 20,
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
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
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
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  leaderboard: {
    gap: 16,
    marginBottom: 32,
  },
  studentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    color: '#4F46E5',
    fontSize: 18,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 13,
  },
  scoreBadge: {
    backgroundColor: 'rgba(79,70,229,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  scoreBadgeText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  studentStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  studentStat: {
    flex: 1,
    alignItems: 'center',
  },
  studentStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  studentStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingSection: {
    marginBottom: 32,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  pendingSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  pendingStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingEmail: {
    fontSize: 12,
  },
});
