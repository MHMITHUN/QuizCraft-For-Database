import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

export default function HistoryScreen({ navigation }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all'); // all, passed, failed
  const [stats, setStats] = useState(null);
  const pulse = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const { theme } = useTheme();

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for skeleton
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true })
      ])
    ).start();

    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async (pageNum = 1, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
      setHasMore(true);
    } else if (pageNum > 1) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await analyticsAPI.getMyHistory(pageNum, 10);
      const newItems = res?.data?.data?.history || [];
      
      if (isRefresh || pageNum === 1) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      
      setHasMore(newItems.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Load history error:', error);
      Alert.alert('Error', 'Failed to load quiz history');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await analyticsAPI.getStats();
      setStats(res?.data?.data?.stats);
    } catch (error) {
      console.warn('Failed to load stats:', error);
    }
  };

  const onRefresh = () => {
    loadHistory(1, true);
    loadStats();
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadHistory(page + 1);
    }
  };

  const getGradeInfo = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: '#10B981', emoji: '🏆' };
    if (percentage >= 80) return { grade: 'A', color: '#059669', emoji: '🌟' };
    if (percentage >= 70) return { grade: 'B+', color: '#3B82F6', emoji: '👍' };
    if (percentage >= 60) return { grade: 'B', color: '#6366F1', emoji: '👌' };
    if (percentage >= 50) return { grade: 'C', color: '#F59E0B', emoji: '😐' };
    return { grade: 'F', color: '#EF4444', emoji: '😔' };
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'passed') return item.percentage >= 60;
    if (filter === 'failed') return item.percentage < 60;
    return true;
  });

  const Skeleton = () => (
    <Animated.View style={[styles.skeleton, { opacity: pulse }]} />
  );

  const renderFilterButton = (filterType, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' },
        filter === filterType && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterType)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterButtonText,
        { color: theme === 'light' ? '#6B7280' : '#9CA3AF' },
        filter === filterType && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item, index }) => {
    const gradeInfo = getGradeInfo(item.percentage || 0);
    const createdDate = new Date(item.createdAt);
    const isRecent = (Date.now() - createdDate.getTime()) < 24 * 60 * 60 * 1000; // Within 24 hours

    return (
      <Animated.View
        style={[
          styles.historyCard,
          { 
            backgroundColor: theme === 'light' ? 'white' : '#1e1e1e',
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.historyCardContent}
          onPress={() => navigation.navigate('QuizResult', { historyId: item._id })}
          activeOpacity={0.8}
        >
          <View style={styles.historyCardHeader}>
            <View style={styles.quizInfo}>
              <Text style={[styles.quizTitle, { color: theme === 'light' ? '#111827' : 'white' }]} numberOfLines={2}>
                {item?.quiz?.title || 'Quiz'}
              </Text>
              <Text style={[styles.quizCategory, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                {item?.quiz?.category || 'General'}
              </Text>
            </View>
            
            <View style={styles.gradeContainer}>
              <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
                <Text style={styles.gradeEmoji}>{gradeInfo.emoji}</Text>
                <Text style={styles.gradeText}>{gradeInfo.grade}</Text>
              </View>
              <Text style={[styles.percentageText, { color: theme === 'light' ? '#111827' : 'white' }]}>
                {Math.round(item.percentage || 0)}%
              </Text>
            </View>
          </View>

          <View style={styles.historyCardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={[styles.metaText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="help-circle-outline" size={16} color="#6B7280" />
              <Text style={[styles.metaText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                {item.totalQuestions || 0} questions
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={[styles.metaText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                {item.correctAnswers || 0} correct
              </Text>
            </View>
            
            {isRecent && (
              <View style={styles.recentBadge}>
                <Text style={styles.recentText}>New</Text>
              </View>
            )}
          </View>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
              <View 
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(item.percentage || 0, 100)}%`,
                    backgroundColor: gradeInfo.color
                  }
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.retakeButton, { backgroundColor: theme === 'light' ? '#EEF2FF' : '#4F46E520' }]}
          onPress={() => navigation.navigate('TakeQuiz', { id: item.quiz?._id })}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color="#4F46E5" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📈</Text>
      <Text style={[styles.emptyTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>No quiz history yet</Text>
      <Text style={[styles.emptyText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
        Take your first quiz to see your progress and results here
      </Text>
      <TouchableOpacity 
        style={styles.exploreButton}
        onPress={() => navigation.navigate('Home')}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.exploreButtonGradient}>
          <Text style={styles.exploreButtonText}>Explore Quizzes</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
      {/* Header */}
      <LinearGradient colors={theme === 'light' ? ['#4F46E5', '#7C3AED'] : ['#222','#555']} style={styles.header}>
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.headerTitle}>📈 Quiz History</Text>
          <Text style={styles.headerSubtitle}>Track your learning progress</Text>
          
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalQuizzes || 0}</Text>
                <Text style={styles.statLabel}>Taken</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{Math.round(stats.averageScore || 0)}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.passedQuizzes || 0}</Text>
                <Text style={styles.statLabel}>Passed</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
        <View style={styles.filterButtons}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('passed', 'Passed')}
          {renderFilterButton('failed', 'Failed')}
        </View>
        
        <Text style={[styles.filterCount, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
          {filteredItems.length} {filteredItems.length === 1 ? 'quiz' : 'quizzes'}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} />)}
        </View>
      ) : filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderLoadingFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }
    }),
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  filterCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
  },
  skeleton: {
    height: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exploreButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }
    }),
    position: 'relative',
  },
  historyCardContent: {
    padding: 20,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  quizInfo: {
    flex: 1,
    marginRight: 16,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  quizCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  gradeContainer: {
    alignItems: 'center',
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
    gap: 4,
  },
  gradeEmoji: {
    fontSize: 16,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  historyCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  retakeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
