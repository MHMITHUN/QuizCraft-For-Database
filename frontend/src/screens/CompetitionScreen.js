import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
  ActivityIndicator,
  Image
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  FontAwesome5
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import competitionSystem from '../services/competitionSystem';

const { width, height } = Dimensions.get('window');

const CompetitionScreen = ({ navigation }) => {
  // State Management
  const [activeTab, setActiveTab] = useState('all');
  const [competitions, setCompetitions] = useState([]);
  const [liveBattles, setLiveBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createType, setCreateType] = useState('inter_class');
  
  // Form States
  const [formData, setFormData] = useState({});
  const [roomCode, setRoomCode] = useState('');
  
  // Animation Values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(height);

  useEffect(() => {
    loadCompetitions();
    animateIn();
  }, []);

  const animateIn = () => {
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
  };

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const activeCompetitions = await competitionSystem.getActiveCompetitions();
      setCompetitions(activeCompetitions);
    } catch (error) {
      console.error('Error loading competitions:', error);
      Alert.alert('Error', 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  }, []);

  // ========== COMPETITION CREATION ==========
  const handleCreateCompetition = async () => {
    try {
      let result;
      
      switch (createType) {
        case 'inter_class':
          result = await competitionSystem.createInterClassCompetition({
            title: formData.title || 'Inter-Class Quiz Competition',
            description: formData.description || 'Test your knowledge against other classes!',
            organizerId: 'current_user_id', // Replace with actual user ID
            schoolId: formData.schoolId || 'current_school_id',
            subjects: formData.subjects || ['mathematics', 'science', 'english'],
            grades: formData.grades || [6, 7, 8, 9, 10],
            registrationStart: new Date().toISOString(),
            registrationEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            competitionStart: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            competitionEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            maxParticipants: parseInt(formData.maxParticipants) || 100,
            questionCount: parseInt(formData.questionCount) || 20,
            timeLimit: parseInt(formData.timeLimit) || 30,
            difficulty: formData.difficulty || 'mixed'
          });
          break;
          
        case 'tournament':
          result = await competitionSystem.createTournament({
            title: formData.title || 'Quiz Tournament',
            description: formData.description || 'Single elimination tournament!',
            organizerId: 'current_user_id',
            format: formData.format || 'single_elimination',
            maxParticipants: parseInt(formData.maxParticipants) || 16,
            subjects: formData.subjects || ['general'],
            registrationStart: new Date().toISOString(),
            registrationEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            tournamentStart: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
          });
          break;
          
        case 'live_battle':
          result = await competitionSystem.createLiveBattle({
            title: formData.title || 'Quick Battle',
            hostId: 'current_user_id',
            mode: formData.mode || 'versus',
            maxPlayers: parseInt(formData.maxPlayers) || 2,
            subject: formData.subject || 'mathematics',
            difficulty: formData.difficulty || 'mixed',
            questionCount: parseInt(formData.questionCount) || 10,
            timePerQuestion: parseInt(formData.timePerQuestion) || 30
          });
          break;
          
        case 'seasonal_event':
          result = await competitionSystem.createSeasonalEvent({
            title: formData.title || 'Science Week 2024',
            description: formData.description || 'Week-long science competition!',
            theme: formData.theme || 'science_week',
            seasonType: 'weekly',
            subjects: ['science', 'mathematics', 'technology'],
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          break;
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        setShowCreateModal(false);
        setFormData({});
        loadCompetitions();
        
        if (createType === 'live_battle') {
          Alert.alert(
            'Battle Created!', 
            `Room Code: ${result.roomCode}\nShare this code with others to join.`,
            [
              { text: 'OK' },
              { text: 'Join Battle', onPress: () => joinLiveBattle(result.battle.id) }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error creating competition:', error);
      Alert.alert('Error', error.message || 'Failed to create competition');
    }
  };

  const joinCompetition = async (competitionId, competitionType) => {
    try {
      const studentData = {
        studentId: 'current_student_id',
        name: 'Current Student',
        grade: 8,
        classId: 'class_8a',
        className: 'Class 8A',
        avatar: 'https://via.placeholder.com/50'
      };

      let result;
      
      if (competitionType === 'inter_class') {
        result = await competitionSystem.joinInterClassCompetition(competitionId, studentData);
      } else if (competitionType === 'tournament') {
        // Tournament joining logic would go here
        Alert.alert('Info', 'Tournament joining will be implemented soon!');
        return;
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        loadCompetitions();
      }
    } catch (error) {
      console.error('Error joining competition:', error);
      Alert.alert('Error', error.message || 'Failed to join competition');
    }
  };

  const joinLiveBattle = async (battleId, roomCodeInput = null) => {
    try {
      const playerData = {
        playerId: 'current_player_id',
        name: 'Current Player',
        avatar: 'https://via.placeholder.com/50'
      };

      let actualBattleId = battleId;
      
      if (roomCodeInput) {
        // Convert room code back to battle ID (simplified)
        actualBattleId = `battle_${roomCodeInput.toLowerCase()}`;
      }

      const result = await competitionSystem.joinLiveBattle(actualBattleId, playerData);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        setShowJoinModal(false);
        setRoomCode('');
        
        // Navigate to live battle screen
        navigation.navigate('LiveBattleRoom', { 
          battleId: actualBattleId,
          playerId: playerData.playerId 
        });
      }
    } catch (error) {
      console.error('Error joining live battle:', error);
      Alert.alert('Error', error.message || 'Failed to join battle');
    }
  };

  // ========== UI COMPONENTS ==========
  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'all', title: 'All', icon: 'grid-outline' },
        { key: 'inter_class', title: 'Inter-Class', icon: 'school-outline' },
        { key: 'tournament', title: 'Tournaments', icon: 'trophy-outline' },
        { key: 'live_battle', title: 'Live Battles', icon: 'flash-outline' },
        { key: 'seasonal', title: 'Events', icon: 'calendar-outline' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons 
            name={tab.icon} 
            size={20} 
            color={activeTab === tab.key ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCompetitionCard = ({ item }) => {
    const getCompetitionIcon = (type) => {
      switch (type) {
        case 'inter_class': return 'school';
        case 'tournament': return 'trophy';
        case 'live_battle': return 'flash';
        case 'seasonal_event': return 'calendar';
        default: return 'help-circle';
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'upcoming': return '#FFA726';
        case 'registration_open': return '#66BB6A';
        case 'in_progress': return '#42A5F5';
        case 'completed': return '#78909C';
        default: return '#999';
      }
    };

    return (
      <Animated.View style={[styles.competitionCard, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons 
                name={getCompetitionIcon(item.type)} 
                size={24} 
                color="#fff" 
              />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardSubtitle}>
                {item.participantCount || 0} participants
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color="#fff" />
              <Text style={styles.infoText}>
                {item.participantCount || 0} / {item.maxParticipants || '∞'} participants
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.infoText}>
                Created {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CompetitionDetail', { 
                competitionId: item.id,
                competitionType: item.type 
              })}
            >
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            
            {item.status === 'registration_open' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => joinCompetition(item.id, item.type)}
              >
                <Text style={styles.primaryButtonText}>Join</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
        <Animated.View 
          style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Competition</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Competition Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Competition Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeSelector}>
                  {[
                    { key: 'inter_class', title: 'Inter-Class', icon: 'school' },
                    { key: 'tournament', title: 'Tournament', icon: 'trophy' },
                    { key: 'live_battle', title: 'Live Battle', icon: 'flash' },
                    { key: 'seasonal_event', title: 'Event', icon: 'calendar' }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeOption,
                        createType === type.key && styles.selectedType
                      ]}
                      onPress={() => setCreateType(type.key)}
                    >
                      <Ionicons 
                        name={type.icon} 
                        size={20} 
                        color={createType === type.key ? '#fff' : '#666'} 
                      />
                      <Text style={[
                        styles.typeText,
                        createType === type.key && styles.selectedTypeText
                      ]}>
                        {type.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter competition title"
                value={formData.title || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Enter competition description"
                multiline
                numberOfLines={3}
                value={formData.description || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              />
            </View>

            {/* Type-specific inputs */}
            {createType === 'inter_class' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Max Participants</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="100"
                    keyboardType="numeric"
                    value={formData.maxParticipants || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, maxParticipants: text }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Question Count</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="20"
                    keyboardType="numeric"
                    value={formData.questionCount || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, questionCount: text }))}
                  />
                </View>
              </>
            )}

            {createType === 'live_battle' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Max Players</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2"
                    keyboardType="numeric"
                    value={formData.maxPlayers || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, maxPlayers: text }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Subject</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="mathematics"
                    value={formData.subject || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
                  />
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateCompetition}
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );

  const renderJoinModal = () => (
    <Modal
      visible={showJoinModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowJoinModal(false)}
    >
      <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
        <View style={styles.joinModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Join Live Battle</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowJoinModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.joinModalBody}>
            <Text style={styles.instructionText}>
              Enter the room code shared by your friend
            </Text>
            
            <TextInput
              style={styles.roomCodeInput}
              placeholder="ROOM CODE"
              value={roomCode}
              onChangeText={setRoomCode}
              maxLength={6}
              autoCapitalize="characters"
              textAlign="center"
            />
            
            <TouchableOpacity 
              style={[
                styles.joinButton,
                !roomCode.trim() && styles.disabledButton
              ]}
              onPress={() => joinLiveBattle(null, roomCode)}
              disabled={!roomCode.trim()}
            >
              <Text style={styles.joinButtonText}>Join Battle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="trophy-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Competitions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create or join competitions to get started!
      </Text>
    </View>
  );

  const filteredCompetitions = competitions.filter(comp => 
    activeTab === 'all' || comp.type === activeTab
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Competitions</Text>
          <Text style={styles.headerSubtitle}>
            Compete with friends and classmates
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="enter-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
      >
        {renderTabBar()}
      </ScrollView>

      {/* Competition List */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading competitions...</Text>
          </View>
        ) : filteredCompetitions.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredCompetitions}
            renderItem={renderCompetitionCard}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modals */}
      {renderCreateModal()}
      {renderJoinModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabScrollView: {
    backgroundColor: '#fff',
    maxHeight: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    gap: 15,
  },
  competitionCard: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 8,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#667eea',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedType: {
    backgroundColor: '#667eea',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTypeText: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  createButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Join Modal Styles
  joinModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  joinModalBody: {
    padding: 30,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  roomCodeInput: {
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    letterSpacing: 3,
  },
  joinButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default CompetitionScreen;