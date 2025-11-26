import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StreamingQuizLoader({ 
  status = 'ready',
  questionsGenerated = 0,
  totalQuestions = 10,
  currentQuestion = null,
  metadata = null
}) {
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const fadeAnimation = Animated.timing(fadeValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });

    pulseAnimation.start();
    fadeAnimation.start();

    return () => {
      pulseAnimation.stop();
      fadeAnimation.stop();
    };
  }, [pulseValue, fadeValue]);

  const getStatusMessage = () => {
    switch (status) {
      case 'extracting':
        return '📄 Extracting content from file...';
      case 'extracted':
        return '✅ Content extracted successfully!';
      case 'generating':
        return '🤖 AI is generating questions...';
      case 'question':
        return `✨ Question ${questionsGenerated} generated!`;
      case 'saving':
        return '💾 Saving quiz...';
      case 'complete':
        return '🎉 Quiz generated successfully!';
      default:
        return '⚙️ Preparing...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'extracting':
        return 'document-text-outline';
      case 'extracted':
        return 'checkmark-circle-outline';
      case 'generating':
      case 'question':
        return 'bulb-outline';
      case 'saving':
        return 'save-outline';
      case 'complete':
        return 'checkmark-done-circle-outline';
      default:
        return 'cog-outline';
    }
  };

  const progress = totalQuestions > 0 ? (questionsGenerated / totalQuestions) * 100 : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeValue }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseValue }] }
          ]}
        >
          <Ionicons
            name={getStatusIcon()}
            size={64}
            color="#4F46E5"
          />
        </Animated.View>

        {/* Status Message */}
        <Text style={styles.statusMessage}>{getStatusMessage()}</Text>

        {/* Progress Bar */}
        {totalQuestions > 0 && status !== 'extracting' && status !== 'ready' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {questionsGenerated} / {totalQuestions} questions generated
            </Text>
          </View>
        )}

        {/* Metadata Display */}
        {metadata && (
          <View style={styles.metadataContainer}>
            <View style={styles.metadataCard}>
              {metadata.title && (
                <View style={styles.metadataRow}>
                  <Ionicons name="document-text" size={18} color="#6B7280" />
                  <Text style={styles.metadataLabel}>Title:</Text>
                  <Text style={styles.metadataValue}>{metadata.title}</Text>
                </View>
              )}
              {metadata.category && (
                <View style={styles.metadataRow}>
                  <Ionicons name="folder" size={18} color="#6B7280" />
                  <Text style={styles.metadataLabel}>Category:</Text>
                  <Text style={styles.metadataValue}>{metadata.category}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Current Question Preview */}
        {currentQuestion && status === 'question' && (
          <View style={styles.questionPreview}>
            <View style={styles.questionHeader}>
              <Ionicons name="help-circle" size={20} color="#10B981" />
              <Text style={styles.questionLabel}>Latest Question:</Text>
            </View>
            <Text style={styles.questionText} numberOfLines={3}>
              {currentQuestion.questionText || 'New question generated'}
            </Text>
            {currentQuestion.difficulty && (
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>
                  {currentQuestion.difficulty}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Animated Dots */}
        {status !== 'complete' && (
          <View style={styles.dotsContainer}>
            {[...Array(3)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: pulseValue.interpolate({
                      inputRange: [1, 1.15],
                      outputRange: index === 0 ? [1, 0.3] : 
                                index === 1 ? [0.3, 1] : 
                                [0.5, 0.8],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Info Text */}
        <Text style={styles.infoText}>
          {status === 'complete' 
            ? 'Redirecting to your quiz...' 
            : 'Please wait while we process your content...'}
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 100,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  statusMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  metadataContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  metadataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 6,
  },
  metadataValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  questionPreview: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 8,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'capitalize',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
