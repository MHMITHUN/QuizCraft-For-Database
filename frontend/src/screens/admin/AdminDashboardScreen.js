import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(31, 41, 55, ${alpha})`;
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (sanitized.length < 6) {
    sanitized = sanitized.padEnd(6, '0');
  }
  const base = sanitized.slice(0, 6);
  const r = parseInt(base.slice(0, 2), 16);
  const g = parseInt(base.slice(2, 4), 16);
  const b = parseInt(base.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCardGradientColors = (baseColor, currentTheme) => {
  if (!baseColor) {
    return currentTheme === 'light'
      ? ['#FFFFFF', '#F3F4F6']
      : ['#1F2937', '#111827'];
  }
  return currentTheme === 'light'
    ? [hexToRgba(baseColor, 0.22), hexToRgba(baseColor, 0.08)]
    : [hexToRgba(baseColor, 0.45), hexToRgba(baseColor, 0.18)];
};

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;

  // Drill-down modal state
  const [drillVisible, setDrillVisible] = useState(false);
  const [drillTitle, setDrillTitle] = useState('');
  const [drillItems, setDrillItems] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');
  const drillAnim = useRef(new Animated.Value(0)).current;

  const loadStats = async () => {
    try {
      const res = await adminAPI.getDashboard();
      setStats(res?.data?.data || {});
    } catch (e) {
      console.error('Failed to load dashboard:', e);
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Pulse animation for skeletons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true })
      ])
    ).start();

    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();

    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const Skeleton = () => (
    <Animated.View
      style={[
        styles.skeletonCard,
        {
          opacity: pulse,
          backgroundColor: theme === 'light' ? '#E5E7EB' : '#272727'
        }
      ]}
    />
  );

  const openDrill = async (type) => {
    try {
      setDrillLoading(true);
      setDrillVisible(true);
      setDrillSearch('');
      drillAnim.setValue(0);
      Animated.spring(drillAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      if (type === 'users-all') {
        setDrillTitle('All Users');
        const res = await adminAPI.getUsers({ limit: 20 });
        setDrillItems(res?.data?.data?.users || []);
      } else if (type === 'users-active') {
        setDrillTitle('Active Users');
        const res = await adminAPI.getUsers({ isActive: 'true', limit: 20 });
        setDrillItems(res?.data?.data?.users || []);
      } else if (type === 'users-premium') {
        setDrillTitle('Premium Users');
        const res = await adminAPI.getUsers({ subscription: 'premium', limit: 20 });
        setDrillItems(res?.data?.data?.users || []);
      } else if (type === 'quizzes-all') {
        setDrillTitle('Recent Quizzes');
        const res = await adminAPI.getQuizzes({ limit: 20 });
        setDrillItems(res?.data?.data?.quizzes || []);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load details');
    } finally {
      setDrillLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, onPress, onLongPress }) => {
    const press = useRef(new Animated.Value(0)).current;
    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
    const rotate = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2deg'] });
    const gradientColors = useMemo(() => getCardGradientColors(color, theme), [color, theme]);
    const borderColor = useMemo(
      () => hexToRgba(color || '#6366f1', theme === 'light' ? 0.22 : 0.4),
      [color, theme]
    );
    const iconBackground = useMemo(
      () => hexToRgba(color || '#6366f1', theme === 'light' ? 0.18 : 0.32),
      [color, theme]
    );
    const hintColor = theme === 'light' ? '#9CA3AF' : '#6B7280';
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => Animated.spring(press, { toValue: 1, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, useNativeDriver: true }).start()}
        activeOpacity={0.9}
        style={styles.statCardWrapper}
      >
        <Animated.View style={{ transform: [{ scale }, { rotateZ: rotate }] }}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.statCard,
              {
                borderColor,
                backgroundColor: theme === 'light' ? '#FFFFFF' : '#18181B',
                shadowColor: theme === 'light' ? hexToRgba('#111827', 0.12) : '#000'
              }
            ]}
          >
            <View style={styles.statTopRow}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme === 'light' ? '#4B5563' : '#D1D5DB' }
                ]}
              >
                {title}
              </Text>
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: iconBackground,
                    borderColor
                  }
                ]}
              >
                <Text style={[styles.statIconText, { color: theme === 'light' ? color : '#F9FAFB' }]}>
                  {icon}
                </Text>
              </View>
            </View>
            <View style={styles.statContent}>
              <Text
                style={[
                  styles.statValue,
                  { color: theme === 'light' ? '#111827' : '#F9FAFB' }
                ]}
              >
                {value}
              </Text>
              <Text
                style={[
                  styles.statHint,
                  { color: hintColor }
                ]}
              >
                Tap to explore
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const ActionButton = ({ title, icon, onPress, gradient = ['#4F46E5', '#7C3AED'] }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.actionButtonWrapper}
    >
      <LinearGradient colors={gradient} style={styles.actionButton}>
        <Text style={styles.actionButtonIcon}>{icon}</Text>
        <Text style={styles.actionButtonText}>{title}</Text>
        <Text style={styles.actionButtonArrow}>→</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>
        {title}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      {/* Header */}
      <LinearGradient
        colors={theme === 'light' ? ['#667eea', '#764ba2'] : ['#1e1b4b', '#312e81']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🔐 Admin Control</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.name || 'Admin'}</Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutIcon}>⎋</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme === 'light' ? '#4F46E5' : '#A5B4FC'}
          />
        }
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {loading ? (
            <View style={{ padding: 16 }}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} />
              ))}
            </View>
          ) : (
            <>
              {/* Quick Stats */}
              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Users"
                  value={stats?.users?.total || 0}
                  icon="👥"
                  color="#3B82F6"
                  onPress={() => navigation.navigate('AdminUsers')}
                  onLongPress={() => openDrill('users-all')}
                />
                <StatCard
                  title="Active Users"
                  value={stats?.users?.active || 0}
                  icon="✨"
                  color="#10B981"
                  onPress={() => navigation.navigate('AdminUsers', { preset: { isActive: 'true' } })}
                  onLongPress={() => openDrill('users-active')}
                />
                <StatCard
                  title="Total Quizzes"
                  value={stats?.quizzes?.total || 0}
                  icon="📝"
                  color="#F59E0B"
                  onPress={() => navigation.navigate('AdminQuizzes')}
                  onLongPress={() => openDrill('quizzes-all')}
                />
                <StatCard
                  title="Premium Users"
                  value={stats?.users?.premium || 0}
                  icon="💎"
                  color="#8B5CF6"
                  onPress={() => navigation.navigate('AdminUsers', { preset: { subscription: 'premium' } })}
                  onLongPress={() => openDrill('users-premium')}
                />
              </View>

              {/* User Management */}
              <SectionHeader title="User Management" icon="👥" />
              <View style={styles.section}>
                <ActionButton
                  title="All Users"
                  icon="📋"
                  onPress={() => navigation.navigate('AdminUsers')}
                  gradient={['#3B82F6', '#2563EB']}
                />
                <ActionButton
                  title="Premium Users"
                  icon="💎"
                  onPress={() => navigation.navigate('AdminUsers', { preset: { subscription: 'premium' } })}
                  gradient={['#8B5CF6', '#7C3AED']}
                />
                <ActionButton
                  title="Institutional Users"
                  icon="🏢"
                  onPress={() => navigation.navigate('AdminUsers', { preset: { subscription: 'institutional' } })}
                  gradient={['#06B6D4', '#0891B2']}
                />
                <ActionButton
                  title="Users Joined This Month"
                  icon="📊"
                  onPress={() => {
                    const now = new Date();
                    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                    const to = new Date().toISOString().slice(0, 10);
                    navigation.navigate('AdminUsers', { preset: { from, to } });
                  }}
                  gradient={['#10B981', '#059669']}
                />
              </View>

              {/* Quiz Management */}
              <SectionHeader title="Quiz Management" icon="📝" />
              <View style={styles.section}>
                <ActionButton
                  title="Create New Quiz"
                  icon="✨"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Upload' })}
                  gradient={['#10B981', '#059669']}
                />
                <ActionButton
                  title="All Quizzes"
                  icon="📚"
                  onPress={() => navigation.navigate('AdminQuizzes')}
                  gradient={['#F59E0B', '#D97706']}
                />
                <ActionButton
                  title="My Created Quizzes"
                  icon="🎯"
                  onPress={() => navigation.navigate('MyQuizzes')}
                  gradient={['#06B6D4', '#0891B2']}
                />
                <ActionButton
                  title="Quizzes Created This Week"
                  icon="🆕"
                  onPress={() => {
                    const now = new Date();
                    const day = now.getDay();
                    const diff = day === 0 ? 6 : day - 1;
                    const monday = new Date(now);
                    monday.setDate(now.getDate() - diff);
                    const from = monday.toISOString().slice(0, 10);
                    const to = new Date().toISOString().slice(0, 10);
                    navigation.navigate('AdminQuizzes', { preset: { from, to } });
                  }}
                  gradient={['#EC4899', '#DB2777']}
                />
              </View>

              {/* Financial Management */}
              <SectionHeader title="Financial Management" icon="💰" />
              <View style={styles.section}>
                <ActionButton
                  title="View All Payments"
                  icon="💳"
                  onPress={() => navigation.navigate('AdminPayments')}
                  gradient={['#14B8A6', '#0D9488']}
                />
              </View>

              {/* System Settings */}
              <SectionHeader title="System Settings" icon="⚙️" />
              <View style={styles.section}>
                <ActionButton
                  title="System Configuration"
                  icon="🔧"
                  onPress={() => navigation.navigate('AdminSettings')}
                  gradient={['#6366F1', '#4F46E5']}
                />
                <ActionButton
                  title="Open Teacher Panel"
                  icon="👩‍🏫"
                  onPress={() => navigation.navigate('TeacherDashboard')}
                  gradient={['#22C55E', '#16A34A']}
                />
                <ActionButton
                  title="Open Student View"
                  icon="🎓"
                  onPress={() => navigation.navigate('MainTabs')}
                  gradient={['#0EA5E9', '#2563EB']}
                />
              </View>

              {/* Activity Summary */}
              <View style={[styles.activityCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIcon}>📊</Text>
                  <Text style={[styles.activityTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>
                    Platform Activity
                  </Text>
                </View>
                <View style={styles.activityStats}>
                  <View style={styles.activityStat}>
                    <Text style={[styles.activityStatValue, { color: theme === 'light' ? '#4F46E5' : '#A5B4FC' }]}>
                      {stats?.activity?.totalAttempts || 0}
                    </Text>
                    <Text style={[styles.activityStatLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                      Total Quiz Attempts
                    </Text>
                  </View>
                  <View style={styles.activityStat}>
                    <Text style={[styles.activityStatValue, { color: theme === 'light' ? '#10B981' : '#6EE7B7' }]}>
                      {stats?.quizzes?.public || 0}
                    </Text>
                    <Text style={[styles.activityStatLabel, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
                      Public Quizzes
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Spacing */}
              <View style={{ height: 40 }} />
            </>
          )}
        </Animated.View>
      </ScrollView>
      {/* Drill-down Modal */}
      <Modal visible={drillVisible} transparent animationType="fade" onRequestClose={()=>setDrillVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, { opacity: drillAnim, transform: [{ scale: drillAnim.interpolate({ inputRange:[0,1], outputRange:[0.9,1] }) }] }]}> 
            <Text style={styles.modalTitle}>{drillTitle}</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom: 8 }}>
              <TextInput
                style={[styles.modalSearch, { borderColor:'#e5e7eb' }]}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                value={drillSearch}
                onChangeText={setDrillSearch}
              />
              <TouchableOpacity style={styles.modalSearchBtn} onPress={()=>{}}>
                <Text style={styles.modalSearchBtnText}>Find</Text>
              </TouchableOpacity>
            </View>
            {drillLoading ? (
              <Text style={{ color:'#6B7280' }}>Loading...</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingVertical: 8 }}>
                {drillItems
                  .filter((it)=>{
                    const s = drillSearch.trim().toLowerCase();
                    if (!s) return true;
                    const text = (it.title||'') + ' ' + (it.name||'') + ' ' + (it.email||'');
                    return text.toLowerCase().includes(s);
                  })
                  .map((item, idx) => (
                  <View key={item._id || idx} style={styles.modalRow}>
                    <Text style={styles.modalRowText}>{item.title || item.name}</Text>
                    {item.email ? <Text style={styles.modalSub}>{item.email}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={()=>setDrillVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF'
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoutIcon: {
    fontSize: 24
  },
  content: {
    padding: 16,
    marginTop: -10
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
    marginBottom: 24
  },
  statCardWrapper: {
    width: (width - 48) / 2,
    marginBottom: 16
  },
  statCard: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
    gap: 12
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statIconText: {
    fontSize: 22,
    fontWeight: '700'
  },
  statContent: {
    gap: 6
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  statHint: {
    fontSize: 12,
    fontWeight: '600'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  section: {
    gap: 12,
    marginBottom: 24
  },
  actionButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12
  },
  actionButtonIcon: {
    fontSize: 22
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  actionButtonArrow: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700'
  },
  activityCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginTop: 8
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  activityIcon: {
    fontSize: 28,
    marginRight: 12
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  activityStats: {
    flexDirection: 'row',
    gap: 20
  },
  activityStat: {
    flex: 1,
    alignItems: 'center'
  },
  activityStatValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4
  },
  activityStatLabel: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600'
  },
  skeletonCard: {
    height: 80,
    borderRadius: 16,
    marginBottom: 12
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalSearch: { flex:1, borderWidth:1, borderRadius: 10, paddingHorizontal: 10, backgroundColor:'#F9FAFB', color:'#111827' },
  modalSearchBtn: { backgroundColor:'#4F46E5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  modalSearchBtnText: { color:'#fff', fontWeight:'700' },
  modalRow: { paddingVertical: 10, borderBottomColor: '#e5e7eb', borderBottomWidth: 1 },
  modalRowText: { fontWeight: '700' },
  modalSub: { color:'#6B7280' },
  modalClose: { marginTop: 12, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, backgroundColor:'#4F46E5', borderRadius: 10 },
  modalCloseText: { color:'#fff', fontWeight:'700' }
});
