import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { authAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../../components/ThemeToggle';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { theme } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    let interval;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

  const sendResetEmail = async () => {
    const safeEmail = (email ?? '').toString().trim();
    
    if (!safeEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(safeEmail);
      setStep(2);
      setTimeLeft(300); // 5 minutes countdown
      Alert.alert(
        'Email Sent!',
        `A password reset code has been sent to ${safeEmail}. Please check your email and enter the code below.`
      );
    } catch (error) {
      console.error('Send reset email error:', error);
      const message = error?.response?.data?.message || 'Failed to send reset email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const verifyResetCode = async () => {
    const safeCode = (resetCode ?? '').toString().trim();
    
    if (!safeCode) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }

    if (safeCode.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyResetCode(email, safeCode);
      setStep(3);
      Alert.alert('Code Verified!', 'Please enter your new password below.');
    } catch (error) {
      console.error('Verify code error:', error);
      const message = error?.response?.data?.message || 'Invalid or expired code. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const safeNewPassword = (newPassword ?? '').toString();
    const safeConfirmPassword = (confirmPassword ?? '').toString();
    
    if (!safeNewPassword || !safeConfirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (safeNewPassword !== safeConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (safeNewPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(email, resetCode, safeNewPassword);
      Alert.alert(
        'Password Reset Successful!',
        'Your password has been successfully reset. You can now login with your new password.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      console.error('Reset password error:', error);
      const message = error?.response?.data?.message || 'Failed to reset password. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setTimeLeft(300);
    await sendResetEmail();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepContainer}>
        <View style={[styles.step, step >= 1 && styles.activeStep]}>
          <Text style={[styles.stepText, step >= 1 && styles.activeStepText]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.activeStepLine]} />
        <View style={[styles.step, step >= 2 && styles.activeStep]}>
          <Text style={[styles.stepText, step >= 2 && styles.activeStepText]}>2</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.activeStepLine]} />
        <View style={[styles.step, step >= 3 && styles.activeStep]}>
          <Text style={[styles.stepText, step >= 3 && styles.activeStepText]}>3</Text>
        </View>
      </View>
      <View style={styles.stepLabels}>
        <Text style={styles.stepLabel}>Email</Text>
        <Text style={styles.stepLabel}>Code</Text>
        <Text style={styles.stepLabel}>Reset</Text>
      </View>
    </View>
  );

  const renderEmailStep = () => (
    <Animated.View 
      style={[
        styles.stepContent,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
          <Ionicons name="mail" size={32} color="#4F46E5" />
        </View>
        <Text style={[styles.stepTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Enter Your Email</Text>
        <Text style={[styles.stepDescription, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
          We'll send you a secure code to reset your password
        </Text>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
        <Text style={styles.inputIcon}>📧</Text>
        <TextInput
          style={[styles.input, { color: theme === 'light' ? '#111827' : 'white' }]}
          placeholder="Enter your email address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={sendResetEmail}
        disabled={loading}
      >
        <LinearGradient
          colors={loading ? ['#9CA3AF', '#6B7280'] : ['#4F46E5', '#7C3AED']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="white" />
              <Text style={styles.buttonText}>Send Reset Code</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCodeStep = () => (
    <Animated.View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
          <Ionicons name="shield-checkmark" size={32} color="#10B981" />
        </View>
        <Text style={[styles.stepTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Enter Reset Code</Text>
        <Text style={[styles.stepDescription, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
          Enter the 6-digit code sent to {email}
        </Text>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
        <Text style={styles.inputIcon}>🔐</Text>
        <TextInput
          style={[styles.input, { color: theme === 'light' ? '#111827' : 'white' }]}
          placeholder="Enter 6-digit code"
          placeholderTextColor="#9CA3AF"
          value={resetCode}
          onChangeText={setResetCode}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />
      </View>

      {timeLeft > 0 ? (
        <Text style={styles.timerText}>
          Code expires in: {formatTime(timeLeft)}
        </Text>
      ) : (
        <TouchableOpacity style={styles.resendButton} onPress={resendCode}>
          <Text style={styles.resendButtonText}>Resend Code</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={verifyResetCode}
        disabled={loading}
      >
        <LinearGradient
          colors={loading ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
          style={styles.buttonGradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.buttonText}>Verify Code</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep(1)}
      >
        <Text style={[styles.backButtonText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>← Back to Email</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPasswordStep = () => (
    <Animated.View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
          <Ionicons name="key" size={32} color="#F59E0B" />
        </View>
        <Text style={[styles.stepTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Create New Password</Text>
        <Text style={[styles.stepDescription, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
          Choose a strong password for your account
        </Text>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
        <Text style={styles.inputIcon}>🔒</Text>
        <TextInput
          style={[styles.input, { color: theme === 'light' ? '#111827' : 'white' }]}
          placeholder="New Password"
          placeholderTextColor="#9CA3AF"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
        <Text style={styles.inputIcon}>🔐</Text>
        <TextInput
          style={[styles.input, { color: theme === 'light' ? '#111827' : 'white' }]}
          placeholder="Confirm New Password"
          placeholderTextColor="#9CA3AF"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.passwordRequirements}>
        <Text style={[styles.requirementsTitle, { color: theme === 'light' ? '#374151' : 'white' }]}>Password must contain:</Text>
        <Text style={[styles.requirement, { color: theme === 'light' ? '#9CA3AF' : '#6B7280' }, newPassword.length >= 6 && styles.requirementMet]}>
          • At least 6 characters
        </Text>
        <Text style={[styles.requirement, { color: theme === 'light' ? '#9CA3AF' : '#6B7280' }, /[A-Z]/.test(newPassword) && styles.requirementMet]}>
          • One uppercase letter (recommended)
        </Text>
        <Text style={[styles.requirement, { color: theme === 'light' ? '#9CA3AF' : '#6B7280' }, /[0-9]/.test(newPassword) && styles.requirementMet]}>
          • One number (recommended)
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={resetPassword}
        disabled={loading}
      >
        <LinearGradient
          colors={loading ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#D97706']}
          style={styles.buttonGradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="white" />
              <Text style={styles.buttonText}>Reset Password</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep(2)}
      >
        <Text style={[styles.backButtonText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>← Back to Code</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <LinearGradient colors={theme === 'light' ? ['#667eea', '#764ba2', '#f093fb'] : ['#222','#555']} style={styles.gradient}>
      <View style={styles.topBar}>
        <View style={styles.themeToggleContainer}>
          <Text style={{color: theme === 'light' ? 'black' : 'white', marginRight: 10}}>Light/Dark</Text>
          <ThemeToggle />
        </View>
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.emoji}>🔐</Text>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Secure password recovery in 3 steps</Text>
            </View>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Card */}
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e' }]}>
              {step === 1 && renderEmailStep()}
              {step === 2 && renderCodeStep()}
              {step === 3 && renderPasswordStep()}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>
                  Remember your password? <Text style={styles.link}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 40,
    right: 20,
    left: 20,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  stepIndicator: {
    marginBottom: 30,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: '#FFF',
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  activeStepText: {
    color: '#4F46E5',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  activeStepLine: {
    backgroundColor: '#FFF',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  stepLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '100%',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 20,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    width: '100%',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  passwordRequirements: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    width: '100%',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  requirementMet: {
    color: '#10B981',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerLink: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
  link: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});