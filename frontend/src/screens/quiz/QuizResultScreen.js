import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { historyAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

const { width: screenWidth } = Dimensions.get('window');

export default function QuizResultScreen({ route, navigation }) {
  const { historyId } = route.params || {};
  const { t } = useI18n();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExplanations, setShowExplanations] = useState(false);
  const [explanationsUnlockAt, setExplanationsUnlockAt] = useState(null); // timestamp (ms) when explanations unlock
  const [unlockCountdown, setUnlockCountdown] = useState(null); // remaining seconds until unlock
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [progressAnim] = useState(new Animated.Value(0));
  const { theme } = useTheme();

  useEffect(() => {
    loadResults();
  }, [historyId]);

  useEffect(() => {
    if (result) {
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: result.percentage / 100,
          duration: 1500,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [result]);

  // Countdown until explanations become available (if locked)
  useEffect(() => {
    if (!explanationsUnlockAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((explanationsUnlockAt - Date.now()) / 1000));
      setUnlockCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setExplanationsUnlockAt(null);
        setShowExplanations(true); // Auto-show once unlocked
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [explanationsUnlockAt]);

  const loadResults = async () => {
    if (!historyId) {
      Alert.alert('Error', 'No quiz result found');
      navigation.goBack();
      return;
    }

    try {
      const res = await historyAPI.getById(historyId);
      const historyData = res?.data?.data?.history;

      if (!historyData) {
        throw new Error('No result data found');
      }

      // Transform the answers array to match the expected format
      // Backend stores answers as [{questionId, userAnswer, isCorrect, ...}]
      // Frontend expects answers as ["answer1", "answer2", ...]
      const userAnswersArray = historyData.answers?.map(ans => ans.userAnswer) || [];

      // Use the unlock time provided by the backend
      console.log('DEBUG - Quiz Data:', {
        quizTitle: historyData?.quiz?.title,
        timeLimit: historyData?.quiz?.timeLimit,
        timeTaken: historyData?.timeTaken,
        hasExplanationsUnlockAt: !!historyData.explanationsUnlockAt,
        explanationsUnlockAt: historyData.explanationsUnlockAt,
        completedAt: historyData.completedAt
      });

      if (historyData.explanationsUnlockAt) {
        const unlockAt = new Date(historyData.explanationsUnlockAt).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.round((unlockAt - now) / 1000));

        console.log('DEBUG - Timer Setup:', {
          unlockAt,
          now,
          remaining,
          willShowTimer: remaining > 0
        });

        if (remaining > 0) {
          setExplanationsUnlockAt(unlockAt);
          setUnlockCountdown(remaining);
          setShowExplanations(false);
          Alert.alert('✅ Timer Active!', `Explanations will unlock in ${Math.floor(remaining / 60)}m ${remaining % 60}s`);
        } else {
          Alert.alert('⚠️ Timer Expired', 'The unlock time has already passed. Explanations are available immediately.');
        }
      } else {
        Alert.alert(
          '❌ No Timer Data',
          `Quiz: ${historyData?.quiz?.title}\n\nTime Limit: ${historyData?.quiz?.timeLimit || 'None'}\nTime Taken: ${historyData?.timeTaken}s\n\nPossible reasons:\n1. Backend not restarted\n2. Old quiz result\n3. No time limit set\n4. Quiz completed after time limit`
        );
      }

      setResult({
        ...historyData,
        answers: userAnswersArray, // Convert to simple array format for rendering
        quiz: historyData.quiz,
        percentage: historyData.percentage,
        timeTaken: historyData.timeTaken,
        classId: historyData.classId, // Track classroom context for conditional retake
      });
    } catch (error) {
      console.error('Load results error:', error);
      Alert.alert('Error', 'Failed to load quiz results. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getGradeInfo = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: '#10B981', emoji: '🏆', message: 'Excellent!' };
    if (percentage >= 80) return { grade: 'A', color: '#059669', emoji: '🌟', message: 'Great Job!' };
    if (percentage >= 70) return { grade: 'B+', color: '#3B82F6', emoji: '👍', message: 'Good Work!' };
    if (percentage >= 60) return { grade: 'B', color: '#6366F1', emoji: '👌', message: 'Not Bad!' };
    if (percentage >= 50) return { grade: 'C', color: '#F59E0B', emoji: '😐', message: 'Keep Trying!' };
    return { grade: 'F', color: '#EF4444', emoji: '😔', message: 'Study More!' };
  };

  const formatCountdown = (seconds) => {
    if (seconds == null || seconds <= 0) return 'now';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const renderQuestionExplanation = (question, index) => {
    if (!question) return null;

    const userAnswer = result.answers[index];
    const correctOption = question.options?.find(opt => opt.isCorrect);
    const isCorrect = userAnswer === correctOption?.text;

    return (
      <View key={index} style={[styles.questionCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
        <View style={styles.questionHeader}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>{index + 1}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isCorrect ? '#10B981' : '#EF4444' }]}>
            <Ionicons
              name={isCorrect ? "checkmark" : "close"}
              size={16}
              color="white"
            />
            <Text style={styles.statusText}>
              {isCorrect ? 'Correct' : 'Wrong'}
            </Text>
          </View>
        </View>

        <Text style={[styles.questionText, { color: theme === 'light' ? '#111827' : 'white' }]}>{question.questionText}</Text>

        <View style={styles.answerSection}>
          <View style={[styles.answerBox, { borderColor: isCorrect ? '#10B981' : '#EF4444', backgroundColor: theme === 'light' ? '#FAFAFA' : '#272727' }]}>
            <Text style={[styles.answerLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Your Answer:</Text>
            <Text style={[styles.answerText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {userAnswer || 'Not answered'}
            </Text>
          </View>

          {!isCorrect && correctOption && (
            <View style={[styles.answerBox, { borderColor: '#10B981', backgroundColor: theme === 'light' ? '#F0FDF4' : '#10B98120' }]}>
              <Text style={[styles.answerLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Correct Answer:</Text>
              <Text style={[styles.answerText, { color: '#10B981' }]}>
                {correctOption.text}
              </Text>
            </View>
          )}
        </View>

        {question.explanation && (
          <View style={[styles.explanationBox, { backgroundColor: theme === 'light' ? '#FEF3C7' : '#F59E0B20', borderLeftColor: '#F59E0B' }]}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={[styles.explanationTitle, { color: theme === 'light' ? '#92400E' : '#FBBF24' }]}>Explanation</Text>
            </View>
            <Text style={[styles.explanationText, { color: theme === 'light' ? '#78350F' : '#FDE68A' }]}>{question.explanation}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={[styles.loadingText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Loading Results...</Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
        <Text style={[styles.errorText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>No results found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradeInfo = getGradeInfo(result.percentage || 0);
  const correctAnswers = result.correctAnswers || result.quiz?.questions?.filter((q, i) => {
    const correctOption = q.options?.find(opt => opt.isCorrect);
    return result.answers[i] === correctOption?.text;
  }).length || 0;
  const totalQuestions = result.totalQuestions || result.quiz?.questions?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
      {/* Header */}
      <LinearGradient
        colors={theme === 'light' ? [gradeInfo.color, '#1F2937'] : ['#222', '#555']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        {/* Countdown Timer Badge - Same as quiz screen */}
        {unlockCountdown != null && unlockCountdown > 0 && (
          <View style={[
            styles.timerBadge,
            { backgroundColor: unlockCountdown < 60 ? '#FEE2E2' : (unlockCountdown < 300 ? '#FEF3C7' : '#DBEAFE') }
          ]}>
            <Ionicons
              name="time-outline"
              size={16}
              color={unlockCountdown < 60 ? '#DC2626' : (unlockCountdown < 300 ? '#D97706' : '#2563EB')}
            />
            <Text style={[
              styles.timerText,
              { color: unlockCountdown < 60 ? '#DC2626' : (unlockCountdown < 300 ? '#D97706' : '#2563EB') }
            ]}>
              {Math.floor(unlockCountdown / 60)}:{(unlockCountdown % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        )}

        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.headerEmoji}>{gradeInfo.emoji}</Text>
          <Text style={styles.headerTitle}>{gradeInfo.message}</Text>
          <Text style={styles.quizTitle}>{result.quiz?.title}</Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{Math.round(result.percentage)}%</Text>
            <Text style={styles.gradeText}>{gradeInfo.grade}</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {correctAnswers} of {totalQuestions} correct
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={[styles.statNumber, { color: theme === 'light' ? '#111827' : 'white' }]}>{correctAnswers}</Text>
            <Text style={[styles.statLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Correct</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={[styles.statNumber, { color: theme === 'light' ? '#111827' : 'white' }]}>{totalQuestions - correctAnswers}</Text>
            <Text style={[styles.statLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Wrong</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            <Ionicons name="time" size={24} color="#6366F1" />
            <Text style={[styles.statNumber, { color: theme === 'light' ? '#111827' : 'white' }]}>{result.timeTaken || 0}s</Text>
            <Text style={[styles.statLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Time</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              const isLockedNow = unlockCountdown != null && unlockCountdown > 0;

              if (isLockedNow) {
                Alert.alert(
                  'Explanations Locked',
                  'Answer explanations will be available after the quiz timer has finished for all participants.'
                );
                return;
              }
              setShowExplanations(!showExplanations);
            }}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.actionButtonGradient}>
              <Ionicons
                name={showExplanations ? "eye-off" : "eye"}
                size={20}
                color="white"
              />
              <Text style={styles.actionButtonText}>
                {unlockCountdown != null && unlockCountdown > 0
                  ? 'Explanations Locked'
                  : (showExplanations ? 'Hide Explanations' : 'Show Explanations')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Only show retake button for practice quizzes (no classId) AND when explanations are hidden */}
          {!result.classId && !showExplanations && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('TakeQuiz', { id: result.quiz?._id })}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.actionButtonGradient}>
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.actionButtonText}>Retake Quiz</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Question Explanations */}
        {showExplanations && !(unlockCountdown != null && unlockCountdown > 0) && result.quiz?.questions && (
          <View style={styles.explanationsContainer}>
            <Text style={[styles.explanationsTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>📝 Question Review</Text>
            {result.quiz.questions.map((question, index) =>
              renderQuestionExplanation(question, index)
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  quizTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 8,
  },
  gradeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  explanationsContainer: {
    marginTop: 8,
  },
  explanationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 16,
  },
  answerSection: {
    gap: 12,
    marginBottom: 16,
  },
  answerBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FAFAFA',
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  explanationBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  explanationText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timerBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }
    }),
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
