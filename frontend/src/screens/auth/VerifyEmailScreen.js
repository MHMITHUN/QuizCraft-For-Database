import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../../components/ThemeToggle';

export default function VerifyEmailScreen({ route, navigation }) {
  const initialEmail = route?.params?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const { theme } = useTheme();

  const submit = async () => {
    const safeEmail = (email ?? '').toString().trim();
    const safeCode = (code ?? '').toString().trim();
    console.log('[VerifyEmail] Submitting:', safeEmail, safeCode);
    
    if (!safeEmail || safeCode.length !== 6) {
      Alert.alert('Error', 'Enter your email and 6-digit code');
      return;
    }
    try {
      setLoading(true);
      console.log('[VerifyEmail] Calling API...');
      const res = await authAPI.verifyEmailCode(safeEmail, safeCode);
      console.log('[VerifyEmail] Response:', res.data);
      
      // Store token and reload user to trigger navigation to app
      if (res.data?.data?.token) {
        console.log('[VerifyEmail] Token received, storing and refreshing user');
        await AsyncStorage.setItem('token', String(res.data.data.token));
        await refreshUser();
        Alert.alert('Success! 🎉', 'Email verified successfully. Welcome to QuizCraft!');
      } else {
        console.log('[VerifyEmail] No token, redirecting to login');
        Alert.alert('Verified', 'Email verified. Please login.');
        navigation.replace('Login');
      }
    } catch (e) {
      console.error('[VerifyEmail] Error:', e);
      Alert.alert('Error', e?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    const safeEmail = (email ?? '').toString().trim();
    if (!safeEmail) return Alert.alert('Error', 'Enter your email');
    try {
      setLoading(true);
      console.log('[VerifyEmail] Resending code to:', safeEmail);
      await authAPI.sendVerificationCode(safeEmail);
      console.log('[VerifyEmail] Code resent successfully');
      Alert.alert('Sent! 📧', 'A new code has been sent to your email');
    } catch (e) {
      console.error('[VerifyEmail] Resend error:', e);
      Alert.alert('Error', e?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme === 'light' ? ['#667eea', '#764ba2', '#f093fb'] : ['#222','#555']} style={styles.gradient}>
      <View style={styles.topBar}>
        <View style={styles.themeToggleContainer}>
          <Text style={{color: theme === 'light' ? 'black' : 'white', marginRight: 10}}>Light/Dark</Text>
          <ThemeToggle />
        </View>
      </View>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>✉️</Text>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>Check your inbox! We sent a 6-digit code to:</Text>
              <Text style={styles.emailHighlight}>{email || 'your email'}</Text>
            </View>

            {/* Card */}
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e' }]}>
              <View style={[styles.inputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput 
                  style={[styles.input, { color: theme === 'light' ? '#111827' : 'white' }]}
                  placeholder="Email" 
                  placeholderTextColor="#9CA3AF" 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
                <Text style={styles.inputIcon}>🔢</Text>
                <TextInput 
                  style={[styles.input, { color: theme === 'light' ? '#111827' : 'white' }]}
                  placeholder="6-digit code" 
                  placeholderTextColor="#9CA3AF" 
                  value={code} 
                  onChangeText={setCode} 
                  keyboardType="number-pad" 
                  maxLength={6}
                  editable={!loading}
                  autoFocus
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={submit} 
                disabled={loading}
              >
                <LinearGradient 
                  colors={loading ? ['#9CA3AF', '#6B7280'] : ['#667eea', '#764ba2']} 
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resend} 
                onPress={resend} 
                disabled={loading}
              >
                <Text style={[styles.resendText, { color: theme === 'light' ? '#667eea' : '#A5B4FC' }]}>Didn't receive the code? Resend</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text style={[styles.backText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>← Back to Signup</Text>
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
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
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
    marginBottom: 8,
    opacity: 0.9,
    textAlign: 'center',
  },
  emailHighlight: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  card: { 
    backgroundColor: '#FFF', 
    padding: 24, 
    borderRadius: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 20, 
    elevation: 10 
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
  button: { 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginTop: 8 
  },
  buttonGradient: { 
    padding: 18, 
    alignItems: 'center' 
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16,
  },
  resend: { 
    marginTop: 20, 
    alignItems: 'center',
    padding: 12,
  },
  resendText: { 
    color: '#667eea', 
    fontWeight: '600',
    fontSize: 14,
  },
  backButton: {
    marginTop: 8,
    alignItems: 'center',
    padding: 12,
  },
  backText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
