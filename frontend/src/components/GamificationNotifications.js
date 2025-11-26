import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { showToast } from './Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// XP Notification Component
export const XPNotification = ({ visible, xpAmount, onClose, levelUp = false, newLevel = null }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3 seconds
      const timeout = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset animations for next use
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      slideAnim.setValue(50);
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={hideNotification}
    >
      <View style={styles.xpModalContainer}>
        <Animated.View
          style={[
            styles.xpNotification,
            levelUp && styles.levelUpNotification,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideNotification}
          >
            <Feather name="x" size={16} color={levelUp ? "#fff" : "#666"} />
          </TouchableOpacity>

          <View style={styles.xpContent}>
            <Animated.View
              style={[
                styles.xpIcon,
                levelUp && styles.levelUpIcon,
                {
                  transform: [{
                    rotate: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]}
            >
              <Feather 
                name={levelUp ? "star" : "zap"} 
                size={24} 
                color={levelUp ? "#FFD93D" : "#4A90E2"} 
              />
            </Animated.View>

            {levelUp ? (
              <>
                <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
                <Text style={styles.levelUpLevel}>Level {newLevel}</Text>
                <Text style={styles.xpText}>+{xpAmount} XP</Text>
              </>
            ) : (
              <>
                <Text style={styles.xpAmount}>+{xpAmount}</Text>
                <Text style={styles.xpLabel}>XP Earned</Text>
              </>
            )}
          </View>

          {levelUp && (
            <View style={styles.levelUpEffects}>
              {[...Array(5)].map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.sparkle,
                    {
                      opacity: opacityAnim,
                      transform: [{
                        scale: scaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1 + Math.random() * 0.5],
                        })
                      }]
                    }
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// Achievement Unlock Notification
export const AchievementNotification = ({ 
  visible, 
  achievement, 
  onClose,
  onViewDetails 
}) => {
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 5 seconds
      const timeout = setTimeout(() => {
        hideNotification();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset animations
      slideAnim.setValue(-SCREEN_WIDTH);
      opacityAnim.setValue(0);
      bounceAnim.setValue(0);
    });
  };

  const handleViewDetails = () => {
    hideNotification();
    onViewDetails?.(achievement);
  };

  if (!visible || !achievement) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={hideNotification}
    >
      <View style={styles.achievementModalContainer}>
        <Animated.View
          style={[
            styles.achievementNotification,
            {
              transform: [{ translateX: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.achievementCloseButton}
            onPress={hideNotification}
          >
            <Feather name="x" size={16} color="#666" />
          </TouchableOpacity>

          <View style={styles.achievementContent}>
            <Animated.Text
              style={[
                styles.achievementIcon,
                {
                  transform: [{
                    scale: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    })
                  }]
                }
              ]}
            >
              {achievement.icon}
            </Animated.Text>

            <View style={styles.achievementTextContent}>
              <Text style={styles.achievementUnlockedText}>Achievement Unlocked!</Text>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDescription} numberOfLines={2}>
                {achievement.description}
              </Text>
              
              {achievement.xp && (
                <View style={styles.achievementXP}>
                  <Feather name="zap" size={14} color="#FFD93D" />
                  <Text style={styles.achievementXPText}>+{achievement.xp} XP</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={handleViewDetails}
            >
              <Feather name="eye" size={16} color="#4A90E2" />
            </TouchableOpacity>
          </View>

          {/* Celebration effects */}
          <View style={styles.celebrationEffects}>
            {[...Array(8)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.confetti,
                  {
                    opacity: opacityAnim,
                    transform: [{
                      translateY: opacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20 - Math.random() * 30],
                      })
                    }, {
                      rotate: opacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${360 + Math.random() * 180}deg`],
                      })
                    }]
                  },
                  {
                    left: 20 + (index * 35),
                    backgroundColor: ['#FF6B35', '#4A90E2', '#4CAF50', '#FFD93D'][index % 4],
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Streak Notification
export const StreakNotification = ({ 
  visible, 
  streakCount, 
  onClose 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      const timeout = setTimeout(() => {
        hideNotification();
      }, 3500);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    });
  };

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={hideNotification}
    >
      <View style={styles.streakModalContainer}>
        <Animated.View
          style={[
            styles.streakNotification,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.streakCloseButton}
            onPress={hideNotification}
          >
            <Feather name="x" size={16} color="#fff" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.streakFireIcon,
              {
                transform: [
                  { rotate: spin },
                  { scale: pulseAnim }
                ],
              },
            ]}
          >
            <Text style={styles.fireEmoji}>🔥</Text>
          </Animated.View>

          <Text style={styles.streakTitle}>STREAK!</Text>
          <Text style={styles.streakCount}>{streakCount} Days</Text>
          <Text style={styles.streakMessage}>
            {streakCount >= 7 ? 'You\'re on fire!' : 'Keep it up!'}
          </Text>

          {/* Fire particles */}
          <View style={styles.fireParticles}>
            {[...Array(6)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.fireParticle,
                  {
                    opacity: scaleAnim,
                    transform: [{
                      translateY: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10 - Math.random() * 20],
                      })
                    }]
                  },
                  {
                    left: 60 + (index * 20) + Math.random() * 10,
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Challenge Complete Notification
export const ChallengeCompleteNotification = ({ 
  visible, 
  challenge, 
  onClose,
  onClaim 
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      const timeout = setTimeout(() => {
        hideNotification();
      }, 6000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      slideAnim.setValue(100);
      glowAnim.setValue(0);
    });
  };

  const handleClaim = () => {
    hideNotification();
    onClaim?.(challenge);
  };

  if (!visible || !challenge) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={hideNotification}
    >
      <View style={styles.challengeModalContainer}>
        <Animated.View
          style={[
            styles.challengeNotification,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.challengeCloseButton}
            onPress={hideNotification}
          >
            <Feather name="x" size={16} color="#666" />
          </TouchableOpacity>

          <View style={styles.challengeContent}>
            <Animated.Text
              style={[
                styles.challengeCompleteIcon,
                {
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.7],
                  })
                }
              ]}
            >
              {challenge.icon}
            </Animated.Text>

            <Text style={styles.challengeCompleteTitle}>Challenge Complete!</Text>
            <Text style={styles.challengeCompleteName}>{challenge.title}</Text>

            <View style={styles.challengeRewards}>
              <View style={styles.rewardItem}>
                <Feather name="zap" size={16} color="#FFD93D" />
                <Text style={styles.rewardText}>{challenge.reward?.xp} XP</Text>
              </View>
              {challenge.reward?.badge && (
                <View style={styles.rewardItem}>
                  <Feather name="award" size={16} color="#4A90E2" />
                  <Text style={styles.rewardText}>Badge</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.claimButton}
              onPress={handleClaim}
            >
              <Text style={styles.claimButtonText}>Claim Rewards</Text>
              <Feather name="gift" size={16} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // XP Notification Styles
  xpModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  xpNotification: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  levelUpNotification: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#4A90E2',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  xpContent: {
    alignItems: 'center',
  },
  xpIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelUpIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  xpAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  xpLabel: {
    fontSize: 14,
    color: '#666',
  },
  levelUpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  levelUpLevel: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD93D',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  levelUpEffects: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD93D',
  },

  // Achievement Notification Styles
  achievementModalContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  achievementNotification: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  achievementTextContent: {
    flex: 1,
    marginRight: 12,
  },
  achievementUnlockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    textTransform: 'uppercase',
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  achievementXP: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  achievementXPText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD93D',
    marginLeft: 4,
  },
  viewDetailsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  celebrationEffects: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    top: -10,
  },

  // Streak Notification Styles
  streakModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  streakNotification: {
    backgroundColor: '#FF6B35',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  streakCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  streakFireIcon: {
    marginBottom: 16,
  },
  fireEmoji: {
    fontSize: 48,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD93D',
    marginBottom: 8,
  },
  streakMessage: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  fireParticles: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 30,
  },
  fireParticle: {
    position: 'absolute',
    width: 3,
    height: 8,
    backgroundColor: '#FFD93D',
    borderRadius: 2,
  },

  // Challenge Complete Notification Styles
  challengeModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  challengeNotification: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    marginTop: 50,
  },
  challengeCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  challengeContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  challengeCompleteIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  challengeCompleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  challengeCompleteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  challengeRewards: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default {
  XPNotification,
  AchievementNotification,
  StreakNotification,
  ChallengeCompleteNotification,
};