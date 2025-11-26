import React, { useState } from 'react';
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

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useAuth();
  const { theme } = useTheme();

  const handleAdminLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    console.log('[AdminLoginScreen] Attempting admin login...');
    const result = await login(email, password);
    console.log('[AdminLoginScreen] Login result:', result);
    
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    } else if (result.requiresAdminVerification) {
      console.log('[AdminLoginScreen] 2FA required, navigating to verification');
      // Navigate to the AdminVerification screen with the email parameter
      navigation.navigate('AdminVerification', { email: result.email });
    } else {
      console.log('[AdminLoginScreen] Login successful');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.adminBadge}>🔐 ADMIN</Text>
          <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>
            Admin Login
          </Text>
          <Text style={[styles.subtitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
            Secure admin access with 2FA
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e' }]}>
          {error ? (
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: theme === 'light' ? '#FEE2E2' : '#7F1D1D',
                  borderColor: theme === 'light' ? '#FCA5A5' : '#FCA5A5'
                }
              ]}
            >
              <Text style={[styles.alertText, { color: theme === 'light' ? '#991B1B' : '#FEE2E2' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme === 'light' ? '#374151' : '#D1D5DB' }]}>
            Admin Email
          </Text>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: theme === 'light' ? '#F9FAFB' : '#272727', 
                color: theme === 'light' ? '#111827' : 'white',
                borderColor: theme === 'light' ? '#D1D5DB' : '#374151'
              }
            ]}
            placeholder="admin@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={[styles.label, { color: theme === 'light' ? '#374151' : '#D1D5DB' }]}>
            Admin Password
          </Text>
          <View style={[styles.passwordContainer, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#272727', borderColor: theme === 'light' ? '#D1D5DB' : '#374151' }]}>
            <TextInput
              style={[styles.passwordInput, { color: theme === 'light' ? '#111827' : 'white' }]}
              placeholder="Enter admin password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAdminLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Login as Admin</Text>
            )}
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: theme === 'light' ? '#EFF6FF' : '#1E3A8A20', borderColor: theme === 'light' ? '#BFDBFE' : '#3B82F6' }]}>
            <Text style={[styles.infoTitle, { color: theme === 'light' ? '#1E40AF' : '#93C5FD' }]}>
              🛡️ Enhanced Security
            </Text>
            <Text style={[styles.infoText, { color: theme === 'light' ? '#1E3A8A' : '#BFDBFE' }]}>
              Admin accounts require two-factor authentication. A verification code will be sent to your email.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.backButtonText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
              ← Back to Welcome
            </Text>
          </TouchableOpacity>
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
  adminBadge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
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
  alertBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertText: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  eyeIconText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#EF4444',
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
  infoBox: {
    marginTop: 16,
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
  backButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
