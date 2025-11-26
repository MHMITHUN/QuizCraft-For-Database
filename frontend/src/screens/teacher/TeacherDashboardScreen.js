
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { classesAPI, quizAPI, analyticsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const StatCard = ({ label, value, icon, colors }) => (
  <LinearGradient colors={colors} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
    <View style={styles.statIconBadge}>
      <Ionicons name={icon} size={20} color="#ffffff" />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </LinearGradient>
);

const QuickActionCard = ({ label, description, icon, colors, onPress }) => (
  <TouchableOpacity activeOpacity={0.92} style={styles.quickActionWrapper} onPress={onPress}>
    <LinearGradient colors={colors} style={styles.quickActionCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.quickActionIconWrapper}>
        <Ionicons name={icon} size={24} color="#ffffff" />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#E0E7FF" />
    </LinearGradient>
  </TouchableOpacity>
);

const SectionHeader = ({ title, actionLabel, onPressAction, theme }) => {
  const isLight = theme === 'light';
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onPressAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const ClassCard = ({
  classItem,
  theme,
  onViewDetails,
  onAssignQuiz,
  onCopyCode,
  onGenerateNewCode,
  onDeleteClass,
  performance,
}) => {
  const isLight = theme === 'light';
  const cardBackground = isLight ? '#FFFFFF' : '#111A2C';
  const textColor = isLight ? '#0F172A' : '#F8FAFC';
  const subtleText = isLight ? '#64748B' : '#94A3B8';
  const borderColor = isLight ? '#E2E8F0' : '#1F2A44';

  const topPerformer = performance?.topStudents?.[0];
  const createdAt = classItem?.createdAt ? new Date(classItem.createdAt) : null;

  return (
    <View style={[styles.classCard, { backgroundColor: cardBackground, borderColor }]}> 
      <View style={styles.classCardHeader}>
        <View style={styles.classTitleGroup}>
          <View style={styles.classIconBubble}>
            <Ionicons name="layers" size={18} color="#6366F1" />
          </View>
          <View style={styles.classTitleTextGroup}>
            <Text style={[styles.classTitle, { color: textColor }]} numberOfLines={1}>
              {classItem?.name || 'Untitled Class'}
            </Text>
            {classItem?.description ? (
              <Text style={[styles.classSubtitle, { color: subtleText }]} numberOfLines={1}>
                {classItem.description}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity onPress={() => onCopyCode(classItem)} style={styles.codePill}>
          <Ionicons name="copy" size={16} color="#4F46E5" />
          <Text style={styles.codePillText}>{classItem?.code || '-'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.classStatsRow}>
        <View style={styles.classStatItem}>
          <Ionicons name="people" size={16} color="#6366F1" />
          <Text style={[styles.classStatLabel, { color: subtleText }]}>
            {classItem?.students?.length || 0} students
          </Text>
        </View>
        <View style={styles.classStatItem}>
          <Ionicons name="library" size={16} color="#8B5CF6" />
          <Text style={[styles.classStatLabel, { color: subtleText }]}>
            {classItem?.quizzes?.length || 0} quizzes
          </Text>
        </View>
        <View style={styles.classStatItem}>
          <Ionicons name="time" size={16} color="#F59E0B" />
          <Text style={[styles.classStatLabel, { color: subtleText }]}>
            {createdAt ? createdAt.toLocaleDateString() : '-'}
          </Text>
        </View>
      </View>

      {topPerformer ? (
        <View style={[styles.performanceBanner, { backgroundColor: isLight ? '#EEF2FF' : '#1E293B' }]}> 
          <Ionicons name="trophy" size={18} color="#F97316" />
          <Text style={[styles.performanceText, { color: textColor }]} numberOfLines={1}>
            Top performer: {topPerformer.name || 'Student'} ({topPerformer.averageScore || 0}% avg)
          </Text>
        </View>
      ) : null}

      <View style={styles.classActionsRow}>
        <TouchableOpacity style={styles.classActionButtonPrimary} onPress={() => onViewDetails(classItem)}>
          <Ionicons name="eye" size={16} color="#FFFFFF" />
          <Text style={styles.classActionPrimaryText}>View details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.classActionButtonSecondary} onPress={() => onAssignQuiz(classItem)}>
          <Ionicons name="add-circle" size={16} color="#4F46E5" />
          <Text style={styles.classActionSecondaryText}>Assign quiz</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.classFooterActions}>
        <TouchableOpacity style={styles.classFooterChip} onPress={() => onGenerateNewCode(classItem)}>
          <Ionicons name="refresh" size={14} color="#6366F1" />
          <Text style={[styles.classFooterChipText, { color: '#4F46E5' }]}>New code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.classFooterChip} onPress={() => onDeleteClass(classItem)}>
          <Ionicons name="trash" size={14} color="#EF4444" />
          <Text style={[styles.classFooterChipText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const CreateClassModal = ({
  visible,
  theme,
  onClose,
  onSubmit,
  creating,
  className,
  onChangeClassName,
  classDescription,
  onChangeClassDescription,
  useRandomCode,
  onToggleCodeMode,
  generatedCode,
  onRegenerateCode,
  customCode,
  onChangeCustomCode,
  codeError,
}) => {
  const isLight = theme === 'light';
  const placeholderColor = isLight ? '#94A3B8' : '#64748B';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={styles.modalBackdropDismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: isLight ? '#FFFFFF' : '#0F172A' }]}> 
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalHeaderButton}>
              <Ionicons name="close" size={22} color={isLight ? '#0F172A' : '#F8FAFC'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>Create class</Text>
            <TouchableOpacity
              onPress={onSubmit}
              style={styles.modalHeaderButton}
              disabled={creating || !className.trim()}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Text
                  style={[
                    styles.modalActionText,
                    !className.trim() && styles.modalActionDisabled
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: isLight ? '#0F172A' : '#E2E8F0' }]}>Class name</Text>
              <TextInput
                value={className}
                onChangeText={onChangeClassName}
                placeholder="e.g. Algebra II Honors"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.modalInput,
                  { backgroundColor: isLight ? '#F8FAFC' : '#111A2C', color: isLight ? '#0F172A' : '#F8FAFC' }
                ]}
                maxLength={60}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: isLight ? '#0F172A' : '#E2E8F0' }]}>Description</Text>
              <TextInput
                value={classDescription}
                onChangeText={onChangeClassDescription}
                placeholder="What will this class cover?"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.modalInput,
                  styles.modalTextarea,
                  { backgroundColor: isLight ? '#F8FAFC' : '#111A2C', color: isLight ? '#0F172A' : '#F8FAFC' }
                ]}
                maxLength={160}
                multiline
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: isLight ? '#0F172A' : '#E2E8F0' }]}>Join code</Text>
              <View style={styles.codeModeRow}>
                <TouchableOpacity
                  style={[styles.codeModeButton, useRandomCode && styles.codeModeButtonActive]}
                  onPress={() => onToggleCodeMode('random')}
                >
                  <Ionicons
                    name={useRandomCode ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={useRandomCode ? '#4F46E5' : '#94A3B8'}
                  />
                  <Text style={[styles.codeModeText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>Generate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.codeModeButton, !useRandomCode && styles.codeModeButtonActive]}
                  onPress={() => onToggleCodeMode('custom')}
                >
                  <Ionicons
                    name={!useRandomCode ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={!useRandomCode ? '#4F46E5' : '#94A3B8'}
                  />
                  <Text style={[styles.codeModeText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>Custom</Text>
                </TouchableOpacity>
              </View>

              {useRandomCode ? (
                <View style={styles.generatedCodeRow}>
                  <View
                    style={[
                      styles.generatedCodeBox,
                      { backgroundColor: isLight ? '#F8FAFC' : '#111A2C', borderColor: isLight ? '#E2E8F0' : '#1F2A44' }
                    ]}
                  >
                    <Text style={[styles.generatedCodeText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
                      {generatedCode || 'Generating...'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={onRegenerateCode}
                  >
                    <Ionicons name="refresh" size={18} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <TextInput
                    value={customCode}
                    onChangeText={onChangeCustomCode}
                    placeholder="4-8 characters, letters & numbers"
                    placeholderTextColor={placeholderColor}
                    style={[
                      styles.modalInput,
                      { backgroundColor: isLight ? '#F8FAFC' : '#111A2C', color: isLight ? '#0F172A' : '#F8FAFC' },
                      codeError ? styles.modalInputError : null
                    ]}
                    maxLength={8}
                    autoCapitalize="characters"
                  />
                  {codeError ? (
                    <Text style={styles.codeErrorText}>{codeError}</Text>
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const AccountMenuModal = ({ visible, theme, user, onClose, onNavigateProfile, onNavigateQuizzes, onLogout }) => {
  const isLight = theme === 'light';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={styles.modalBackdropDismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.menuSheet, { backgroundColor: isLight ? '#FFFFFF' : '#0F172A' }]}> 
          <View style={styles.menuHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {(user?.name || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.menuHeaderText}>
              <Text style={[styles.menuName, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
                {user?.name || 'Teacher'}
              </Text>
              <Text style={styles.menuEmail} numberOfLines={1}>
                {user?.email || '-'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={onNavigateProfile}>
            <Ionicons name="person-circle" size={22} color="#4F46E5" />
            <Text style={[styles.menuItemText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>Profile & settings</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={onNavigateQuizzes}>
            <Ionicons name="library" size={22} color="#4F46E5" />
            <Text style={[styles.menuItemText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>My quiz library</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuLogout} onPress={onLogout}>
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.menuLogoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
export default function TeacherDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [performanceSnapshot, setPerformanceSnapshot] = useState({ averageScore: null, totalAttempts: 0, perClass: {} });

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [useRandomCode, setUseRandomCode] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const isLight = theme === 'light';
  const palette = useMemo(() => ({
    background: isLight ? '#F8FAFC' : '#020817',
    surface: isLight ? '#FFFFFF' : '#0F172A',
    subtleText: isLight ? '#64748B' : '#94A3B8',
    strongText: isLight ? '#0F172A' : '#F8FAFC',
  }), [isLight]);

  const requestUniqueCode = useCallback(async () => {
    let attempts = 0;
    while (attempts < 8) {
      const candidate = generateRandomCode();
      try {
        const response = await classesAPI.checkCodeExists(candidate);
        if (!response?.data?.exists) {
          return candidate;
        }
      } catch (error) {
        return candidate;
      }
      attempts += 1;
    }
    return null;
  }, []);

  const fetchPerformanceSnapshot = useCallback(async (classList) => {
    if (!Array.isArray(classList) || classList.length === 0) {
      setPerformanceSnapshot({ averageScore: null, totalAttempts: 0, perClass: {} });
      return;
    }

    try {
      const targetClasses = classList.slice(0, Math.min(classList.length, 3));
      const responses = await Promise.allSettled(targetClasses.map((item) => analyticsAPI.getClassLeaderboard(item._id)));

      let cumulativeScore = 0;
      let samples = 0;
      let attempts = 0;
      const perClass = {};

      responses.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          return;
        }
        const payload = result.value?.data?.data;
        if (!payload) {
          return;
        }
        const leaderboard = Array.isArray(payload.leaderboard) ? payload.leaderboard : [];
        const classId = targetClasses[index]._id;
        perClass[classId] = {
          className: payload.className,
          totalStudents: payload.totalStudents,
          topStudents: leaderboard.slice(0, 3),
        };

        if (leaderboard.length) {
          const classScore = leaderboard.reduce((sum, entry) => sum + (entry.averageScore || 0), 0) / leaderboard.length;
          if (Number.isFinite(classScore)) {
            cumulativeScore += classScore;
            samples += 1;
          }
          attempts += leaderboard.reduce((sum, entry) => sum + (entry.quizzesTaken || 0), 0);
        }
      });

      setPerformanceSnapshot({
        averageScore: samples ? Math.round((cumulativeScore / samples) * 10) / 10 : null,
        totalAttempts: attempts,
        perClass,
      });
    } catch (error) {
      setPerformanceSnapshot({ averageScore: null, totalAttempts: 0, perClass: {} });
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, quizzesRes] = await Promise.allSettled([
        classesAPI.mine(),
        quizAPI.getMyQuizzes().catch(() => null),
      ]);

      let classesData = [];
      if (classesRes.status === 'fulfilled') {
        classesData = classesRes.value?.data?.data?.classes || [];
        setClasses(classesData);
      } else {
        setClasses([]);
        Toast.error('Unable to load classes right now');
      }

      if (quizzesRes.status === 'fulfilled') {
        const quizzesPayload = quizzesRes.value?.data?.data?.quizzes || quizzesRes.value?.data?.quizzes || [];
        setQuizzes(Array.isArray(quizzesPayload) ? quizzesPayload : []);
      } else {
        setQuizzes([]);
      }

      await fetchPerformanceSnapshot(classesData);
    } catch (error) {
      Toast.error('Failed to load teacher dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPerformanceSnapshot]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + (item?.students?.length || 0), 0),
    [classes]
  );

  const statCards = useMemo(() => [
    {
      key: 'classes',
      label: 'Active classes',
      value: classes.length,
      icon: 'school-outline',
      colors: ['#6366F1', '#8B5CF6'],
    },
    {
      key: 'students',
      label: 'Enrolled students',
      value: totalStudents,
      icon: 'people-outline',
      colors: ['#14B8A6', '#22D3EE'],
    },
    {
      key: 'quizzes',
      label: 'Quizzes authored',
      value: quizzes.length,
      icon: 'library-outline',
      colors: ['#F97316', '#FACC15'],
    },
    {
      key: 'performance',
      label: 'Avg class score',
      value: performanceSnapshot.averageScore === null ? '--' : `${performanceSnapshot.averageScore}%`,
      icon: 'stats-chart',
      colors: ['#6366F1', '#22D3EE'],
    },
  ], [classes.length, totalStudents, quizzes.length, performanceSnapshot.averageScore]);


  const openCreateModal = useCallback(async () => {
    setClassName('');
    setClassDescription('');
    setCustomCode('');
    setCodeError('');
    setUseRandomCode(true);
    setCreateModalVisible(true);
    const code = await requestUniqueCode();
    if (code) {
      setGeneratedCode(code);
    } else {
      Toast.error('Unable to prepare a secure join code. Try again.');
    }
  }, [requestUniqueCode]);

  const quickActions = useMemo(() => [
    {
      key: 'create-class',
      label: 'Create a class',
      description: 'Spin up a new cohort in seconds',
      icon: 'add-circle',
      colors: ['#4F46E5', '#7C3AED'],
      action: () => openCreateModal(),
    },
    {
      key: 'create-quiz',
      label: 'Create a quiz',
      description: 'Upload PDF or create custom quiz',
      icon: 'document-text',
      colors: ['#EC4899', '#8B5CF6'],
      action: () => navigation.navigate('MainTabs', { screen: 'Upload' }),
    },
    {
      key: 'assign-quiz',
      label: 'Assign a quiz',
      description: 'Share your latest assessments',
      icon: 'send',
      colors: ['#0EA5E9', '#6366F1'],
      action: () => {
        if (!classes.length) {
          Toast.info('Create a class first to assign quizzes');
          return;
        }
        navigation.navigate('MyQuizzes', { assignToClassId: classes[0]._id });
      },
    },
    {
      key: 'gradebook',
      label: 'Open gradebook',
      description: 'Track mastery across classes',
      icon: 'grid',
      colors: ['#14B8A6', '#0EA5E9'],
      action: () => navigation.navigate('Gradebook'),
    },
    {
      key: 'analytics',
      label: 'Analytics hub',
      description: 'Deep insights on performance',
      icon: 'analytics',
      colors: ['#F59E0B', '#F97316'],
      action: () => navigation.navigate('AdvancedReports'),
    },
  ], [classes, navigation, openCreateModal]);

  const handleToggleCodeMode = useCallback(async (mode) => {
    if (mode === 'random') {
      setUseRandomCode(true);
      setCustomCode('');
      setCodeError('');
      if (!generatedCode) {
        const code = await requestUniqueCode();
        if (code) {
          setGeneratedCode(code);
        }
      }
    } else {
      setUseRandomCode(false);
      setGeneratedCode('');
      setCodeError('');
    }
  }, [generatedCode, requestUniqueCode]);

  const handleValidateCustomCode = useCallback(async (value) => {
    if (!value) {
      setCodeError('');
      return;
    }
    if (value.length < 4 || value.length > 8) {
      setCodeError('Code must be 4-8 characters long');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(value)) {
      setCodeError('Use only letters and numbers');
      return;
    }
    try {
      const response = await classesAPI.checkCodeExists(value);
      if (response?.data?.exists) {
        setCodeError('This code is already in use');
      } else {
        setCodeError('');
      }
    } catch (error) {
      setCodeError('Could not validate code, please retry');
    }
  }, []);

  const handleCreateClass = useCallback(async () => {
    if (!className.trim()) {
      Toast.warning('Give your class a name to continue');
      return;
    }

    if (!useRandomCode && codeError) {
      Toast.error('Resolve the code issue before creating the class');
      return;
    }

    setCreatingClass(true);
    try {
      let finalCode;
      if (useRandomCode) {
        finalCode = generatedCode || await requestUniqueCode();
        if (!finalCode) {
          Toast.error('Unable to generate a secure join code');
          setCreatingClass(false);
          return;
        }
      } else {
        const prepared = customCode.trim().toUpperCase();
        if (!prepared) {
          Toast.warning('Enter a custom code or switch to auto-generate');
          setCreatingClass(false);
          return;
        }
        const existsCheck = await classesAPI.checkCodeExists(prepared);
        if (existsCheck?.data?.exists) {
          setCodeError('This code is already in use');
          setCreatingClass(false);
          return;
        }
        finalCode = prepared;
      }

      await classesAPI.create({
        name: className.trim(),
        description: classDescription.trim(),
        code: finalCode,
      });

      Toast.success('Class created and ready to go!');
      setCreateModalVisible(false);
      setClassName('');
      setClassDescription('');
      setCustomCode('');
      setGeneratedCode('');
      await loadDashboard();
    } catch (error) {
      Toast.error('Unable to create class, please try again');
    } finally {
      setCreatingClass(false);
    }
  }, [className, classDescription, useRandomCode, codeError, generatedCode, customCode, requestUniqueCode, loadDashboard]);

  const handleCopyCode = useCallback(async (classItem) => {
    try {
      await Clipboard.setStringAsync(classItem?.code || '');
      Toast.success('Class code copied');
    } catch (error) {
      Toast.error('Unable to copy code');
    }
  }, []);

  const handleGenerateNewCode = useCallback((classItem) => {
    Alert.alert(
      'Generate new code',
      'Students will no longer be able to join with the previous code. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await classesAPI.generateNewCode(classItem._id);
              const nextCode = response?.data?.data?.code;
              if (nextCode) {
                setClasses((prev) => prev.map((item) => (item._id === classItem._id ? { ...item, code: nextCode } : item)));
                Toast.success('New join code created');
              }
            } catch (error) {
              Toast.error('Could not generate a new code');
            }
          },
        },
      ]
    );
  }, []);

  const handleDeleteClass = useCallback((classItem) => {
    Alert.alert(
      'Delete class',
      `Remove "${classItem?.name || 'this class'}" and its roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await classesAPI.delete(classItem._id);
              Toast.success('Class removed');
              loadDashboard();
            } catch (error) {
              Toast.error('Unable to delete class');
            }
          },
        },
      ]
    );
  }, [loadDashboard]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log out',
      'Ready to sign out of the teacher workspace?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Toast.success('You are signed out');
            } catch (error) {
              Toast.error('Could not log out');
            }
          },
        },
      ]
    );
  }, [logout]);

  const handleAssignQuiz = useCallback((classItem) => {
    navigation.navigate('MyQuizzes', { assignToClassId: classItem._id });
  }, [navigation]);

  const handleViewClass = useCallback((classItem) => {
    navigation.navigate('ClassDetail', { id: classItem._id });
  }, [navigation]);

  const handleNavigateProfile = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('MainTabs', { screen: 'Profile' });
  }, [navigation]);

  const handleNavigateQuizzes = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('MyQuizzes');
  }, [navigation]);
  const isEmpty = !loading && classes.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}> 
      <LinearGradient
        colors={isLight ? ['#312E81', '#5B21B6'] : ['#0F172A', '#1E1B4B']}
        style={styles.hero}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroEyebrow}>Teacher workspace</Text>
            <Text style={styles.heroTitle}>Hello {user?.name?.split(' ')[0] || 'there'}!</Text>
            <Text style={styles.heroSubtitle}>Let's keep your learners inspired today.</Text>
          </View>
          <TouchableOpacity style={styles.heroAvatarButton} onPress={() => setMenuVisible(true)}>
            <View style={styles.heroAvatarCircle}>
              <Text style={styles.heroAvatarInitial}>{(user?.name || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.heroPrimaryButton} onPress={openCreateModal}>
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.heroPrimaryButtonText}>Create a class</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.statGrid}>
          {statCards.map(({ key, ...card }) => (
            <StatCard key={key} {...card} />
          ))}
        </View>

        <SectionHeader
          title="Quick actions"
          theme={theme}
        />
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.key}
              label={action.label}
              description={action.description}
              icon={action.icon}
              colors={action.colors}
              onPress={action.action}
            />
          ))}
        </View>

        <SectionHeader
          title="Your classes"
          actionLabel={classes.length ? 'View analytics' : null}
          onPressAction={() => navigation.navigate('StudentProgress')}
          theme={theme}
        />

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={[styles.loadingLabel, { color: palette.subtleText }]}>Preparing your dashboard...</Text>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={[styles.emptyState, { borderColor: isLight ? '#E2E8F0' : '#1F2A44', backgroundColor: palette.surface }]}> 
            <Ionicons name="sparkles" size={28} color="#6366F1" />
            <Text style={[styles.emptyTitle, { color: palette.strongText }]}>Build your first class</Text>
            <Text style={[styles.emptySubtitle, { color: palette.subtleText }]}>Organise students, assign quizzes, and follow their progress in real-time.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
              <Text style={styles.emptyButtonText}>Start now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.classList}>
            {classes.map((item) => (
              <ClassCard
                key={item._id}
                classItem={item}
                theme={theme}
                onViewDetails={handleViewClass}
                onAssignQuiz={handleAssignQuiz}
                onCopyCode={handleCopyCode}
                onGenerateNewCode={handleGenerateNewCode}
                onDeleteClass={handleDeleteClass}
                performance={performanceSnapshot.perClass[item._id]}
              />
            ))}
          </View>
        )}

        <SectionHeader
          title="Latest quizzes"
          actionLabel={quizzes.length ? 'Manage' : null}
          onPressAction={() => navigation.navigate('MyQuizzes')}
          theme={theme}
        />

        {quizzes.length ? (
          <View style={[styles.quizList, { backgroundColor: palette.surface }]}> 
            {quizzes.slice(0, 4).map((quiz) => (
              <TouchableOpacity
                key={quiz._id}
                style={styles.quizItem}
                onPress={() => navigation.navigate('QuizAnalytics', { quizId: quiz._id })}
              >
                <View style={styles.quizIcon}>
                  <Ionicons name="document-text" size={18} color="#6366F1" />
                </View>
                <View style={styles.quizContent}>
                  <Text style={[styles.quizTitle, { color: palette.strongText }]} numberOfLines={1}>
                    {quiz.title || 'Untitled quiz'}
                  </Text>
                  <Text style={[styles.quizMeta, { color: palette.subtleText }]} numberOfLines={1}>
                    {quiz.category || 'General'} - {quiz.questions?.length || 0} questions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.subtleText} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyInline, { backgroundColor: palette.surface }]}> 
            <Text style={[styles.emptyInlineText, { color: palette.subtleText }]}>No quizzes yet-create one to engage your class.</Text>
          </View>
        )}
      </ScrollView>

      <CreateClassModal
        visible={createModalVisible}
        theme={theme}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateClass}
        creating={creatingClass}
        className={className}
        onChangeClassName={setClassName}
        classDescription={classDescription}
        onChangeClassDescription={setClassDescription}
        useRandomCode={useRandomCode}
        onToggleCodeMode={handleToggleCodeMode}
        generatedCode={generatedCode}
        onRegenerateCode={async () => {
          const code = await requestUniqueCode();
          if (code) {
            setGeneratedCode(code);
          } else {
            Toast.error('Unable to generate a new code');
          }
        }}
        customCode={customCode}
        onChangeCustomCode={(value) => {
          const upper = value.toUpperCase();
          setCustomCode(upper);
          handleValidateCustomCode(upper);
        }}
        codeError={codeError}
      />

      <AccountMenuModal
        visible={menuVisible}
        theme={theme}
        user={user}
        onClose={() => setMenuVisible(false)}
        onNavigateProfile={handleNavigateProfile}
        onNavigateQuizzes={handleNavigateQuizzes}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTextGroup: {
    flex: 1,
    paddingRight: 16,
  },
  heroEyebrow: {
    color: '#A5B4FC',
    fontSize: 14,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#CBD5F5',
    fontSize: 16,
  },
  heroAvatarButton: {
    padding: 4,
  },
  heroAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  heroPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  heroPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionAction: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  quickActionWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  quickActionCard: {
    borderRadius: 18,
    padding: 18,
    minHeight: 150,
    justifyContent: 'space-between',
  },
  quickActionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionContent: {
    flex: 1,
    marginBottom: 12,
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  quickActionDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  classList: {
    gap: 16,
    marginBottom: 24,
  },
  classCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  classTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  classIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classTitleTextGroup: {
    flex: 1,
  },
  classTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  classSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79,70,229,0.12)',
  },
  codePillText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 13,
  },
  classStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  classStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  classStatLabel: {
    fontSize: 13,
  },
  performanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  performanceText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  classActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  classActionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
  },
  classActionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  classActionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(79,70,229,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  classActionSecondaryText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  classFooterActions: {
    flexDirection: 'row',
    gap: 12,
  },
  classFooterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  classFooterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quizList: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  quizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quizIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizContent: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  quizMeta: {
    fontSize: 13,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyInline: {
    borderRadius: 18,
    padding: 18,
  },
  emptyInlineText: {
    fontSize: 14,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalHeaderButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalActionText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 15,
  },
  modalActionDisabled: {
    color: '#94A3B8',
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  modalTextarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalInputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  codeModeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  codeModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  codeModeButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79,70,229,0.12)',
  },
  codeModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generatedCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  generatedCodeBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generatedCodeText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  regenerateButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeErrorText: {
    color: '#EF4444',
    marginTop: 8,
    fontSize: 13,
  },
  menuSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4338CA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  menuHeaderText: {
    flex: 1,
  },
  menuName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  menuEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.25)',
    marginVertical: 12,
  },
  menuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  menuLogoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});





