import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { classesAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

export default function JoinClassScreen({ navigation }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinedClasses, setJoinedClasses] = useState([]);
  const { theme } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Check if user is student
    if (user?.role !== 'student') {
      Alert.alert(
        'Access Denied',
        'Only students can join classes. Teachers can create classes from the Teacher Dashboard.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
      return;
    }

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

    loadJoinedClasses();
  }, []);

  const loadJoinedClasses = async () => {
    try {
      const res = await classesAPI.mine();
      setJoinedClasses(res?.data?.data?.classes || []);
    } catch (error) {
      console.warn('Failed to load joined classes:', error);
    }
  };

  const join = async () => {
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      Alert.alert('Error', 'Please enter a class code');
      return;
    }

    if (trimmedCode.length < 6) {
      Alert.alert('Error', 'Class code should be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await classesAPI.join(trimmedCode);
      const className = res?.data?.data?.class?.name || 'the class';
      
      Alert.alert(
        'Successfully Joined!',
        `You have successfully joined "${className}". You can now access assigned quizzes and participate in class activities.`,
        [
          {
            text: 'View Classes',
            onPress: () => {
              loadJoinedClasses();
              setCode('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Join class error:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to join class';
      
      if (message.includes('already joined')) {
        Alert.alert('Already Joined', 'You are already a member of this class.');
      } else if (message.includes('not found')) {
        Alert.alert('Invalid Code', 'No class found with this code. Please check the code and try again.');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const leaveClass = async (classId, className) => {
    Alert.alert(
      'Leave Class',
      `Are you sure you want to leave "${className}"? You will no longer have access to class quizzes and activities.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await classesAPI.leave(classId);
              loadJoinedClasses();
              Alert.alert('Success', `You have left "${className}"`);
            } catch (error) {
              Alert.alert('Error', 'Failed to leave class');
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient colors={theme === 'light' ? ['#4F46E5', '#7C3AED'] : ['#222','#555']} style={styles.gradient}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.emoji}>🏫</Text>
              <Text style={styles.title}>Join Class</Text>
              <Text style={styles.subtitle}>Enter the class code provided by your teacher</Text>
            </View>

            {/* Join Form Card */}
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e' }]}>
              <View style={styles.formHeader}>
                <View style={[styles.iconContainer, { backgroundColor: theme === 'light' ? '#EEF2FF' : '#4F46E520' }]}>
                  <Ionicons name="key" size={32} color="#4F46E5" />
                </View>
                <Text style={[styles.cardTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Enter Class Code</Text>
                <Text style={[styles.cardDescription, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                  Ask your teacher for the 6-digit class code
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727', color: theme === 'light' ? '#111827' : 'white' }]}
                  placeholder="Enter class code (e.g., ABC123)"
                  placeholderTextColor="#9CA3AF"
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                  editable={!loading}
                />
                <View style={styles.inputIcon}>
                  <Ionicons name="school" size={20} color="#6B7280" />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.joinButton, loading && styles.buttonDisabled]}
                onPress={join}
                disabled={loading || !code.trim()}
              >
                <LinearGradient
                  colors={loading || !code.trim() ? ['#9CA3AF', '#6B7280'] : ['#4F46E5', '#7C3AED']}
                  style={styles.joinButtonGradient}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={styles.joinButtonText}>Joining...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="enter" size={20} color="white" />
                      <Text style={styles.joinButtonText}>Join Class</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Joined Classes */}
            {joinedClasses.length > 0 && (
              <View style={styles.joinedClassesContainer}>
                <Text style={styles.joinedClassesTitle}>Your Classes</Text>
                {joinedClasses.map((classItem) => (
                  <View key={classItem._id} style={[styles.classCard, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.5)' }]}>
                    <View style={styles.classInfo}>
                      <Text style={[styles.className, { color: theme === 'light' ? '#111827' : 'white' }]}>{classItem.name}</Text>
                      <Text style={[styles.classCode, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Code: {classItem.code}</Text>
                      <Text style={[styles.classTeacher, { color: theme === 'light' ? '#9CA3AF' : '#6B7280' }]}>
                        Teacher: {classItem.teacher?.name || 'Unknown'}
                      </Text>
                    </View>
                    
                    <View style={styles.classActions}>
                      <TouchableOpacity
                        style={[styles.viewClassButton, { backgroundColor: theme === 'light' ? '#EEF2FF' : '#4F46E520' }]}
                        onPress={() => navigation.navigate('ClassDetail', { id: classItem._id })}
                      >
                        <Ionicons name="eye" size={16} color="#4F46E5" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.leaveClassButton, { backgroundColor: theme === 'light' ? '#FEF2F2' : '#EF444420' }]}
                        onPress={() => leaveClass(classItem._id, classItem.name)}
                      >
                        <Ionicons name="exit" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
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
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 48,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#111827',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinedClassesContainer: {
    marginTop: 16,
  },
  joinedClassesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  classCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  classCode: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  classTeacher: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  classActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewClassButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveClassButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
