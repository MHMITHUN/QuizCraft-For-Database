import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../../components/ThemeToggle';
import { useI18n } from '../../i18n';

const { width } = Dimensions.get('window');

import { useAuth } from '../../context/AuthContext';
export default function WelcomeScreen({ navigation }) {
  const { guestAccess, error } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const { theme } = useTheme();
  const { lang, setLang } = useI18n();

  const handleGuestAccess = async () => {
    try {
      setGuestLoading(true);
      const result = await guestAccess();
      if (!result.success) {
        alert('Guest access failed: ' + result.error);
      }
      // Navigation happens automatically when user state changes
    } catch (error) {
      console.error('Guest access error:', error);
      alert('Guest access failed');
    } finally {
      setGuestLoading(false);
    }
  };


  return (
    <LinearGradient
      colors={theme === 'light' ? ['#667eea', '#764ba2', '#f093fb'] : ['#222','#555']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }]}>
            <Text style={styles.iconEmoji}>📚</Text>
          </View>
          <View style={[styles.iconCircle, styles.iconCircle2, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }]}>
            <Text style={styles.iconEmoji}>🤖</Text>
          </View>
          <View style={[styles.iconCircle, styles.iconCircle3, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }]}>
            <Text style={styles.iconEmoji}>✨</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>QuizCraft</Text>
          <Text style={styles.subtitle}>AI-Powered Quiz Generation</Text>
          <Text style={styles.description}>
            Transform any content into interactive quizzes with the power of AI
          </Text>

          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: theme === 'light' ? 'rgba(254, 226, 226, 0.9)' : 'rgba(127, 29, 29, 0.8)',
                  borderColor: theme === 'light' ? '#FCA5A5' : '#F87171'
                }
              ]}
            >
              <Text style={[styles.errorText, { color: theme === 'light' ? '#7F1D1D' : '#FEE2E2' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Features */}
          <View style={styles.features}>
            {[
              { icon: '🎯', text: 'Smart Quiz Generation' },
              { icon: '📊', text: 'Track Your Progress' },
              { icon: '🏆', text: 'Compete & Learn' }
            ].map((feature, index) => (
              <View
                key={index}
                style={[styles.featureItem, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' }]}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Signup')}
          >
            <LinearGradient
              colors={theme === 'light' ? ['#FFF', '#F3F4F6'] : ['#4F46E5', '#7C3AED']}
              style={styles.buttonPrimary}
            >
              <Text style={[styles.buttonPrimaryText, { color: theme === 'light' ? '#667eea' : '#FFF' }]}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)', borderColor: theme === 'light' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)' }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonSecondaryText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonGuest}
            onPress={handleGuestAccess}
            disabled={guestLoading}
          >
            {guestLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonGuestText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>

          {/* Admin Login Button */}
          <TouchableOpacity
            style={[styles.adminLoginButton, { backgroundColor: theme === 'light' ? '#EF4444' : '#DC2626' }]}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            <Text style={styles.adminLoginButtonText}>🔐 Admin Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Decorative Elements */}
      <View style={[styles.decoration1, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]} />
      <View style={[styles.decoration2, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]} />
      <View style={[styles.decoration3, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 40,
    right: 20,
    left: 20,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langRow: { flexDirection: 'row' },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconCircle2: {
    top: -30,
    right: -20,
    width: 80,
    height: 80,
  },
  iconCircle3: {
    bottom: -20,
    left: -30,
    width: 70,
    height: 70,
  },
  iconEmoji: {
    fontSize: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 16,
    opacity: 0.9,
  },
  description: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
    maxWidth: width - 80,
  },
  errorBanner: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
    maxWidth: width - 80,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  features: {
    marginTop: 30,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonPrimary: {
    padding: 18,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonGuest: {
    padding: 18,
    alignItems: 'center',
  },
  buttonGuestText: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
  },
  adminLoginButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  adminLoginButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  decoration1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decoration2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decoration3: {
    position: 'absolute',
    top: 100,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
