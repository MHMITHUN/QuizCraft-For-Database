import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Share, 
  Animated, 
  ScrollView,
  Alert,
  Platform,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { quizAPI, classesAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

const { width: screenWidth } = Dimensions.get('window');

export default function QuizDetailScreen({ route, navigation }) {
  const { id, assignToClassId } = route.params || {};
  const { t } = useI18n();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const { theme } = useTheme();

  useEffect(() => {
    loadQuizData();
    if (user?.role === 'teacher') {
      loadTeacherClasses();
    }
    
    // Auto-assign if coming from teacher dashboard
    if (assignToClassId && user?.role === 'teacher') {
      setShowAssignModal(true);
    }
  }, [id, assignToClassId]);

  const loadQuizData = async () => {
    try {
      const res = await quizAPI.getById(id);
      setQuiz(res?.data?.data?.quiz || null);
      
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fade, {
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
    } catch (error) {
      console.error('Load quiz error:', error);
      Alert.alert('Error', 'Failed to load quiz details');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherClasses = async () => {
    try {
      const res = await classesAPI.mine();
      setClasses(res?.data?.data?.classes || []);
    } catch (error) {
      console.warn('Failed to load classes:', error);
    }
  };

  const startQuiz = () => {
    navigation.navigate('TakeQuiz', { id });
  };

  const shareQuiz = async () => {
    try {
      const quizUrl = `https://quizcraft.app/quiz/${id}`;  // Replace with your actual domain
      const shareMessage = `Check out this amazing quiz: "${quiz?.title}"\n\n${quiz?.description || 'Test your knowledge!'}\n\nQuestions: ${quiz?.questions?.length || 0}\nCategory: ${quiz?.category || 'General'}\n\nPlay now: ${quizUrl}`;
      
      const shareOptions = {
        message: shareMessage,
        title: `QuizCraft - ${quiz?.title}`,
        ...(Platform.OS === 'ios' && { url: quizUrl })
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const copyQuizLink = async () => {
    try {
      const quizUrl = `https://quizcraft.app/quiz/${id}`;
      await Clipboard.setStringAsync(quizUrl);
      Alert.alert('Copied!', 'Quiz link copied to clipboard');
    } catch (error) {
      console.warn('Copy link error:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const showAssignQuizModal = () => {
    if (user?.role !== 'teacher') {
      Alert.alert('Access Denied', 'Only teachers can assign quizzes to classes.');
      return;
    }
    
    if (classes.length === 0) {
      Alert.alert(
        'No Classes',
        'You need to create a class first before assigning quizzes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Class', onPress: () => navigation.navigate('TeacherDashboard') }
        ]
      );
      return;
    }
    
    setShowAssignModal(true);
  };

  const assignQuizToClass = async (classId) => {
    setAssigning(true);
    try {
      await classesAPI.assignQuiz(classId, id);
      setShowAssignModal(false);
      
      const assignedClass = classes.find(c => c._id === classId);
      Alert.alert(
        'Quiz Assigned!',
        `"${quiz?.title}" has been successfully assigned to class "${assignedClass?.name}". Students in this class can now take the quiz.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Assign quiz error:', error);
      Alert.alert('Error', 'Failed to assign quiz to class. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={styles.classItem}
      onPress={() => assignQuizToClass(item._id)}
      disabled={assigning}
      activeOpacity={0.7}
    >
      <View style={styles.classInfo}>
        <Text style={styles.className}>{item.name}</Text>
        <Text style={styles.classCode}>Code: {item.code}</Text>
        <Text style={styles.classStudents}>
          {item.students?.length || 0} student{item.students?.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.assignIcon}>
        <Ionicons name="arrow-forward-circle" size={24} color="#4F46E5" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={[styles.loadingText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Loading quiz details...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
        <Text style={[styles.errorText, { color: theme === 'light' ? '#EF4444' : '#FCA5A5' }]}>Quiz not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}> 
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Quiz Header */}
          <View style={styles.quizHeader}>
            <View style={styles.quizIconContainer}>
              <LinearGradient 
                colors={['#4F46E5', '#7C3AED']} 
                style={styles.quizIcon}
              >
                <Text style={styles.quizIconText}>🎯</Text>
              </LinearGradient>
            </View>
            
            <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>{quiz.title}</Text>
            
            {!!quiz.description && (
              <Text style={[styles.description, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{quiz.description}</Text>
            )}
          </View>

          {/* Quiz Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
              <View style={styles.statIcon}>
                <Ionicons name="help-circle" size={24} color="#4F46E5" />
              </View>
              <Text style={[styles.statNumber, { color: theme === 'light' ? '#111827' : 'white' }]}>{quiz.questions?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Questions</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
              <View style={styles.statIcon}>
                <Ionicons name="folder" size={24} color="#10B981" />
              </View>
              <Text style={[styles.statNumber, { color: theme === 'light' ? '#111827' : 'white' }]}>{quiz.category || 'General'}</Text>
              <Text style={[styles.statLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Category</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
              <View style={[styles.statIcon, { backgroundColor: getDifficultyColor(quiz.difficulty) + '20' }]}>
                <Ionicons 
                  name="bar-chart" 
                  size={24} 
                  color={getDifficultyColor(quiz.difficulty)} 
                />
              </View>
              <Text style={[styles.statNumber, { color: getDifficultyColor(quiz.difficulty) }]}>
                {quiz.difficulty || 'Medium'}
              </Text>
              <Text style={[styles.statLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Difficulty</Text>
            </View>
          </View>

          {/* Creator Info */}
          {quiz.creator && (
            <View style={[styles.creatorCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
              <Ionicons name="person-circle" size={40} color="#6B7280" />
              <View style={styles.creatorInfo}>
                <Text style={[styles.creatorName, { color: theme === 'light' ? '#111827' : 'white' }]}>
                  Created by {quiz.creator.name || 'Unknown'}
                </Text>
                <Text style={[styles.createdDate, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Start Quiz Button */}
            <TouchableOpacity 
              style={styles.primaryAction} 
              onPress={startQuiz}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#4F46E5', '#7C3AED']} 
                style={styles.primaryActionGradient}
              >
                <Ionicons name="play" size={24} color="white" />
                <Text style={styles.primaryActionText}>Start Quiz</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Actions */}
            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={[styles.secondaryAction, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
                onPress={shareQuiz}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={20} color="#4F46E5" />
                <Text style={styles.secondaryActionText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryAction, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
                onPress={copyQuizLink}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={20} color="#4F46E5" />
                <Text style={styles.secondaryActionText}>Copy Link</Text>
              </TouchableOpacity>
              
              {user?.role === 'teacher' && (
                <TouchableOpacity 
                  style={[styles.secondaryAction, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
                  onPress={showAssignQuizModal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="school-outline" size={20} color="#4F46E5" />
                  <Text style={styles.secondaryActionText}>Assign</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderBottomColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}>
            <Text style={[styles.modalTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Assign Quiz to Class</Text>
            <TouchableOpacity 
              onPress={() => setShowAssignModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
              Select a class to assign "{quiz.title}" to:
            </Text>
            
            {classes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>No classes available</Text>
                <TouchableOpacity 
                  style={styles.createClassButton}
                  onPress={() => {
                    setShowAssignModal(false);
                    navigation.navigate('TeacherDashboard');
                  }}
                >
                  <Text style={styles.createClassButtonText}>Create a Class</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={classes}
                renderItem={renderClassItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.classesList}
              />
            )}
            
            {assigning && (
              <View style={styles.assigningOverlay}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.assigningText}>Assigning quiz...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quizHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  quizIconContainer: {
    marginBottom: 16,
  },
  quizIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
      }
    }),
  },
  quizIconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }
    }),
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  creatorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }
    }),
  },
  creatorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  createdDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionContainer: {
    gap: 16,
  },
  primaryAction: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
      }
    }),
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  secondaryAction: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }
    }),
  },
  secondaryActionText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 24,
  },
  classesList: {
    paddingBottom: 20,
  },
  classItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }
    }),
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  classCode: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  classStudents: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  assignIcon: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 20,
  },
  createClassButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  createClassButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  assigningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigningText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
});

