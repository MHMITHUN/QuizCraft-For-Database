import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Animated, 
  TouchableOpacity, 
  Dimensions,
  ScrollView,
  Modal,
  ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI, classesAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function LeaderboardScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('global'); // 'global' or 'class'
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [classLeaderboard, setClassLeaderboard] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);
  const { theme } = useTheme();
  
  const pulse = useRef(new Animated.Value(0.4)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for loading
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true })
      ])
    ).start();

    // Load initial data
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load global leaderboard
      const globalRes = await analyticsAPI.getLeaderboard(20);
      setGlobalLeaderboard(globalRes?.data?.data?.leaderboard || []);
      
      // Load user's classes if student or teacher
      if (user?.role === 'student' || user?.role === 'teacher') {
        const classesRes = await classesAPI.mine();
        const classes = classesRes?.data?.data?.classes || [];
        setMyClasses(classes);
        
        // Auto-select first class if available
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
          loadClassLeaderboard(classes[0]._id);
        }
      }
      
      // Animate entrance
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start();
    } catch (e) {
      console.error('Load leaderboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadClassLeaderboard = async (classId) => {
    if (!classId) return;
    
    setClassLoading(true);
    try {
      const res = await analyticsAPI.getClassLeaderboard(classId, 20);
      setClassLeaderboard(res?.data?.data?.leaderboard || []);
    } catch (e) {
      console.error('Load class leaderboard error:', e);
      setClassLeaderboard([]);
    } finally {
      setClassLoading(false);
    }
  };

  const handleClassSelect = (classItem) => {
    setSelectedClass(classItem);
    setShowClassSelector(false);
    loadClassLeaderboard(classItem._id);
  };

  const Skeleton = () => (<Animated.View style={[styles.skel, { opacity: pulse }]} />);

  const getCrownIcon = (index) => {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  const getPodiumHeight = (index) => {
    if (index === 0) return 120;
    if (index === 1) return 90;
    if (index === 2) return 70;
    return 50;
  };

  const getPodiumColor = (index) => {
    if (index === 0) return ['#FFD700', '#FFA500'];
    if (index === 1) return ['#C0C0C0', '#A0A0A0'];
    if (index === 2) return ['#CD7F32', '#A0522D'];
    return ['#667eea', '#764ba2'];
  };

  const renderTopThree = (items) => {
    const topThree = items.slice(0, 3);
    if (topThree.length === 0) return null;

    return (
      <Animated.View style={[styles.podiumContainer, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <Text style={styles.podiumTitle}>
          🏆 {activeTab === 'global' ? 'Global Champions' : `${selectedClass?.name || 'Class'} Champions`} 🏆
        </Text>
        
        <View style={styles.podium}>
          {/* Second Place */}
          {topThree[1] && (
            <Animated.View style={[
              styles.podiumPlace,
              { height: getPodiumHeight(1) }
            ]}>
              <LinearGradient
                colors={getPodiumColor(1)}
                style={styles.podiumGradient}
              >
                <Text style={styles.podiumRank}>🥈</Text>
                <Text style={styles.podiumName}>{topThree[1].name}</Text>
                <Text style={styles.podiumScore}>{topThree[1].totalPoints}pts</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* First Place */}
          {topThree[0] && (
            <Animated.View style={[
              styles.podiumPlace,
              styles.firstPlace,
              { height: getPodiumHeight(0) }
            ]}>
              <LinearGradient
                colors={getPodiumColor(0)}
                style={styles.podiumGradient}
              >
                <Text style={styles.podiumRank}>👑</Text>
                <Text style={styles.podiumName}>{topThree[0].name}</Text>
                <Text style={styles.podiumScore}>{topThree[0].totalPoints}pts</Text>
                <View style={styles.crownDecoration}>
                  <Text style={styles.crownText}>CHAMPION</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Third Place */}
          {topThree[2] && (
            <Animated.View style={[
              styles.podiumPlace,
              { height: getPodiumHeight(2) }
            ]}>
              <LinearGradient
                colors={getPodiumColor(2)}
                style={styles.podiumGradient}
              >
                <Text style={styles.podiumRank}>🥉</Text>
                <Text style={styles.podiumName}>{topThree[2].name}</Text>
                <Text style={styles.podiumScore}>{topThree[2].totalPoints}pts</Text>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    );
  };

  const ListItem = React.memo(({ item, index }) => {
    const actualIndex = index + 3;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const slideInAnim = useRef(new Animated.Value(30)).current;
    const isCurrentUser = item.userId?.toString() === user?._id?.toString();

    React.useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay: index * 100,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideInAnim, {
          toValue: 0,
          delay: index * 50,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }, [index]);

    return (
      <Animated.View style={{
        transform: [
          { scale: scaleAnim },
          { translateX: slideInAnim }
        ]
      }}>
        <TouchableOpacity 
          style={[
            styles.card,
            { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderLeftColor: theme === 'light' ? '#667eea' : '#4F46E5' },
            isCurrentUser && (theme === 'light' ? styles.cardHighlight : styles.cardHighlightDark)
          ]} 
          activeOpacity={0.8}
        >
          <View style={[styles.rankContainer, { backgroundColor: theme === 'light' ? '#f3f4f6' : '#272727' }]}>
            <Text style={styles.rank}>{actualIndex + 1}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <View style={[
              styles.avatar,
              { backgroundColor: theme === 'light' ? '#667eea' : '#4F46E5' },
              isCurrentUser && { backgroundColor: '#EC4899' }
            ]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            
            <View style={styles.userDetails}>
              <Text style={[styles.name, { color: theme === 'light' ? '#1f2937' : 'white' }]}>
                {item.name} {isCurrentUser && '(You)'}
              </Text>
              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={[styles.statText, { color: theme === 'light' ? '#6b7280' : '#9CA3AF' }]}>{item.totalPoints} pts</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.statText, { color: theme === 'light' ? '#6b7280' : '#9CA3AF' }]}>{item.quizzesTaken} quizzes</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>{item.totalPoints}</Text>
            <Text style={[styles.scoreLabel, { color: theme === 'light' ? '#9ca3af' : '#6B7280' }]}>points</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderItem = ({ item, index }) => (
    <ListItem item={item} index={index} />
  );

  const renderClassSelector = () => (
    <Modal
      visible={showClassSelector}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme === 'light' ? '#f8fafc' : '#121212' }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderBottomColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}>
          <Text style={[styles.modalTitle, { color: theme === 'light' ? '#1f2937' : 'white' }]}>Select Class</Text>
          <TouchableOpacity onPress={() => setShowClassSelector(false)}>
            <Ionicons name="close" size={24} color={theme === 'light' ? '#1f2937' : 'white'} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {myClasses.map((classItem) => (
            <TouchableOpacity
              key={classItem._id}
              style={[
                styles.classItem,
                { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' },
                selectedClass?._id === classItem._id && (theme === 'light' ? styles.classItemSelected : styles.classItemSelectedDark)
              ]}
              onPress={() => handleClassSelect(classItem)}
            >
              <View style={[styles.classIcon, { backgroundColor: theme === 'light' ? '#EEF2FF' : '#4F46E520' }]}>
                <Ionicons name="school" size={24} color="#4F46E5" />
              </View>
              <View style={styles.classInfo}>
                <Text style={[styles.className, { color: theme === 'light' ? '#1f2937' : 'white' }]}>{classItem.name}</Text>
                <Text style={[styles.classStats, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                  {classItem.students?.length || 0} students
                </Text>
              </View>
              {selectedClass?._id === classItem._id && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const currentLeaderboard = activeTab === 'global' ? globalLeaderboard : classLeaderboard;
  const currentLoading = activeTab === 'global' ? loading : (loading || classLoading);

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#f8fafc' : '#121212' }]}>
      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderBottomColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'global' && (theme === 'light' ? styles.tabActive : styles.tabActiveDark)]}
          onPress={() => setActiveTab('global')}
        >
          <Ionicons 
            name="globe" 
            size={20} 
            color={activeTab === 'global' ? '#4F46E5' : (theme === 'light' ? '#9CA3AF' : '#6B7280')} 
          />
          <Text style={[
            styles.tabText,
            { color: theme === 'light' ? '#9CA3AF' : '#6B7280' },
            activeTab === 'global' && styles.tabTextActive
          ]}>
            Global
          </Text>
        </TouchableOpacity>
        
        {myClasses.length > 0 && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'class' && (theme === 'light' ? styles.tabActive : styles.tabActiveDark)]}
            onPress={() => setActiveTab('class')}
          >
            <Ionicons 
              name="school" 
              size={20} 
              color={activeTab === 'class' ? '#4F46E5' : (theme === 'light' ? '#9CA3AF' : '#6B7280')} 
            />
            <Text style={[
              styles.tabText,
              { color: theme === 'light' ? '#9CA3AF' : '#6B7280' },
              activeTab === 'class' && styles.tabTextActive
            ]}>
              Class
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Class Selector Button */}
      {activeTab === 'class' && myClasses.length > 0 && (
        <TouchableOpacity
          style={[styles.classSelectorButton, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
          onPress={() => setShowClassSelector(true)}
        >
          <Ionicons name="school" size={20} color="#4F46E5" />
          <Text style={[styles.classSelectorText, { color: theme === 'light' ? '#1f2937' : 'white' }]}>
            {selectedClass?.name || 'Select Class'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      {currentLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.loadingTitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Loading Leaderboard...</Text>
        </View>
      ) : currentLeaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color="#9CA3AF" />
          <Text style={[styles.emptyTitle, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>No Data Yet</Text>
          <Text style={[styles.emptyText, { color: theme === 'light' ? '#9CA3AF' : '#6B7280' }]}>
            {activeTab === 'global' 
              ? 'Complete quizzes to appear on the leaderboard!'
              : 'No quiz attempts in this class yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentLeaderboard.slice(3)}
          keyExtractor={(i, idx) => String(i.userId || idx)}
          renderItem={renderItem}
          ListHeaderComponent={renderTopThree(currentLeaderboard)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderClassSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
  },
  tabActiveDark: {
    backgroundColor: '#4F46E520',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  classSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  classSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  podiumContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  podiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 20,
  },
  podiumPlace: {
    width: width * 0.28,
    marginHorizontal: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  firstPlace: {
    transform: [{ scale: 1.05 }],
    zIndex: 3,
  },
  podiumGradient: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  podiumRank: {
    fontSize: 32,
    marginBottom: 8,
  },
  podiumName: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  podiumScore: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
  crownDecoration: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  crownText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  cardHighlight: {
    borderLeftColor: '#EC4899',
    backgroundColor: '#FDF2F8',
  },
  cardHighlightDark: {
    borderLeftColor: '#EC4899',
    backgroundColor: '#EC489920',
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
  skel: {
    height: 72,
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  classItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  classIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  classStats: {
    fontSize: 14,
    color: '#6B7280',
  },
});
