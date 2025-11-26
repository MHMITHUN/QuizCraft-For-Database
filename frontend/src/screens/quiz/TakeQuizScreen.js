import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Animated, Dimensions } from 'react-native';
import { quizAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { Ionicons } from '@expo/vector-icons';
import ProgressIndicator from '../../components/quiz/ProgressIndicator';
import QuizButton from '../../components/quiz/QuizButton';
import LoadingIndicator from '../../components/quiz/LoadingIndicator';
import useAntiPlagiarism from '../../hooks/useAntiPlagiarism';
import AntiPlagiarismWarning from '../../components/quiz/AntiPlagiarismWarning';
import ViolationBadge from '../../components/quiz/ViolationBadge';
import { useTheme } from '../../hooks/useTheme';

const { width: screenWidth } = Dimensions.get('window');

export default function TakeQuizScreen({ route, navigation }) {
  const { id, classId } = route.params || {};
  const { t } = useI18n();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [progressAnim] = useState(new Animated.Value(0));
  const startTimeRef = useRef(Date.now());
  const { theme } = useTheme();
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timeUp, setTimeUp] = useState(false);
  const timerRef = useRef(null);

  // Anti-plagiarism configuration
  const PROCTORING_ENABLED = true; // Set to false to disable
  const MAX_VIOLATIONS = 3;

  // Initialize anti-plagiarism monitoring
  const {
    violations,
    violationCount,
    isAppActive,
    warningVisible,
    maxViolations,
    isMaxViolationsReached,
    startMonitoring,
    stopMonitoring,
    dismissWarning,
    getViolationSummary,
  } = useAntiPlagiarism({
    enabled: PROCTORING_ENABLED,
    maxViolations: MAX_VIOLATIONS,
    onViolation: async (violation, count) => {
      // Log violation to backend
      try {
        await quizAPI.logViolation(id, violation);
      } catch (error) {
        console.error('Failed to log violation:', error);
      }
    },
    onMaxViolations: async (allViolations) => {
      // Auto-submit quiz when max violations reached - NO user interaction needed
      console.log('🚨 Max violations reached - Auto-submitting quiz immediately');
      // We'll trigger this through useEffect to avoid closure issues
    },
    strictMode: Platform.OS === 'web', // Enable strict mode on web
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await quizAPI.getById(id);
        const q = res?.data?.data?.quiz;
        setQuiz(q);
        setAnswers(new Array(q?.questions?.length || 0).fill(null));

        // Initialize timer if timeLimit exists (in minutes)
        if (q?.timeLimit && q.timeLimit > 0) {
          setTimeRemaining(q.timeLimit * 60); // Convert to seconds
        }

        // Start entrance animation
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
          })
        ]).start();

        // Start anti-plagiarism monitoring
        if (PROCTORING_ENABLED) {
          startMonitoring();
          console.log('🛡️ Anti-plagiarism monitoring started');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    })();

    // Cleanup: stop monitoring when component unmounts
    return () => {
      if (PROCTORING_ENABLED) {
        stopMonitoring();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || loading) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining !== null, loading]);

  // Auto-submit when time is up
  useEffect(() => {
    if (timeUp && !submitting) {
      if (timerRef.current) clearInterval(timerRef.current);
      Alert.alert(
        'Time\'s Up!',
        'Quiz time has ended. Submitting automatically...',
        [{ text: 'OK' }]
      );
      setTimeout(() => {
        handleTimeUpSubmit();
      }, 1000);
    }
  }, [timeUp]);

  useEffect(() => {
    if (quiz?.questions?.length) {
      const progress = (Object.values(answers).filter(a => a !== null).length) / quiz.questions.length;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [answers, quiz]);

  // Handle time-up submission
  const handleTimeUpSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      stopMonitoring();

      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const proctoringData = PROCTORING_ENABLED ? {
        violations: violations,
        violationCount: violationCount,
        maxViolationsReached: false,
        flaggedForReview: violationCount > 0,
        autoSubmitted: true,
        timeExpired: true,
      } : { autoSubmitted: true, timeExpired: true };

      const res = await quizAPI.submit(id, answers, timeTaken, proctoringData, classId);
      const historyId = res?.data?.data?.historyId;

      navigation.replace('QuizResult', {
        historyId,
        timeExpired: true,
      });
    } catch (e) {
      console.error('Time-up submit error:', e);
      setSubmitting(false);
    }
  };

  // Auto-submit when max violations reached
  useEffect(() => {
    if (isMaxViolationsReached && !submitting) {
      console.log('🚨 Triggering auto-submit due to max violations');

      // Auto-submit after a brief delay to show the overlay message
      const timer = setTimeout(() => {
        handleAutoSubmit();
      }, 2000); // 2 seconds to show the beautiful message

      return () => clearTimeout(timer);
    }
  }, [isMaxViolationsReached, submitting]);

  // Handle auto-submit when max violations reached
  const handleAutoSubmit = async () => {
    if (submitting) return; // Prevent double submission

    try {
      setSubmitting(true);
      stopMonitoring();

      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const proctoringData = {
        violations: violations,
        violationCount: violationCount,
        maxViolationsReached: true,
        flaggedForReview: true,
        autoSubmitted: true,
      };

      console.log('🚀 Submitting quiz with proctoring data...');
      const res = await quizAPI.submit(id, answers, timeTaken, proctoringData, classId);
      const historyId = res?.data?.data?.historyId;

      console.log('✅ Quiz submitted successfully, navigating to results...');

      // Use setTimeout to ensure navigation happens after state updates
      setTimeout(() => {
        navigation.replace('QuizResult', {
          historyId,
          flagged: true,
          autoSubmitted: true,
        });
      }, 100);
    } catch (e) {
      console.error('❌ Auto-submit error:', e);
      setSubmitting(false);

      // Still navigate to results even on error, or show error and go back
      Alert.alert(
        'Submission Error',
        'Failed to submit quiz. Returning to home.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
    }
  };

  const submit = async () => {
    const unanswered = answers.some(a => a === null);
    if (unanswered) {
      Alert.alert('Incomplete Quiz', 'Please answer all questions before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      stopMonitoring();

      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const proctoringData = PROCTORING_ENABLED ? {
        violations: violations,
        violationCount: violationCount,
        maxViolationsReached: isMaxViolationsReached,
        flaggedForReview: violationCount > 0,
        autoSubmitted: false,
      } : null;

      const res = await quizAPI.submit(id, answers, timeTaken, proctoringData, classId);
      const historyId = res?.data?.data?.historyId;
      navigation.replace('QuizResult', { historyId });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectAnswer = (questionIndex, answer) => {
    // Prevent interaction if max violations reached
    if (isMaxViolationsReached) {
      return;
    }

    const copy = [...answers];
    copy[questionIndex] = answer;
    setAnswers(copy);

    // Add a small animation feedback
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.02, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const renderQuestion = (item, index) => {
    const isAnswered = answers[index] !== null;
    const selectedAnswer = answers[index];

    return (
      <View key={index} style={[styles.questionCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
        <View style={styles.questionHeader}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.questionStatus}>
            {isAnswered ? (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            ) : (
              <Ionicons name="radio-button-off" size={24} color="#D1D5DB" />
            )}
          </View>
        </View>

        <Text style={[styles.questionText, { color: theme === 'light' ? '#111827' : 'white' }]}>{item.questionText}</Text>

        <View style={styles.optionsContainer}>
          {Array.isArray(item.options) && item.options.map((opt, i) => {
            const isSelected = selectedAnswer === opt.text;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.optionCard,
                  { backgroundColor: theme === 'light' ? '#FAFAFA' : '#272727', borderColor: theme === 'light' ? '#E5E7EB' : '#374151' },
                  isSelected && (theme === 'light' ? styles.optionCardSelected : styles.optionCardSelectedDark),
                  Platform.OS === 'web' && styles.webOption,
                  isMaxViolationsReached && styles.optionCardDisabled
                ]}
                onPress={() => selectAnswer(index, opt.text)}
                activeOpacity={0.7}
                disabled={isMaxViolationsReached}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionCircle,
                    { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#D1D5DB' : '#374151' },
                    isSelected && (theme === 'light' ? styles.optionCircleSelected : styles.optionCircleSelectedDark)
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <Text style={[
                    styles.optionText,
                    { color: theme === 'light' ? '#374151' : 'white' },
                    isSelected && (theme === 'light' ? styles.optionTextSelected : styles.optionTextSelectedDark)
                  ]}>
                    {opt.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const answeredCount = answers.filter(a => a !== null).length;
  const totalCount = quiz?.questions?.length || 0;
  const progressPercentage = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
        <LoadingIndicator
          message="Loading Quiz..."
          type="quiz"
          size="large"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
      {/* Anti-Plagiarism Warning Modal */}
      {PROCTORING_ENABLED && (
        <AntiPlagiarismWarning
          visible={warningVisible}
          onDismiss={dismissWarning}
          violationCount={violationCount}
          maxViolations={maxViolations}
          lastViolation={violations[violations.length - 1]}
          isMaxReached={isMaxViolationsReached}
        />
      )}

      {/* Header with progress */}
      <View style={[styles.header, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderBottomColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }, isMaxViolationsReached && styles.backButtonDisabled]}
          onPress={() => !isMaxViolationsReached && navigation.goBack()}
          disabled={isMaxViolationsReached}
        >
          <Ionicons name="arrow-back" size={24} color={isMaxViolationsReached ? "#9CA3AF" : (theme === 'light' ? '#374151' : 'white')} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]} numberOfLines={1}>{quiz?.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {timeRemaining !== null && (
                <View style={[
                  styles.timerBadge,
                  { backgroundColor: timeRemaining < 60 ? '#FEE2E2' : (timeRemaining < 300 ? '#FEF3C7' : '#DBEAFE') }
                ]}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={timeRemaining < 60 ? '#DC2626' : (timeRemaining < 300 ? '#D97706' : '#2563EB')}
                  />
                  <Text style={[
                    styles.timerText,
                    { color: timeRemaining < 60 ? '#DC2626' : (timeRemaining < 300 ? '#D97706' : '#2563EB') }
                  ]}>
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              {PROCTORING_ENABLED && (
                <ViolationBadge
                  violationCount={violationCount}
                  maxViolations={maxViolations}
                />
              )}
            </View>
          </View>
          <ProgressIndicator
            currentStep={currentQuestionIndex}
            totalSteps={totalCount}
            answeredCount={answeredCount}
            progressAnim={progressAnim}
            showDetails={false}
          />
        </View>
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <ScrollView
          style={[styles.scrollView, Platform.OS === 'web' && { maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }]}
          contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && { minHeight: 'fit-content' }]}
          showsVerticalScrollIndicator={true}
          bounces={Platform.OS !== 'web'}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={Platform.OS === 'android'}
        >
          {quiz?.questions?.map((question, index) => renderQuestion(question, index))}

          <View style={styles.submitSection}>
            <QuizButton
              title="Submit Quiz"
              onPress={submit}
              disabled={answeredCount !== totalCount}
              loading={submitting}
              variant={answeredCount === totalCount ? "primary" : "secondary"}
              size="large"
              icon="arrow-forward"
              iconPosition="right"
              style={styles.submitButton}
            />

            {answeredCount < totalCount && (
              <Text style={[styles.submitHint, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                Answer {totalCount - answeredCount} more question{totalCount - answeredCount !== 1 ? 's' : ''} to submit
              </Text>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Submitting Overlay */}
      {(submitting || isMaxViolationsReached) && (
        <View style={styles.submittingOverlay}>
          <View style={[styles.submittingContent, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            {isMaxViolationsReached ? (
              <>
                <View style={styles.warningIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={64} color="#DC2626" />
                </View>
                <Text style={styles.submittingTitle}>Maximum Violations Reached</Text>
                <Text style={[styles.submittingSubtitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                  Your quiz is being submitted automatically due to integrity violations.
                </Text>
                <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <Text style={styles.loadingText}>Submitting...</Text>
                </View>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={[styles.submittingText, { color: theme === 'light' ? '#111827' : 'white' }]}>Submitting quiz...</Text>
              </>
            )}
          </View>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  backButtonDisabled: {
    opacity: 0.5,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      }
    }),
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: 'auto',
      maxHeight: 'calc(100vh - 140px)',
      overflowY: 'auto'
    })
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    ...(Platform.OS === 'web' && {
      minHeight: 'fit-content',
      paddingBottom: 40
    })
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
      }
    }),
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionStatus: {
    // Status indicator space
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 26,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }
    }),
  },
  optionCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#F0F0FF',
  },
  optionCardSelectedDark: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E520',
  },
  optionCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      }
    }),
  },
  webOption: {
    // Web-specific hover effects handled by CSS
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCircleSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  optionCircleSelectedDark: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  optionTextSelectedDark: {
    color: 'white',
    fontWeight: '600',
  },
  submitSection: {
    marginTop: 32,
    marginBottom: 20,
    alignItems: 'center',
  },
  submitButton: {
    minWidth: 200,
  },
  submitHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  submittingContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 400,
    marginHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }
    }),
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  submittingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  submittingSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  submittingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
