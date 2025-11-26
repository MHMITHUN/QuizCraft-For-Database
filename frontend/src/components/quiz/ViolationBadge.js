import React from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ViolationBadge = ({ violationCount, maxViolations }) => {
  const [pulseAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    if (violationCount > 0) {
      // Pulse animation when violation count increases
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [violationCount]);

  const getColor = () => {
    const ratio = violationCount / maxViolations;
    if (ratio >= 1) return '#DC2626'; // Red
    if (ratio >= 0.66) return '#F59E0B'; // Orange
    if (ratio >= 0.33) return '#FBBF24'; // Yellow
    return '#10B981'; // Green
  };

  if (violationCount === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
        <Ionicons name="shield-checkmark" size={16} color="white" />
        <Text style={styles.text}>Protected</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: getColor(), transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Ionicons name="warning" size={16} color="white" />
      <Text style={styles.text}>
        {violationCount}/{maxViolations}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      },
    }),
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ViolationBadge;
