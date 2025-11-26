import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { quizAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [quizzes, setQuizzes] = useState([]);
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();

  // Floating Action shortcut by role
  const Fab = () => (
    <TouchableOpacity style={styles.fab} onPress={() => {
      if (user?.role === 'admin') navigation.navigate('AdminDashboard');
      else if (user?.role === 'teacher') navigation.navigate('TeacherDashboard');
      else navigation.navigate('Upload');
    }}>
      <Text style={styles.fabText}>{user?.role === 'admin' ? '⚙️' : user?.role === 'teacher' ? '📘' : '➕'}</Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await quizAPI.getAll({ page: 1, limit: 20 });
      const fromDataData = response?.data?.data?.quizzes;
      const fromData = response?.data?.quizzes;
      const safeQuizzes = Array.isArray(fromDataData)
        ? fromDataData
        : Array.isArray(fromData)
        ? fromData
        : [];
      setQuizzes(safeQuizzes);
    } catch (error) {
      console.log('Error loading quizzes:', error?.message || error);
      setQuizzes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuizzes();
  };

  const QuizCard = ({ quiz, index }) => {
    const scaleAnim = new Animated.Value(0);

    React.useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, []);

    const gradients = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
    ];

    const gradient = gradients[index % gradients.length];

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('QuizDetail', { id: quiz._id })}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={gradient}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Category Badge */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{quiz.category || t('home:general')}</Text>
            </View>

            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {quiz.title}
            </Text>

            {/* Description */}
            <Text style={styles.cardDescription} numberOfLines={2}>
              {quiz.description || t('home:testYourKnowledge')}
            </Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>📝</Text>
                <Text style={styles.statText}>{quiz.questions?.length || 0} {t('home:questions')}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>👁️</Text>
                <Text style={styles.statText}>{quiz.viewCount || 0} {t('home:views')}</Text>
              </View>
            </View>

            {/* Difficulty */}
            <View style={[
              styles.difficulty, 
              quiz.difficulty === 'easy' && styles.difficultyEasy,
              quiz.difficulty === 'medium' && styles.difficultyMedium,
              quiz.difficulty === 'hard' && styles.difficultyHard,
            ]}>
              <Text style={styles.difficultyText}>
                {quiz.difficulty || t('home:difficultyMixed')}
              </Text>
              </View>
              {/* Start Quiz CTA */}
              <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('TakeQuiz', { id: quiz._id })}>
                <Text style={styles.startText}>{t('quiz:start')}</Text>
              </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      {/* Header */}
      <LinearGradient colors={ theme === 'light' ? ['#667eea', '#764ba2'] : ['#222','#555']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{t('home:hello')} {user?.name || 'Guest'}! 👋</Text>
            <Text style={styles.headerSubtitle}>{t('home:ready')}</Text>
          </View>
          {user && (
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsIcon}>⭐</Text>
              <Text style={styles.pointsText}>{user.points || 0}</Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        {user && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statCardNumber}>{user.usage?.quizzesGenerated || 0}</Text>
              <Text style={styles.statCardLabel}>{t('home:created')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardNumber}>{user.usage?.quizzesTaken || 0}</Text>
              <Text style={styles.statCardLabel}>{t('home:completed')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <Text style={styles.statCardNumber}>🏆</Text>
              <Text style={styles.statCardLabel}>{t('home:rank')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Quiz List */}
      <View style={styles.listContainer}>
        <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#111827' : '#FFF' }]}>{t('home:exploreQuizzes')}</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('common:loading')}</Text>
          </View>
        ) : !Array.isArray(quizzes) || quizzes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={[styles.emptyTitle, { color: theme === 'light' ? '#111827' : '#FFF' }]}>{t('home:noQuizzesTitle')}</Text>
            <Text style={[styles.emptyText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('home:noQuizzesText')}</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('Upload')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>{t('home:createQuiz')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={Array.isArray(quizzes) ? quizzes : []}
            renderItem={({ item, index }) => <QuizCard quiz={item} index={index} />}
            keyExtractor={(item, idx) => (item?._id ? String(item._id) : String(idx))}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <Fab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 4,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  difficulty: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  difficultyEasy: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  difficultyMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  difficultyHard: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  startBtn: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  startText: { color: '#FFF', fontWeight: '700' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  fab: { position:'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor:'#4F46E5', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{ width:0, height:4 }, shadowOpacity:0.2, shadowRadius:8, elevation:6 },
  fabText: { color:'#FFF', fontSize: 22 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
