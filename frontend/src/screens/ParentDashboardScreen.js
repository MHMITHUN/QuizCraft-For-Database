import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ProgressBar, Badge } from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { parentDashboard } from '../services/parentDashboard';
import { showToast } from '../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ParentDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState([]);
  const [familyStats, setFamilyStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeTimeframe, setActiveTimeframe] = useState('week');

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      const [dashboardData, family, notifs] = await Promise.all([
        parentDashboard.initialize('parent_1'),
        parentDashboard.getFamilyStats(),
        parentDashboard.getNotifications(5)
      ]);

      if (dashboardData) {
        setChildren(dashboardData.children);
      }
      setFamilyStats(family);
      setNotifications(notifs);

    } catch (error) {
      console.error('Error initializing parent dashboard:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
    showToast('Dashboard refreshed!', 'success');
  };

  const handleChildPress = (child) => {
    navigation.navigate('ChildProgress', { 
      childId: child.id, 
      childName: child.name 
    });
  };

  const handleNotificationPress = (notification) => {
    // Mark as read and handle action
    if (notification.actionRequired) {
      navigation.navigate('NotificationAction', { notification });
    } else {
      navigation.navigate('ChildProgress', { 
        childId: notification.childId,
        childName: notification.childName 
      });
    }
  };

  const handleSendMessage = (childId) => {
    navigation.navigate('SendMessage', { childId });
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getActivityStatus = (lastActive) => {
    const hoursAgo = (Date.now() - new Date(lastActive)) / (1000 * 60 * 60);
    
    if (hoursAgo < 1) return { status: 'Active now', color: '#4CAF50' };
    if (hoursAgo < 4) return { status: 'Recently active', color: '#4A90E2' };
    if (hoursAgo < 12) return { status: 'Active today', color: '#FF9800' };
    return { status: 'Inactive', color: '#666' };
  };

  const formatStudyTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const renderFamilyOverview = () => {
    if (!familyStats) return null;

    const chartData = {
      labels: children.map(child => child.name.split(' ')[0]),
      datasets: [{
        data: children.map(child => child.averageScore),
        colors: children.map((_, index) => 
          () => ['#4A90E2', '#4CAF50', '#FF9800', '#9C27B0'][index % 4]
        )
      }]
    };

    return (
      <Animated.View entering={FadeInUp.delay(100)} style={styles.familyOverviewCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Family Learning Overview</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('FamilyReports')}
          >
            <Text style={styles.viewAllText}>View Reports</Text>
            <Feather name="chevron-right" size={16} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        <View style={styles.familyStatsContainer}>
          <View style={styles.familyStatCard}>
            <MaterialIcons name="people" size={24} color="#4A90E2" />
            <Text style={styles.familyStatNumber}>{familyStats.totalChildren}</Text>
            <Text style={styles.familyStatLabel}>Children</Text>
          </View>

          <View style={styles.familyStatCard}>
            <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.familyStatNumber}>{familyStats.averageScore}%</Text>
            <Text style={styles.familyStatLabel}>Avg Score</Text>
          </View>

          <View style={styles.familyStatCard}>
            <MaterialIcons name="schedule" size={24} color="#FF9800" />
            <Text style={styles.familyStatNumber}>{formatStudyTime(familyStats.totalStudyTime)}</Text>
            <Text style={styles.familyStatLabel}>Study Time</Text>
          </View>

          <View style={styles.familyStatCard}>
            <MaterialIcons name="local-fire-department" size={24} color="#FF6B35" />
            <Text style={styles.familyStatNumber}>{familyStats.streaks.longest}</Text>
            <Text style={styles.familyStatLabel}>Best Streak</Text>
          </View>
        </View>

        {children.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Performance Comparison</Text>
            <BarChart
              data={chartData}
              width={SCREEN_WIDTH - 60}
              height={180}
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                barPercentage: 0.7,
              }}
              style={styles.chart}
            />
          </View>
        )}
      </Animated.View>
    );
  };

  const renderChildCard = (child, index) => {
    const activityStatus = getActivityStatus(child.lastActive);
    const progressPercentage = child.weeklyProgress / child.weeklyGoal;

    return (
      <Animated.View 
        key={child.id}
        entering={SlideInRight.delay(200 + index * 100)}
        style={styles.childCard}
      >
        <TouchableOpacity 
          style={styles.childCardContent}
          onPress={() => handleChildPress(child)}
        >
          <View style={styles.childHeader}>
            <View style={styles.childAvatarContainer}>
              <Image source={{ uri: child.avatar }} style={styles.childAvatar} />
              <View style={[styles.activityDot, { backgroundColor: activityStatus.color }]} />
            </View>
            
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childGrade}>{child.grade} • Age {child.age}</Text>
              <Text style={[styles.activityStatus, { color: activityStatus.color }]}>
                {activityStatus.status}
              </Text>
            </View>

            <View style={styles.childActions}>
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={() => handleSendMessage(child.id)}
              >
                <Feather name="message-circle" size={18} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.childStats}>
            <View style={styles.childStatItem}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="star" size={16} color="#FFD93D" />
              </View>
              <Text style={styles.statValue}>Level {child.level}</Text>
              <Text style={styles.statLabel}>Current Level</Text>
            </View>

            <View style={styles.childStatItem}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="trending-up" size={16} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>{child.averageScore}%</Text>
              <Text style={styles.statLabel}>Average Score</Text>
            </View>

            <View style={styles.childStatItem}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="local-fire-department" size={16} color="#FF6B35" />
              </View>
              <Text style={styles.statValue}>{child.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.childStatItem}>
              <View style={styles.statIconContainer}>
                <MaterialIcons name="schedule" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.statValue}>{formatStudyTime(child.studyTimeToday)}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Weekly Goal Progress</Text>
              <Text style={styles.progressNumbers}>
                {child.weeklyProgress}/{child.weeklyGoal} quizzes
              </Text>
            </View>
            <ProgressBar 
              progress={Math.min(progressPercentage, 1)}
              color={progressPercentage >= 1 ? "#4CAF50" : "#4A90E2"}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.recentActivitySection}>
            <Text style={styles.recentActivityTitle}>Recent Activity</Text>
            <Text style={styles.recentActivityText}>{child.recentActivity}</Text>
          </View>

          {child.favoriteSubject && (
            <View style={styles.favoriteSubjectSection}>
              <Badge style={styles.favoriteSubjectBadge}>
                ❤️ {child.favoriteSubject}
              </Badge>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderNotifications = () => {
    if (notifications.length === 0) return null;

    return (
      <Animated.View entering={FadeInUp.delay(300)} style={styles.notificationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔔 Recent Updates</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Feather name="chevron-right" size={16} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {notifications.slice(0, 3).map((notification, index) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.read && styles.notificationCardUnread
            ]}
            onPress={() => handleNotificationPress(notification)}
          >
            <View style={styles.notificationHeader}>
              <View style={styles.notificationIconContainer}>
                <Text style={styles.notificationIcon}>{notification.icon}</Text>
              </View>
              
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationChild}>{notification.childName}</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
              </View>

              <View style={styles.notificationMeta}>
                <Text style={styles.notificationTime}>
                  {new Date(notification.timestamp).toLocaleDateString()}
                </Text>
                {notification.actionRequired && (
                  <Badge style={styles.actionRequiredBadge}>Action Required</Badge>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>
    );
  };

  const renderQuickActions = () => {
    const actions = [
      {
        icon: 'bar-chart-2',
        label: 'View Reports',
        color: '#4A90E2',
        onPress: () => navigation.navigate('FamilyReports')
      },
      {
        icon: 'settings',
        label: 'Settings',
        color: '#666',
        onPress: () => navigation.navigate('ParentSettings')
      },
      {
        icon: 'message-square',
        label: 'Messages',
        color: '#4CAF50',
        onPress: () => navigation.navigate('Messages')
      },
      {
        icon: 'bell',
        label: 'Alerts',
        color: '#FF9800',
        onPress: () => navigation.navigate('AlertSettings')
      }
    ];

    return (
      <Animated.View entering={FadeInUp.delay(400)} style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionButton}
              onPress={action.onPress}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Feather name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading family dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(50)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>{getTimeOfDayGreeting()}</Text>
          <Text style={styles.headerTitle}>Parent Dashboard</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ParentProfile')}
        >
          <MaterialIcons name="account-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4A90E2']}
          />
        }
      >
        {/* Family Overview */}
        {renderFamilyOverview()}

        {/* Children Cards */}
        <View style={styles.childrenSection}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Your Children</Text>
          {children.map((child, index) => renderChildCard(child, index))}
        </View>

        {/* Notifications */}
        {renderNotifications()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 14,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  profileButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Family Overview
  familyOverviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    marginRight: 4,
  },
  familyStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  familyStatCard: {
    alignItems: 'center',
    flex: 1,
  },
  familyStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  familyStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },

  // Children Section
  childrenSection: {
    marginBottom: 24,
  },
  childCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  childCardContent: {
    padding: 20,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  childAvatarContainer: {
    position: 'relative',
  },
  childAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  activityDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  childInfo: {
    flex: 1,
    marginLeft: 16,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  childGrade: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  childActions: {
    alignItems: 'center',
  },
  messageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  childStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  progressNumbers: {
    fontSize: 14,
    color: '#4A90E2',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  recentActivitySection: {
    marginBottom: 12,
  },
  recentActivityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentActivityText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  favoriteSubjectSection: {
    alignItems: 'flex-start',
  },
  favoriteSubjectBadge: {
    backgroundColor: '#FFE8E6',
    color: '#FF6B35',
  },

  // Notifications
  notificationsSection: {
    marginBottom: 24,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  notificationChild: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  actionRequiredBadge: {
    backgroundColor: '#FFE8E6',
    color: '#FF6B35',
    fontSize: 10,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },

  bottomPadding: {
    height: 40,
  },
});

export default ParentDashboardScreen;