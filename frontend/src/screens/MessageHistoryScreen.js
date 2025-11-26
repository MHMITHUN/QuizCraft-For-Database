import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { parentDashboard } from '../services/parentDashboard';
import { showToast } from '../components/Toast';

const MessageHistoryScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchQuery, selectedChild, selectedType, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [messagesData, childrenData] = await Promise.all([
        parentDashboard.getMessageHistory(),
        parentDashboard.getLinkedChildren()
      ]);
      
      setMessages(messagesData || []);
      setChildren(childrenData || []);
    } catch (error) {
      console.error('Error loading message history:', error);
      showToast('Failed to load message history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(message => 
        message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.childName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Child filter
    if (selectedChild !== 'all') {
      filtered = filtered.filter(message => message.childId === selectedChild);
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(message => message.type === selectedType);
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredMessages(filtered);
  };

  const deleteMessage = async (messageId) => {
    try {
      const result = await parentDashboard.deleteMessage(messageId);
      if (result) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        showToast('Message deleted', 'success');
      } else {
        showToast('Failed to delete message', 'error');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Error deleting message', 'error');
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'encouragement':
        return '💪';
      case 'reminder':
        return '⏰';
      case 'celebration':
        return '🎉';
      case 'concern':
        return '⚠️';
      case 'goal':
        return '🎯';
      default:
        return '💬';
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'encouragement':
        return '#4CAF50';
      case 'reminder':
        return '#FF9800';
      case 'celebration':
        return '#9C27B0';
      case 'concern':
        return '#F44336';
      case 'goal':
        return '#4A90E2';
      default:
        return '#666';
    }
  };

  const getChildAvatar = (childId) => {
    const child = children.find(c => c.id === childId);
    return child?.avatar || '👤';
  };

  const renderMessage = ({ item, index }) => (
    <Animated.View
      entering={SlideInRight.delay(index * 100)}
      style={styles.messageCard}
    >
      <View style={styles.messageHeader}>
        <View style={styles.messageInfo}>
          <View style={styles.childInfo}>
            <Text style={styles.childAvatar}>{getChildAvatar(item.childId)}</Text>
            <View>
              <Text style={styles.childName}>{item.childName}</Text>
              <Text style={styles.messageDate}>
                {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          
          <View style={styles.messageTypeContainer}>
            <View style={[styles.messageTypeBadge, { backgroundColor: `${getMessageColor(item.type)}15` }]}>
              <Text style={styles.messageTypeIcon}>{getMessageIcon(item.type)}</Text>
              <Text style={[styles.messageTypeText, { color: getMessageColor(item.type) }]}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteMessage(item.id)}
        >
          <Feather name="trash-2" size={16} color="#F44336" />
        </TouchableOpacity>
      </View>

      <Text style={styles.messageContent}>{item.content}</Text>
      
      {item.response && (
        <View style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Feather name="corner-down-right" size={14} color="#4A90E2" />
            <Text style={styles.responseLabel}>Child's Response</Text>
          </View>
          <Text style={styles.responseText}>{item.response}</Text>
        </View>
      )}

      <View style={styles.messageFooter}>
        <View style={styles.messageStats}>
          {item.isRead && (
            <View style={styles.readIndicator}>
              <MaterialIcons name="done-all" size={14} color="#4CAF50" />
              <Text style={styles.readText}>Read</Text>
            </View>
          )}
          
          {item.reactionCount > 0 && (
            <View style={styles.reactionIndicator}>
              <MaterialIcons name="favorite" size={14} color="#E91E63" />
              <Text style={styles.reactionText}>{item.reactionCount}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.replyButton}
          onPress={() => navigation.navigate('ChildProgress', { 
            childId: item.childId, 
            childName: item.childName,
            openMessageModal: true 
          })}
        >
          <Feather name="reply" size={14} color="#4A90E2" />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.emptyContainer}>
      <MaterialIcons name="message" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No Messages Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedChild !== 'all' || selectedType !== 'all' 
          ? 'Try adjusting your filters to see more messages'
          : 'Start communicating with your children!'}
      </Text>
      
      {!searchQuery && selectedChild === 'all' && selectedType === 'all' && (
        <TouchableOpacity 
          style={styles.sendMessageButton}
          onPress={() => navigation.navigate('ParentDashboard')}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.sendMessageButtonText}>Send First Message</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

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
          <Text style={styles.headerTitle}>Message History</Text>
          <Text style={styles.headerSubtitle}>
            {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Feather name="filter" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Quick Filters */}
      <Animated.View entering={FadeInUp.delay(150)} style={styles.quickFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.quickFilter, selectedType === 'all' && styles.quickFilterActive]}
            onPress={() => setSelectedType('all')}
          >
            <Text style={[styles.quickFilterText, selectedType === 'all' && styles.quickFilterTextActive]}>
              All Types
            </Text>
          </TouchableOpacity>
          
          {['encouragement', 'reminder', 'celebration', 'concern', 'goal'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.quickFilter, selectedType === type && styles.quickFilterActive]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={styles.quickFilterIcon}>{getMessageIcon(type)}</Text>
              <Text style={[styles.quickFilterText, selectedType === type && styles.quickFilterTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Messages List */}
      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4A90E2"
            colors={['#4A90E2']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Messages</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Child Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Filter by Child</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childFilters}>
                <TouchableOpacity
                  style={[styles.childFilter, selectedChild === 'all' && styles.childFilterActive]}
                  onPress={() => setSelectedChild('all')}
                >
                  <Text style={styles.childFilterEmoji}>👨‍👩‍👧‍👦</Text>
                  <Text style={[styles.childFilterText, selectedChild === 'all' && styles.childFilterTextActive]}>
                    All Children
                  </Text>
                </TouchableOpacity>
                
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.childFilter, selectedChild === child.id && styles.childFilterActive]}
                    onPress={() => setSelectedChild(child.id)}
                  >
                    <Text style={styles.childFilterEmoji}>{child.avatar}</Text>
                    <Text style={[styles.childFilterText, selectedChild === child.id && styles.childFilterTextActive]}>
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sort Order */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort Order</Text>
              <View style={styles.sortOptions}>
                <TouchableOpacity
                  style={[styles.sortOption, sortOrder === 'newest' && styles.sortOptionActive]}
                  onPress={() => setSortOrder('newest')}
                >
                  <MaterialIcons name="arrow-downward" size={16} color={sortOrder === 'newest' ? '#4A90E2' : '#666'} />
                  <Text style={[styles.sortOptionText, sortOrder === 'newest' && styles.sortOptionTextActive]}>
                    Newest First
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.sortOption, sortOrder === 'oldest' && styles.sortOptionActive]}
                  onPress={() => setSortOrder('oldest')}
                >
                  <MaterialIcons name="arrow-upward" size={16} color={sortOrder === 'oldest' ? '#4A90E2' : '#666'} />
                  <Text style={[styles.sortOptionText, sortOrder === 'oldest' && styles.sortOptionTextActive]}>
                    Oldest First
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => {
                setSelectedChild('all');
                setSelectedType('all');
                setSortOrder('newest');
                setSearchQuery('');
                showToast('Filters cleared', 'success');
              }}
            >
              <Feather name="refresh-cw" size={16} color="#4A90E2" />
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>

            {/* Apply Button */}
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  quickFiltersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginLeft: 16,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
  },
  quickFilterActive: {
    backgroundColor: '#4A90E2',
  },
  quickFilterIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  quickFilterText: {
    fontSize: 12,
    color: '#666',
  },
  quickFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageInfo: {
    flex: 1,
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  childAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  childName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  messageDate: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  messageTypeContainer: {
    alignItems: 'flex-end',
  },
  messageTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  messageTypeIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  messageTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deleteButton: {
    padding: 4,
  },
  messageContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 6,
  },
  responseText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  readText: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 4,
  },
  reactionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionText: {
    fontSize: 11,
    color: '#E91E63',
    marginLeft: 4,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  replyText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    marginHorizontal: 40,
  },
  sendMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  sendMessageButtonText: {
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
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  childFilters: {
    maxHeight: 100,
  },
  childFilter: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  childFilterActive: {
    backgroundColor: '#4A90E2',
  },
  childFilterEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  childFilterText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  childFilterTextActive: {
    color: '#fff',
  },
  sortOptions: {
    flexDirection: 'row',
  },
  sortOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  sortOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  sortOptionTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 8,
  },
  applyButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MessageHistoryScreen;