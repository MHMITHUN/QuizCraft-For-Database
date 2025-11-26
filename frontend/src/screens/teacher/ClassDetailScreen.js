
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { classesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';

const buildInitials = (value, fallback = '?') => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return fallback;
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || fallback;
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString();
};

export default function ClassDetailScreen({ route, navigation }) {
  const classId = route?.params?.id;
  const { user } = useAuth();
  const { theme } = useTheme();

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classData, setClassData] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(false);

  const palette = useMemo(() => ({
    background: theme === 'light' ? '#F8FAFC' : '#020817',
    surface: theme === 'light' ? '#FFFFFF' : '#0F172A',
    border: theme === 'light' ? '#E2E8F0' : '#1F2937',
    textPrimary: theme === 'light' ? '#0F172A' : '#F8FAFC',
    textSecondary: theme === 'light' ? '#64748B' : '#94A3B8',
  }), [theme]);

  const loadClass = useCallback(async () => {
    if (!classId) {
      return;
    }
    try {
      const promises = [classesAPI.getById(classId)];
      if (isTeacher) {
        promises.push(classesAPI.getJoinRequests(classId));
      }

      const [classRes, requestsRes] = await Promise.allSettled(promises);

      if (classRes.status === 'fulfilled') {
        setClassData(classRes.value?.data?.data?.class || null);
      } else {
        setClassData(null);
        Toast.error('Unable to load class details');
      }

      if (isTeacher && requestsRes && requestsRes.status === 'fulfilled') {
        setJoinRequests(requestsRes.value?.data?.data?.requests || []);
      } else {
        setJoinRequests([]);
      }
    } catch (error) {
      Toast.error('Failed to load class information');
      setClassData(null);
      setJoinRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, isTeacher]);

  useEffect(() => {
    setLoading(true);
    loadClass();
  }, [loadClass]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClass();
  }, [loadClass]);

  const handleCopyCode = useCallback(async () => {
    if (!classData?.code) {
      return;
    }
    try {
      await Clipboard.setStringAsync(classData.code);
      Toast.success('Class code copied');
    } catch (error) {
      Toast.error('Unable to copy code right now');
    }
  }, [classData]);

  const handleShareCode = useCallback(() => {
    if (!classData?.code) {
      return;
    }
    Share.share({
      message: `Join my QuizCraft class "${classData.name}" with code: ${classData.code}`,
      title: 'Share class code',
    }).catch(() => Toast.error('Unable to share code'));
  }, [classData]);

  const handleGenerateNewCode = useCallback(() => {
    if (!classId) {
      return;
    }
    Alert.alert(
      'Generate new code',
      'Students will no longer be able to join with the current code. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await classesAPI.generateNewCode(classId);
              const nextCode = response?.data?.data?.code;
              if (nextCode) {
                setClassData((prev) => (prev ? { ...prev, code: nextCode } : prev));
                Toast.success('New join code created');
              }
            } catch (error) {
              Toast.error('Unable to generate a new code');
            }
          },
        },
      ],
    );
  }, [classId]);

  const handleJoinRequest = useCallback(async (requestId, action) => {
    if (!classId) {
      return;
    }
    setProcessingRequest(true);
    try {
      await classesAPI.handleJoinRequest(classId, requestId, action);
      const message = action === 'approve' ? 'Request approved' : 'Request rejected';
      Toast.success(message);
      loadClass();
    } catch (error) {
      Toast.error('Unable to update request');
    } finally {
      setProcessingRequest(false);
    }
  }, [classId, loadClass]);

  const handleRemoveStudent = useCallback((studentId) => {
    if (!classId) {
      return;
    }
    Alert.alert(
      'Remove student',
      'Remove this student from the class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await classesAPI.removeStudent(classId, studentId);
              Toast.success('Student removed');
              loadClass();
            } catch (error) {
              Toast.error('Unable to remove student');
            }
          },
        },
      ],
    );
  }, [classId, loadClass]);

  const handleCreatePost = useCallback(async () => {
    if (!classId || !postMessage.trim()) {
      return;
    }
    setSubmittingPost(true);
    try {
      await classesAPI.createPost(classId, { message: postMessage.trim() });
      setPostMessage('');
      setPostModalVisible(false);
      Toast.success('Announcement posted');
      loadClass();
    } catch (error) {
      Toast.error('Unable to post announcement');
    } finally {
      setSubmittingPost(false);
    }
  }, [classId, postMessage, loadClass]);

  const headerSubtitle = useMemo(() => {
    const createdAt = classData?.createdAt ? new Date(classData.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return 'Class overview';
    }
    return `Created ${createdAt.toLocaleDateString()}`;
  }, [classData]);

  const summaryCards = useMemo(() => ([
    {
      key: 'students',
      label: 'Students',
      value: classData?.students?.length || 0,
      icon: 'people',
      color: '#6366F1',
    },
    {
      key: 'quizzes',
      label: 'Quizzes assigned',
      value: classData?.quizzes?.length || 0,
      icon: 'book',
      color: '#F97316',
    },
    {
      key: 'requests',
      label: 'Join requests',
      value: joinRequests.length,
      icon: 'person-add',
      color: '#10B981',
    },
  ]), [classData, joinRequests.length]);

  const sortedPosts = useMemo(() => {
    const posts = Array.isArray(classData?.posts) ? classData.posts : [];
    return posts
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [classData]);

  const studentList = useMemo(() => Array.isArray(classData?.students) ? classData.students : [], [classData]);
  const quizList = useMemo(() => Array.isArray(classData?.quizzes) ? classData.quizzes : [], [classData]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading class details...</Text>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <Ionicons name="alert-circle" size={56} color="#EF4444" />
        <Text style={[styles.errorText, { color: palette.textPrimary }]}>Class not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadClass}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <LinearGradient colors={theme === 'light' ? ['#312E81', '#5B21B6'] : ['#0F172A', '#1E1B4B']} style={styles.hero}>
        <View style={styles.heroHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle} numberOfLines={1}>{classData.name}</Text>
            <Text style={styles.heroSubtitle}>{headerSubtitle}</Text>
          </View>
          {isTeacher && (
            <TouchableOpacity style={styles.iconButton} onPress={() => setPostModalVisible(true)}>
              <Ionicons name="megaphone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.heroCodeRow}>
          <Text style={styles.heroCodeLabel}>Join code</Text>
          <Text style={styles.heroCodeValue}>{classData.code || '----'}</Text>
          <TouchableOpacity style={styles.heroChip} onPress={handleCopyCode}>
            <Ionicons name="copy" size={16} color="#FFFFFF" />
            <Text style={styles.heroChipText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroChip} onPress={handleShareCode}>
            <Ionicons name="share-social" size={16} color="#FFFFFF" />
            <Text style={styles.heroChipText}>Share</Text>
          </TouchableOpacity>
          {isTeacher && (
            <TouchableOpacity style={styles.heroChip} onPress={handleGenerateNewCode}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.heroChipText}>New code</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.key} style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{card.value}</Text>
              <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{card.label}</Text>
            </View>
          ))}
        </View>

        {isTeacher && joinRequests.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Join requests</Text>
              <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{joinRequests.length} pending</Text>
            </View>
            {joinRequests.map((request) => (
              <View key={request._id} style={[styles.requestCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.requestAvatar}>
                  <Text style={styles.requestAvatarText}>{buildInitials(request.name, '?')}</Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestName, { color: palette.textPrimary }]} numberOfLines={1}>
                    {request.name || 'Pending user'}
                  </Text>
                  <Text style={[styles.requestEmail, { color: palette.textSecondary }]} numberOfLines={1}>
                    {request.email || 'No email provided'}
                  </Text>
                  <Text style={[styles.requestDate, { color: palette.textSecondary }]}>Requested {formatDate(request.createdAt)}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.requestButtonApprove]}
                    disabled={processingRequest}
                    onPress={() => handleJoinRequest(request._id, 'approve')}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.requestButtonReject]}
                    disabled={processingRequest}
                    onPress={() => handleJoinRequest(request._id, 'reject')}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Students</Text>
            <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{studentList.length} enrolled</Text>
          </View>
          {studentList.length ? (
            studentList.map((student) => (
              <View key={student._id || student.email} style={[styles.studentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>{buildInitials(student.name)}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: palette.textPrimary }]} numberOfLines={1}>{student.name || 'Student'}</Text>
                  <Text style={[styles.studentEmail, { color: palette.textSecondary }]} numberOfLines={1}>{student.email || 'No email'}</Text>
                </View>
                {isTeacher && (
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveStudent(student._id)}>
                    <Ionicons name="remove-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Ionicons name="person-outline" size={22} color={palette.textSecondary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No students yet</Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Assigned quizzes</Text>
            <Text style={[styles.sectionMeta, { color: palette.textSecondary }]}>{quizList.length}</Text>
          </View>
          {quizList.length ? (
            quizList.map((quiz) => (
              <TouchableOpacity
                key={quiz._id}
                style={[styles.quizCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => {
                  if (isTeacher) {
                    navigation.navigate('QuizAnalytics', { quizId: quiz._id });
                  } else {
                    navigation.navigate('TakeQuiz', { id: quiz._id, classId: classId });
                  }
                }}
              >
                <View>
                  <Text style={[styles.quizTitle, { color: palette.textPrimary }]} numberOfLines={1}>{quiz.title || 'Untitled quiz'}</Text>
                  <Text style={[styles.quizMeta, { color: palette.textSecondary }]}>
                    {quiz.category || 'General'} - {quiz.questions?.length || 0} questions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Ionicons name="document-outline" size={22} color={palette.textSecondary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No quizzes assigned yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Announcements</Text>
            <TouchableOpacity onPress={() => setPostModalVisible(true)}>
              <Text style={styles.addLink}>New announcement</Text>
            </TouchableOpacity>
          </View>
          {sortedPosts.length ? (
            sortedPosts.map((post) => (
              <View key={post._id} style={[styles.postCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.postHeader}>
                  <Text style={[styles.postAuthor, { color: palette.textPrimary }]}>
                    {post.author?.name || 'Teacher'}
                  </Text>
                  <Text style={[styles.postDate, { color: palette.textSecondary }]}>
                    {formatDate(post.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.postBody, { color: palette.textPrimary }]}>{post.message}</Text>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Ionicons name="megaphone-outline" size={22} color={palette.textSecondary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No announcements yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={postModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPostModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>New announcement</Text>
              <TouchableOpacity onPress={() => setPostModalVisible(false)}>
                <Ionicons name="close" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.postInput, { color: palette.textPrimary, borderColor: palette.border }]}
              multiline
              placeholder="Share an update with your class"
              placeholderTextColor={palette.textSecondary}
              value={postMessage}
              onChangeText={setPostMessage}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.submitButton, postMessage.trim().length === 0 ? styles.submitButtonDisabled : null]}
              onPress={handleCreatePost}
              disabled={submittingPost || postMessage.trim().length === 0}
            >
              {submittingPost ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Post announcement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: {
    flex: 1,
    marginHorizontal: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  heroCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  heroCodeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginRight: 6,
  },
  heroCodeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  summaryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 13,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  requestAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestEmail: {
    fontSize: 13,
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonApprove: {
    backgroundColor: '#10B981',
  },
  requestButtonReject: {
    backgroundColor: '#EF4444',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
  },
  removeButton: {
    padding: 6,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  quizCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quizMeta: {
    fontSize: 13,
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
  },
  postBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  addLink: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});





