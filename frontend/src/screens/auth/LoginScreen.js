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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../../components/ThemeToggle';

export default function LoginScreen({ navigation }) {
  const { t, setLang, lang } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { login, guestAccess, loading, error } = useAuth();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const result = await login(email, password);
    
    if (!result.success) {
      if (/verify/i.test(String(result.error))) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: () => navigation.navigate('VerifyEmail', { email }) }
          ]
        );
      } else {
        Alert.alert('Login Failed', result.error);
      }
    } else if (result.requiresAdminVerification) {
      // Admin detected - they should use Admin Login screen
      Alert.alert(
        'Admin Account Detected',
        'Please use the Admin Login for admin accounts.',
        [
          { text: 'OK', onPress: () => navigation.navigate('AdminLogin') }
        ]
      );
    }
    // Navigation to dashboard happens automatically via NavigationStateHandler
  };

  const handleGuestAccess = async () => {
    try {
      setGuestLoading(true);
      const result = await guestAccess();
      if (!result.success) {
        Alert.alert(t('common:error'), t('login:guestAccessFailed') + ': ' + result.error);
      }
      // Navigation happens automatically when user state changes
    } catch (error) {
      console.error('Guest access error:', error);
      Alert.alert(t('common:error'), t('login:guestAccessFailed'));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: theme === 'light' ? '#111827' : 'white' }]}>📚 QuizCraft</Text>
          <Text style={[styles.tagline, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('upload:aiPowered')}</Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e' }]}>
          <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>{t('login:title')}</Text>
          <Text style={[styles.subtitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('login:subtitle')}</Text>

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

          <TextInput
            style={[styles.input, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#272727', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#D1D5DB' : '#374151' }]}
            placeholder={t('login:email')}
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <View style={[styles.passwordContainer, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#272727', borderColor: theme === 'light' ? '#D1D5DB' : '#374151' }]}>
            <TextInput
              style={[styles.passwordInput, { color: theme === 'light' ? '#111827' : 'white' }]}
              placeholder={t('login:password')}
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
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>{t('login:signIn')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.guestButton, { borderColor: theme === 'light' ? '#4F46E5' : '#A5B4FC' }]}
            onPress={handleGuestAccess}
            disabled={loading || guestLoading}
          >
            {guestLoading ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <Text style={[styles.guestButtonText, { color: theme === 'light' ? '#4F46E5' : '#A5B4FC' }]}>{t('login:continueGuest')}</Text>
            )}
          </TouchableOpacity>
          
          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={[styles.forgotPasswordText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('login:forgotPassword')}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('login:prompt')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.link}>{t('login:signup')}</Text>
            </TouchableOpacity>
          </View>

          {/* Admin Login Button */}
          <TouchableOpacity
            style={[styles.adminLoginButton, { backgroundColor: theme === 'light' ? '#EF4444' : '#DC2626' }]}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            <Text style={styles.adminLoginButtonText}>🔐 Admin Login</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
  },
  langRow: { flexDirection: 'row', marginTop: 8 },
  langBtn: { borderWidth: 1, borderColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 4 },
  langBtnActive: { backgroundColor: '#4F46E5' },
  langLeft: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  langRight: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBtnText: { color: '#4F46E5', fontWeight: '700' },
  langBtnTextActive: { color: '#FFF' },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  alertBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  guestButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  link: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  adminLoginButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  adminLoginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testCredentials: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  testTitle: {
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  testText: {
    fontSize: 12,
    color: '#92400E',
  },
});
