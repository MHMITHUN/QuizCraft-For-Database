import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoadingIndicator({ 
  message = 'Loading...', 
  type = 'default', // default, quiz, uploading, processing
  size = 'medium' // small, medium, large
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spin animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Fade in animation
    const fadeAnimation = Animated.timing(fadeValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });

    spinAnimation.start();
    pulseAnimation.start();
    fadeAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
      fadeAnimation.stop();
    };
  }, [spinValue, pulseValue, fadeValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getIconName = () => {
    switch (type) {
      case 'quiz':
        return 'list-outline';
      case 'uploading':
        return 'cloud-upload-outline';
      case 'processing':
        return 'cog-outline';
      default:
        return 'hourglass-outline';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 48;
      default:
        return 32;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const getContainerSize = () => {
    switch (size) {
      case 'small':
        return { width: 80, height: 80 };
      case 'large':
        return { width: 120, height: 120 };
      default:
        return { width: 100, height: 100 };
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        getContainerSize(),
        { opacity: fadeValue }
      ]}
    >
      <View style={styles.iconContainer}>
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [
                { rotate: spin },
                { scale: pulseValue },
              ],
            },
          ]}
        >
          <Ionicons
            name={getIconName()}
            size={getIconSize()}
            color="#4F46E5"
          />
        </Animated.View>
        
        {/* Animated circles around the icon */}
        <View style={styles.circlesContainer}>
          {[...Array(3)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.circle,
                {
                  transform: [
                    {
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${index * 120}deg`, `${360 + index * 120}deg`],
                      }),
                    },
                  ],
                  animationDelay: `${index * 0.2}s`,
                },
              ]}
            />
          ))}
        </View>
      </View>
      
      <Text style={[styles.message, { fontSize: getTextSize() }]}>
        {message}
      </Text>
      
      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        {[...Array(3)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: spinValue.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: index === 0 ? [1, 0.3, 0.3, 1] : 
                            index === 1 ? [0.3, 1, 0.3, 0.3] : 
                            [0.3, 0.3, 1, 0.3],
                }),
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0 4px 8px rgba(79, 70, 229, 0.3))',
      }
    }),
  },
  circlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
    top: -20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(124, 58, 237, 0.4)',
      }
    }),
  },
  message: {
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)',
      }
    }),
  },
});