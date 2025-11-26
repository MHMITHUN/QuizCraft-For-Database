import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AntiPlagiarismWarning = ({
  visible,
  onDismiss,
  violationCount,
  maxViolations,
  lastViolation,
  isMaxReached,
}) => {
  const [shakeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const getViolationMessage = (type) => {
    const messages = {
      APP_SWITCH: 'You switched away from the app',
      TAB_SWITCH: 'You switched to another tab',
      WINDOW_BLUR: 'Browser window lost focus',
      COPY_ATTEMPT: 'Copying text is not allowed',
      PASTE_ATTEMPT: 'Pasting text is not allowed',
      RIGHT_CLICK: 'Right-click is disabled during quiz',
    };
    return messages[type] || 'Suspicious activity detected';
  };

  const getSeverityColor = () => {
    const ratio = violationCount / maxViolations;
    if (ratio >= 1) return ['#DC2626', '#991B1B']; // Red
    if (ratio >= 0.66) return ['#F59E0B', '#D97706']; // Orange
    return ['#EF4444', '#DC2626']; // Light red
  };

  const remainingChances = Math.max(0, maxViolations - violationCount);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <LinearGradient
            colors={getSeverityColor()}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Warning Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={60} color="white" />
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isMaxReached ? '⚠️ Maximum Violations Reached' : '🚨 Integrity Warning'}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {isMaxReached
                ? 'You have exceeded the maximum number of allowed violations. This attempt will be flagged for review.'
                : lastViolation
                ? getViolationMessage(lastViolation.type)
                : 'Suspicious activity detected during the quiz.'}
            </Text>

            {/* Violation Counter */}
            <View style={styles.counterContainer}>
              <View style={styles.counterRow}>
                <View style={styles.counterDot} />
                <Text style={styles.counterText}>
                  Violation {violationCount} of {maxViolations}
                </Text>
              </View>
              
              {!isMaxReached && (
                <Text style={styles.remainingText}>
                  {remainingChances} {remainingChances === 1 ? 'chance' : 'chances'} remaining
                </Text>
              )}
            </View>

            {/* Warning Message */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="rgba(255,255,255,0.9)" />
              <Text style={styles.infoText}>
                {isMaxReached
                  ? 'Your quiz will be submitted automatically and marked for review by the instructor.'
                  : 'Switching apps/tabs during the quiz is considered a violation. Please stay on this screen.'}
              </Text>
            </View>

            {/* Action Button */}
            {!isMaxReached && (
              <TouchableOpacity
                style={styles.button}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>I Understand</Text>
                <Ionicons name="checkmark-circle" size={20} color="#DC2626" />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      },
    }),
  },
  modalContent: {
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  counterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  counterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  counterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  remainingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginLeft: 12,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginRight: 8,
  },
});

export default AntiPlagiarismWarning;
