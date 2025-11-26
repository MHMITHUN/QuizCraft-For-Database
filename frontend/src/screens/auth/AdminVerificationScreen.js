import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

export default function AdminVerificationScreen({ navigation, route }) {
  const email = (route?.params?.email || '').toString();
  const [code, setCode] = useState('');
  const { verifyAdminLogin, loading } = useAuth();
  const { theme } = useTheme();
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert(
            'Code Expired',
            'Your verification code has expired. Please login again.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    console.log('[AdminVerification] Verifying code...');
    const result = await verifyAdminLogin(email, code);
    console.log('[AdminVerification] Result:', result);
    
    if (!result.success) {
      Alert.alert('Verification Failed', result.error);
    } else {
      // Successfully verified - AuthContext will redirect to the dashboard
      console.log('[AdminVerification] Success! Awaiting dashboard navigation');
      Alert.alert('Welcome!', 'Admin verification successful', [
        {
          text: 'OK',
        }
      ]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>
            Admin Verification
          </Text>
          <Text style={[styles.subtitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
            A 6-digit verification code has been sent to
          </Text>
          <Text style={[styles.email, { color: theme === 'light' ? '#4F46E5' : '#A5B4FC' }]}>
            {email}
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e' }]}>
          <View style={[styles.timerBox, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
            <Text style={[styles.timerLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
              Code expires in:
            </Text>
            <Text style={[styles.timerValue, { color: timeLeft < 60 ? '#EF4444' : (theme === 'light' ? '#4F46E5' : '#A5B4FC') }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>

          <Text style={[styles.label, { color: theme === 'light' ? '#374151' : '#D1D5DB' }]}>
            Enter Verification Code
          </Text>
          
          <TextInput
            style={[
              styles.codeInput, 
              { 
                backgroundColor: theme === 'light' ? '#F9FAFB' : '#272727', 
                color: theme === 'light' ? '#111827' : 'white',
                borderColor: theme === 'light' ? '#D1D5DB' : '#374151'
              }
            ]}
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.backButtonText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
              ← Back to Login
            </Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: theme === 'light' ? '#EFF6FF' : '#1E3A8A20', borderColor: theme === 'light' ? '#BFDBFE' : '#3B82F6' }]}>
            <Text style={[styles.infoTitle, { color: theme === 'light' ? '#1E40AF' : '#93C5FD' }]}>
              🛡️ Security Notice
            </Text>
            <Text style={[styles.infoText, { color: theme === 'light' ? '#1E3A8A' : '#BFDBFE' }]}>
              This verification code is required for all admin logins to ensure maximum security. 
              If you didn't attempt to login, please change your password immediately.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  lockIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  form: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});


