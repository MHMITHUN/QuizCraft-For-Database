import React from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  answeredCount, 
  progressAnim,
  showDetails = true 
}) {
  const progressPercentage = totalSteps > 0 ? (answeredCount / totalSteps) * 100 : 0;
  
  return (
    <View style={styles.container}>
      {showDetails && (
        <View style={styles.headerRow}>
          <View style={styles.stepInfo}>
            <Ionicons name="list-outline" size={16} color="#6B7280" />
            <Text style={styles.stepText}>
              Question {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
            </Text>
          </View>
          <View style={styles.completionInfo}>
            <Ionicons 
              name={answeredCount === totalSteps ? "checkmark-circle" : "time-outline"} 
              size={16} 
              color={answeredCount === totalSteps ? "#10B981" : "#6B7280"} 
            />
            <Text style={[
              styles.completionText,
              answeredCount === totalSteps && styles.completionTextComplete
            ]}>
              {answeredCount}/{totalSteps} answered
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim ? progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }) : `${progressPercentage}%`
              }
            ]}
          />
          <View style={styles.progressGlow} />
        </View>
        
        {showDetails && (
          <Text style={styles.percentageText}>
            {Math.round(progressPercentage)}%
          </Text>
        )}
      </View>
      
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.stepDot,
              index < answeredCount && styles.stepDotCompleted,
              index === currentStep && styles.stepDotCurrent
            ]}
          >
            {index < answeredCount && (
              <Ionicons name="checkmark" size={8} color="white" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  completionTextComplete: {
    color: '#10B981',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
    position: 'relative',
    ...Platform.select({
      web: {
        background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
      }
    }),
  },
  progressGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    bottom: -2,
    borderRadius: 6,
    ...Platform.select({
      web: {
        background: 'linear-gradient(90deg, transparent, rgba(79, 70, 229, 0.2), transparent)',
        filter: 'blur(4px)',
        opacity: 0.6,
      }
    }),
  },
  percentageText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }
    }),
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
      }
    }),
  },
  stepDotCurrent: {
    backgroundColor: '#4F46E5',
    transform: [{ scale: 1.2 }],
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(79, 70, 229, 0.4)',
      }
    }),
  },
});