import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { ProgressBar, Chip } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Slider } from '@react-native-community/slider';
import { parentDashboard } from '../services/parentDashboard';
import { showToast } from '../components/Toast';

const GoalSettingScreen = ({ navigation, route }) => {
  const { childId } = route.params;
  const [child, setChild] = useState(null);
  const [goals, setGoals] = useState([]);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // New Goal Form State
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    type: 'performance', // performance, study_time, streak, custom
    category: 'academic', // academic, behavioral, engagement
    targetValue: 80,
    currentValue: 0,
    unit: '%', // %, hours, days, points
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    priority: 'medium', // low, medium, high
    rewards: '',
    reminders: true,
    subjects: [], // specific subjects if applicable
    milestones: []
  });

  const goalTypes = [
    { key: 'performance', label: 'Performance Goal', icon: '📊', description: 'Improve quiz scores or grades' },
    { key: 'study_time', label: 'Study Time', icon: '⏰', description: 'Daily or weekly study time targets' },
    { key: 'streak', label: 'Consistency', icon: '🔥', description: 'Maintain study streaks' },
    { key: 'subject_mastery', label: 'Subject Mastery', icon: '📚', description: 'Excel in specific subjects' },
    { key: 'engagement', label: 'Engagement', icon: '🎯', description: 'Increase participation and motivation' },
    { key: 'custom', label: 'Custom Goal', icon: '⚡', description: 'Create a personalized goal' }
  ];

  const subjects = ['Math', 'Science', 'English', 'History', 'Geography', 'Art', 'Music', 'Sports'];

  useEffect(() => {
    loadGoalsData();
  }, []);

  const loadGoalsData = async () => {
    try {
      setLoading(true);
      const [childData, goalsData] = await Promise.all([
        parentDashboard.getChildInfo(childId),
        parentDashboard.getChildGoals(childId)
      ]);
      
      setChild(childData);
      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error loading goals data:', error);
      showToast('Failed to load goals data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) {
      showToast('Please enter a goal title', 'error');
      return;
    }

    try {
      const goalData = {
        ...newGoal,
        childId,
        createdAt: new Date().toISOString(),
        status: 'active',
        progress: 0
      };

      const result = await parentDashboard.createGoal(goalData);
      
      if (result) {
        setGoals(prev => [result, ...prev]);
        setShowNewGoalModal(false);
        resetNewGoalForm();
        showToast('Goal created successfully!', 'success');
      } else {
        showToast('Failed to create goal', 'error');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      showToast('Error creating goal', 'error');
    }
  };

  const handleUpdateGoal = async (goalId, updates) => {
    try {
      const result = await parentDashboard.updateGoal(goalId, updates);
      
      if (result) {
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, ...updates } : goal
        ));
        showToast('Goal updated successfully!', 'success');
      } else {
        showToast('Failed to update goal', 'error');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      showToast('Error updating goal', 'error');
    }
  };

  const handleDeleteGoal = (goalId) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await parentDashboard.deleteGoal(goalId);
              if (result) {
                setGoals(prev => prev.filter(goal => goal.id !== goalId));
                showToast('Goal deleted', 'success');
              } else {
                showToast('Failed to delete goal', 'error');
              }
            } catch (error) {
              console.error('Error deleting goal:', error);
              showToast('Error deleting goal', 'error');
            }
          }
        }
      ]
    );
  };

  const resetNewGoalForm = () => {
    setNewGoal({
      title: '',
      description: '',
      type: 'performance',
      category: 'academic',
      targetValue: 80,
      currentValue: 0,
      unit: '%',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: 'medium',
      rewards: '',
      reminders: true,
      subjects: [],
      milestones: []
    });
  };

  const getGoalIcon = (type) => {
    const goalType = goalTypes.find(gt => gt.key === type);
    return goalType ? goalType.icon : '🎯';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#4CAF50';
    if (progress >= 50) return '#FF9800';
    return '#F44336';
  };

  const calculateProgress = (goal) => {
    if (goal.targetValue === 0) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  };

  const isGoalOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const getDaysRemaining = (deadline) => {
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const renderGoalCard = ({ item: goal, index }) => {
    const progress = calculateProgress(goal);
    const daysRemaining = getDaysRemaining(goal.deadline);
    const isOverdue = isGoalOverdue(goal.deadline);

    return (
      <Animated.View
        entering={SlideInRight.delay(index * 100)}
        style={[
          styles.goalCard,
          isOverdue && styles.overdueGoalCard
        ]}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <View style={styles.goalIconContainer}>
              <Text style={styles.goalIcon}>{getGoalIcon(goal.type)}</Text>
            </View>
            <View style={styles.goalDetails}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDescription} numberOfLines={2}>
                {goal.description}
              </Text>
              <View style={styles.goalMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(goal.priority)}15` }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(goal.priority) }]}>
                    {goal.priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.goalCategory}>{goal.category}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.goalActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Navigate to goal detail or edit modal
                showToast('Goal editing coming soon!', 'info');
              }}
            >
              <Feather name="edit-3" size={16} color="#4A90E2" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteGoal(goal.id)}
            >
              <Feather name="trash-2" size={16} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.goalProgress}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressPercent, { color: getProgressColor(progress) }]}>
              {progress.toFixed(0)}%
            </Text>
          </View>
          <ProgressBar
            progress={progress / 100}
            color={getProgressColor(progress)}
            style={styles.progressBar}
          />
          <View style={styles.progressDetails}>
            <Text style={styles.progressValue}>
              {goal.currentValue} / {goal.targetValue} {goal.unit}
            </Text>
            <Text style={[styles.timeRemaining, isOverdue && styles.overdueText]}>
              {isOverdue ? 'Overdue' : `${daysRemaining} days left`}
            </Text>
          </View>
        </View>

        {goal.subjects && goal.subjects.length > 0 && (
          <View style={styles.goalSubjects}>
            <Text style={styles.subjectsLabel}>Subjects:</Text>
            <View style={styles.subjectChips}>
              {goal.subjects.map((subject, idx) => (
                <Chip key={idx} style={styles.subjectChip}>
                  <Text style={styles.subjectChipText}>{subject}</Text>
                </Chip>
              ))}
            </View>
          </View>
        )}

        {goal.rewards && (
          <View style={styles.goalRewards}>
            <MaterialIcons name="card-giftcard" size={14} color="#FFD93D" />
            <Text style={styles.rewardsText}>{goal.rewards}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderGoalTypeSelector = () => (
    <View style={styles.goalTypesContainer}>
      <Text style={styles.sectionTitle}>Goal Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {goalTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.goalTypeCard,
              newGoal.type === type.key && styles.selectedGoalType
            ]}
            onPress={() => setNewGoal(prev => ({ ...prev, type: type.key }))}
          >
            <Text style={styles.goalTypeIcon}>{type.icon}</Text>
            <Text style={styles.goalTypeLabel}>{type.label}</Text>
            <Text style={styles.goalTypeDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderNewGoalModal = () => (
    <Modal
      visible={showNewGoalModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowNewGoalModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Goal</Text>
            <TouchableOpacity onPress={() => setShowNewGoalModal(false)}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {renderGoalTypeSelector()}

            {/* Goal Title */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Goal Title *</Text>
              <TextInput
                style={styles.textInput}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal(prev => ({ ...prev, title: text }))}
                placeholder="e.g., Improve Math scores to 85%"
              />
            </View>

            {/* Goal Description */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal(prev => ({ ...prev, description: text }))}
                placeholder="Describe what this goal aims to achieve..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Target Value */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                Target: {newGoal.targetValue}{newGoal.unit}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={newGoal.type === 'performance' ? 50 : 1}
                maximumValue={newGoal.type === 'performance' ? 100 : 
                              newGoal.type === 'study_time' ? 180 : 
                              newGoal.type === 'streak' ? 30 : 100}
                value={newGoal.targetValue}
                onValueChange={(value) => setNewGoal(prev => ({ 
                  ...prev, 
                  targetValue: Math.round(value) 
                }))}
                step={1}
                minimumTrackTintColor="#4A90E2"
                maximumTrackTintColor="#E0E0E0"
              />
            </View>

            {/* Priority */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {['low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      newGoal.priority === priority && styles.selectedPriority,
                      { borderColor: getPriorityColor(priority) }
                    ]}
                    onPress={() => setNewGoal(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      newGoal.priority === priority && { color: getPriorityColor(priority) }
                    ]}>
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Deadline */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Deadline</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={16} color="#4A90E2" />
                <Text style={styles.dateButtonText}>
                  {newGoal.deadline.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subjects (for academic goals) */}
            {newGoal.category === 'academic' && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Subjects (Optional)</Text>
                <View style={styles.subjectsSelector}>
                  {subjects.map((subject) => (
                    <TouchableOpacity
                      key={subject}
                      style={[
                        styles.subjectChip,
                        newGoal.subjects.includes(subject) && styles.selectedSubjectChip
                      ]}
                      onPress={() => {
                        setNewGoal(prev => ({
                          ...prev,
                          subjects: prev.subjects.includes(subject)
                            ? prev.subjects.filter(s => s !== subject)
                            : [...prev.subjects, subject]
                        }));
                      }}
                    >
                      <Text style={[
                        styles.subjectChipText,
                        newGoal.subjects.includes(subject) && styles.selectedSubjectChipText
                      ]}>
                        {subject}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Rewards */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Rewards (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={newGoal.rewards}
                onChangeText={(text) => setNewGoal(prev => ({ ...prev, rewards: text }))}
                placeholder="e.g., Extra screen time, favorite meal, small toy..."
              />
            </View>

            {/* Reminders */}
            <View style={styles.inputSection}>
              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Enable Reminders</Text>
                <Switch
                  value={newGoal.reminders}
                  onValueChange={(value) => setNewGoal(prev => ({ ...prev, reminders: value }))}
                  trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
                  thumbColor={newGoal.reminders ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.inputHint}>
                Get notifications to track progress and stay motivated
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowNewGoalModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGoal}
            >
              <Text style={styles.createButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={newGoal.deadline}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setNewGoal(prev => ({ ...prev, deadline: selectedDate }));
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </Modal>
  );

  const filterGoals = (status) => {
    if (status === 'active') {
      return goals.filter(goal => goal.status === 'active' && !isGoalOverdue(goal.deadline));
    } else if (status === 'completed') {
      return goals.filter(goal => goal.status === 'completed' || calculateProgress(goal) >= 100);
    } else if (status === 'overdue') {
      return goals.filter(goal => goal.status === 'active' && isGoalOverdue(goal.deadline));
    }
    return goals;
  };

  const filteredGoals = filterGoals(activeTab);

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
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Goal Setting</Text>
          <Text style={styles.headerSubtitle}>
            {child ? `${child.name}'s Goals` : 'Manage Study Goals'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => setShowNewGoalModal(true)}
        >
          <Feather name="plus" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Overview */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{goals.filter(g => g.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active Goals</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{goals.filter(g => calculateProgress(g) >= 100).length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{goals.filter(g => isGoalOverdue(g.deadline)).length}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {goals.length > 0 ? Math.round(goals.reduce((acc, goal) => acc + calculateProgress(goal), 0) / goals.length) : 0}%
          </Text>
          <Text style={styles.statLabel}>Avg Progress</Text>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View entering={FadeInUp.delay(150)} style={styles.tabContainer}>
        {[
          { key: 'active', label: 'Active', count: filterGoals('active').length },
          { key: 'completed', label: 'Completed', count: filterGoals('completed').length },
          { key: 'overdue', label: 'Overdue', count: filterGoals('overdue').length }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Goals List */}
      <FlatList
        data={filteredGoals}
        renderItem={renderGoalCard}
        keyExtractor={(item) => item.id}
        style={styles.goalsList}
        contentContainerStyle={styles.goalsContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.delay(300)} style={styles.emptyContainer}>
            <MaterialIcons name="flag" size={64} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'No Active Goals' :
               activeTab === 'completed' ? 'No Completed Goals' : 'No Overdue Goals'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active' ? 'Create your first goal to get started!' :
               activeTab === 'completed' ? 'Complete some goals to see them here.' : 'Great! No overdue goals.'}
            </Text>
            {activeTab === 'active' && (
              <TouchableOpacity 
                style={styles.createFirstGoalButton}
                onPress={() => setShowNewGoalModal(true)}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.createFirstGoalText}>Create First Goal</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        }
      />

      {renderNewGoalModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActionButton: {
    padding: 8,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  goalsList: {
    flex: 1,
  },
  goalsContent: {
    paddingHorizontal: 20,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overdueGoalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalIcon: {
    fontSize: 18,
  },
  goalDetails: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  goalCategory: {
    fontSize: 10,
    color: '#666',
    textTransform: 'capitalize',
  },
  goalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  goalProgress: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 12,
    color: '#666',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#4A90E2',
  },
  overdueText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  goalSubjects: {
    marginBottom: 12,
  },
  subjectsLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  subjectChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectChipText: {
    fontSize: 10,
    color: '#1976D2',
  },
  goalRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
  },
  rewardsText: {
    fontSize: 11,
    color: '#F57F17',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  createFirstGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createFirstGoalText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
  },
  goalTypesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  goalTypeCard: {
    width: 120,
    padding: 12,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGoalType: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  goalTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  goalTypeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  goalTypeDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectedPriority: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#666',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  subjectsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedSubjectChip: {
    backgroundColor: '#4A90E2',
  },
  selectedSubjectChipText: {
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 11,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default GoalSettingScreen;