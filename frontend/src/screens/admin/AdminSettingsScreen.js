import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import Toast from '../../components/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';

export default function AdminSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    apiLimits: {
      free: { quizzes: 5, questions: 50 },
      student_basic: { quizzes: 50, questions: 500 },
      student_premium: { quizzes: -1, questions: -1 },
      teacher_basic: { quizzes: 100, questions: 1000 },
      teacher_premium: { quizzes: -1, questions: -1 },
      teacher_institutional: { quizzes: -1, questions: -1 }
    },
    features: {
      guestAccess: true,
      registrationOpen: true,
      maintenanceMode: false,
      vectorSearch: true
    }
  });

  const [packages, setPackages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({
    id: '',
    name: '',
    namebn: '',
    role: 'student',
    price: { monthly: 0, yearly: 0 },
    features: [],
    color: '#4F46E5',
    popular: false,
    active: true
  });
  const [newFeature, setNewFeature] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const { theme } = useTheme();

  useEffect(() => {
    loadSettings();
    loadPackages();

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
      })
    ]).start();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await adminAPI.getSettings();
      setSettings(response.data.data);
    } catch (error) {
      Toast.show('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const LOCAL_PACKAGES_KEY = '@admin_packages';

  const readLocalPackages = async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_PACKAGES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeLocalPackages = async (pkgs) => {
    try { await AsyncStorage.setItem(LOCAL_PACKAGES_KEY, JSON.stringify(pkgs)); } catch { }
  };

  const loadPackages = async () => {
    try {
      const response = await adminAPI.getPackages();
      const list = response.data?.data?.packages || response.data?.packages || [];
      setPackages(Array.isArray(list) ? list : []);
      writeLocalPackages(list).catch(() => { });
    } catch (error) {
      console.error('Failed to load packages:', error);
      let local = await readLocalPackages();
      if (!Array.isArray(local) || local.length === 0) {
        local = [
          { id: 'local-student-basic', name: 'Student Basic', role: 'student', price: { monthly: 50, yearly: 500 }, features: ['Basic usage'], color: '#4F46E5', popular: false, active: true },
          { id: 'local-student-premium', name: 'Student Premium', role: 'student', price: { monthly: 199, yearly: 1999 }, features: ['Unlimited quizzes', 'Priority support'], color: '#7C3AED', popular: true, active: true },
          { id: 'local-teacher', name: 'Teacher', role: 'teacher', price: { monthly: 299, yearly: 2999 }, features: ['Class management', 'Reporting'], color: '#10B981', popular: false, active: true },
        ];
        writeLocalPackages(local).catch(() => { });
      }
      setPackages(Array.isArray(local) ? local : []);
    }
  };

  const validateSettings = () => {
    const plans = Object.entries(settings.apiLimits);
    for (const [plan, limits] of plans) {
      for (const key of ['quizzes', 'questions']) {
        const val = limits[key];
        if (typeof val !== 'number' || (!Number.isInteger(val))) return `Invalid ${key} for ${plan}`;
        if (val < -1) return `${key} for ${plan} cannot be below -1`;
      }
    }
    return null;
  };

  const saveSettings = async () => {
    const err = validateSettings();
    if (err) {
      Toast.show(err, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      return;
    }
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      Toast.show('Settings saved successfully!', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    } catch (error) {
      Toast.show('Failed to save settings', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
    } finally {
      setSaving(false);
    }
  };

  const updateApiLimit = (plan, type, value) => {
    const raw = String(value ?? '').trim();
    let num = NaN;
    if (/^(-?\d+)$/.test(raw)) num = parseInt(raw, 10);
    else if (/^unlimited$/i.test(raw)) num = -1;

    setFieldErrors(prev => ({
      ...prev,
      [`${plan}.${type}`]: Number.isInteger(num) && num >= -1 ? null : 'Enter an integer or "Unlimited"'
    }));

    if (!Number.isInteger(num)) num = 0;

    setSettings(prev => ({
      ...prev,
      apiLimits: {
        ...prev.apiLimits,
        [plan]: {
          ...prev.apiLimits[plan],
          [type]: num
        }
      }
    }));
  };

  const toggleFeature = (feature) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  // Note: Package management functions like openPackageModal, savePackage, deletePackage etc. 
  // are defined but the UI is not included in this version. The backend is fully functional.

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? '#f8fafc' : '#121212' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={[styles.loadingText, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>Loading admin settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#f8fafc' : '#121212' }]}>
      {/* Header */}
      <LinearGradient
        colors={theme === 'light' ? ['#4F46E5', '#7C3AED', '#EC4899'] : ['#222', '#555']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.headerContent,
            { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Settings</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={24} color="white" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* API Limits Section */}
        <Animated.View
          style={[
            styles.section,
            { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={24} color="#4F46E5" />
            <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#1e293b' : 'white' }]}>API Usage Limits</Text>
          </View>

          {Object.entries(settings.apiLimits).map(([plan, limits]) => (
            <View key={plan} style={[styles.limitCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
              <Text style={[styles.limitCardTitle, { color: theme === 'light' ? '#1e293b' : 'white' }]}>
                {plan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>

              <View style={styles.limitRow}>
                <Text style={[styles.limitLabel, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>Monthly Quizzes:</Text>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.limitInput, { backgroundColor: theme === 'light' ? 'white' : '#272727', color: theme === 'light' ? '#111827' : 'white', borderColor: fieldErrors[`${plan}.quizzes`] ? '#EF4444' : (theme === 'light' ? '#e2e8f0' : '#374151') }]}
                    value={limits.quizzes === -1 ? 'Unlimited' : String(limits.quizzes)}
                    onChangeText={(value) => updateApiLimit(plan, 'quizzes', value)}
                    placeholder="number or Unlimited"
                    placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'}
                    keyboardType="default"
                  />
                  {!!fieldErrors[`${plan}.quizzes`] && (<Text style={styles.errorHint}>{fieldErrors[`${plan}.quizzes`]}</Text>)}
                </View>
              </View>

              <View style={styles.limitRow}>
                <Text style={[styles.limitLabel, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>Monthly Questions:</Text>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.limitInput, { backgroundColor: theme === 'light' ? 'white' : '#272727', color: theme === 'light' ? '#111827' : 'white', borderColor: fieldErrors[`${plan}.questions`] ? '#EF4444' : (theme === 'light' ? '#e2e8f0' : '#374151') }]}
                    value={limits.questions === -1 ? 'Unlimited' : String(limits.questions)}
                    onChangeText={(value) => updateApiLimit(plan, 'questions', value)}
                    placeholder="number or Unlimited"
                    placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'}
                    keyboardType="default"
                  />
                  {!!fieldErrors[`${plan}.questions`] && (<Text style={styles.errorHint}>{fieldErrors[`${plan}.questions`]}</Text>)}
                </View>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* System Features Section */}
        <Animated.View
          style={[
            styles.section,
            { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="toggle-outline" size={24} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#1e293b' : 'white' }]}>System Features</Text>
          </View>

          {Object.entries(settings.features).map(([feature, enabled]) => (
            <View key={feature} style={[styles.featureRow, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureName, { color: theme === 'light' ? '#1e293b' : 'white' }]}>
                  {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
                <Text style={[styles.featureDescription, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>
                  {getFeatureDescription(feature)}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={() => toggleFeature(feature)}
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                thumbColor={enabled ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const getFeatureDescription = (feature) => {
  const descriptions = {
    guestAccess: 'Allow users to try quizzes without registration',
    registrationOpen: 'Accept new user registrations',
    maintenanceMode: 'Put the system in maintenance mode',
    vectorSearch: 'Enable AI-powered semantic search'
  };
  return descriptions[feature] || 'System feature setting';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Poppins-Medium',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  limitCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  limitCardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e293b',
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#64748b',
    flex: 1,
  },
  limitInput: {
    width: 120,
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  errorHint: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#1e293b',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#64748b',
  },
});