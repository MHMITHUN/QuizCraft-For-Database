import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { searchAPI, quizAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';

export default function SearchScreen({ navigation }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [popularCategories, setPopularCategories] = useState(['General Knowledge', 'Science', 'History', 'Technology', 'Sports']);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const { theme } = useTheme();

  useEffect(() => {
    loadInitialData();
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
      })
    ]).start();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load recent/popular quizzes for suggestions
      const res = await quizAPI.getAll(1, 6); // Get first 6 quizzes
      setRecentQuizzes(res?.data?.data?.quizzes || []);
    } catch (error) {
      console.warn('Failed to load initial data:', error);
    }
  };

  const onSearch = async (searchQuery = query) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    try {
      // Use both vector search and text search for comprehensive results
      const [vectorResults, textResults] = await Promise.allSettled([
        searchAPI.vectorSearch(trimmedQuery, 15), // Vector search using embeddings
        searchAPI.similarQuizzes(trimmedQuery, 10) // Traditional text search
      ]);
      
      let combinedResults = [];
      
      // Process vector search results
      if (vectorResults.status === 'fulfilled') {
        const vectorQuizzes = vectorResults.value?.data?.data?.quizzes || [];
        combinedResults = [...vectorQuizzes];
      }
      
      // Process text search results and merge without duplicates
      if (textResults.status === 'fulfilled') {
        const textQuizzes = textResults.value?.data?.data?.quizzes || [];
        const existingIds = new Set(combinedResults.map(quiz => quiz._id));
        
        // Add text search results that aren't already included
        const uniqueTextResults = textQuizzes.filter(quiz => !existingIds.has(quiz._id));
        combinedResults = [...combinedResults, ...uniqueTextResults];
      }
      
      // Sort by relevance score (vector search results typically have similarity scores)
      combinedResults.sort((a, b) => {
        const scoreA = a.similarity || a.relevanceScore || 0;
        const scoreB = b.similarity || b.relevanceScore || 0;
        return scoreB - scoreA;
      });
      
      setResults(combinedResults.slice(0, 20)); // Limit to 20 results
      
      // Add to search history
      if (!searchHistory.includes(trimmedQuery)) {
        setSearchHistory(prev => [trimmedQuery, ...prev.slice(0, 4)]); // Keep last 5 searches
      }
      
      setShowHistory(false);
      
      // Log search performance for analytics
      console.log(`Vector search returned ${vectorResults.status === 'fulfilled' ? vectorResults.value?.data?.data?.quizzes?.length || 0 : 0} results`);
      console.log(`Text search returned ${textResults.status === 'fulfilled' ? textResults.value?.data?.data?.quizzes?.length || 0 : 0} results`);
      console.log(`Combined results: ${combinedResults.length}`);
      
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to search quizzes. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onCategorySearch = (category) => {
    setQuery(category);
    onSearch(category);
  };

  const onHistorySearch = (historyQuery) => {
    setQuery(historyQuery);
    onSearch(historyQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowHistory(false);
  };

  const renderQuizItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.quizCard,
        { 
          backgroundColor: theme === 'light' ? 'white' : '#1e1e1e',
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.quizCardContent}
        onPress={() => navigation.navigate('QuizDetail', { id: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.quizCardHeader}>
          <Text style={[styles.quizTitle, { color: theme === 'light' ? '#111827' : 'white' }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{item.difficulty || 'Medium'}</Text>
          </View>
        </View>
        
        <View style={styles.quizCardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={16} color="#6B7280" />
            <Text style={[styles.metaText, { color: theme === 'light' ? '#6B7280' : '#9ca3af' }]}>{item.category || 'General'}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="help-circle-outline" size={16} color="#6B7280" />
            <Text style={[styles.metaText, { color: theme === 'light' ? '#6B7280' : '#9ca3af' }]}>{item.questions?.length || 0} questions</Text>
          </View>
          
          {item.similarity && (
            <View style={styles.metaItem}>
              <Ionicons name="analytics-outline" size={16} color="#10B981" />
              <Text style={[styles.metaText, { color: '#10B981' }]}>
                {Math.round(item.similarity * 100)}% match
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.quizCardFooter}>
          <Text style={[styles.creatorText, { color: theme === 'light' ? '#9CA3AF' : '#6B7280' }]}>By {item.creator?.name || 'Unknown'}</Text>
          <TouchableOpacity style={styles.playButton}>
            <Ionicons name="play" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.categoryChip, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
      onPress={() => onCategorySearch(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.categoryText, { color: theme === 'light' ? '#374151' : 'white' }]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.historyItem, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
      onPress={() => onHistorySearch(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="time-outline" size={20} color="#6B7280" />
      <Text style={[styles.historyText, { color: theme === 'light' ? '#374151' : 'white' }]}>{item}</Text>
      <TouchableOpacity 
        onPress={() => setSearchHistory(prev => prev.filter(h => h !== item))}
        style={styles.removeHistoryBtn}
      >
        <Ionicons name="close" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.suggestionCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
      onPress={() => navigation.navigate('QuizDetail', { id: item._id })}
      activeOpacity={0.8}
    >
      <Text style={[styles.suggestionTitle, { color: theme === 'light' ? '#111827' : 'white' }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.suggestionMeta, { color: theme === 'light' ? '#6B7280' : '#9ca3af' }]}>{item.category} • {item.questions?.length || 0} questions</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F8FAFC' : '#121212' }]}>
      {/* Header */}
      <LinearGradient colors={theme === 'light' ? ['#4F46E5', '#7C3AED'] : ['#222','#555']} style={styles.header}>
        <Animated.View 
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.headerTitle}>🔍 {t('home:exploreQuizzes')}</Text>
          <Text style={styles.headerSubtitle}>Discover amazing quizzes</Text>
        </Animated.View>
      </LinearGradient>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#272727' }]}>
          <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: theme === 'light' ? '#111827' : 'white' }]}
            placeholder="Search quizzes..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text.length === 0) {
                setResults([]);
                setShowHistory(false);
              }
            }}
            onFocus={() => setShowHistory(searchHistory.length > 0 && query.length === 0)}
            onSubmitEditing={() => onSearch()}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => onSearch()}
            disabled={!query.trim()}
          >
            <LinearGradient 
              colors={query.trim() ? ['#4F46E5', '#7C3AED'] : ['#9CA3AF', '#6B7280']}
              style={styles.searchButtonGradient}
            >
              <Ionicons name="search" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search History */}
        {showHistory && searchHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Recent Searches</Text>
            <FlatList 
              data={searchHistory}
              renderItem={renderHistoryItem}
              keyExtractor={(item, index) => `history-${index}`}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[styles.loadingText, { color: theme === 'light' ? '#6B7280' : '#9ca3af' }]}>Searching quizzes...</Text>
          </View>
        )}

        {/* Search Results */}
        {results.length > 0 && !loading && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>
              Search Results ({results.length})
            </Text>
            <FlatList 
              data={results}
              renderItem={renderQuizItem}
              keyExtractor={(item, index) => item._id || `result-${index}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* No Results */}
        {query.length > 0 && results.length === 0 && !loading && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsEmoji}>🔍</Text>
            <Text style={[styles.noResultsTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>No quizzes found</Text>
            <Text style={[styles.noResultsText, { color: theme === 'light' ? '#6B7280' : '#9ca3af' }]}>Try searching with different keywords or browse categories below</Text>
          </View>
        )}

        {/* Popular Categories */}
        {(results.length === 0 || query.length === 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Popular Categories</Text>
            <FlatList 
              data={popularCategories}
              renderItem={renderCategoryItem}
              keyExtractor={(item, index) => `category-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            />
          </View>
        )}

        {/* Suggested Quizzes */}
        {(results.length === 0 || query.length === 0) && recentQuizzes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#111827' : 'white' }]}>Suggested for You</Text>
            <FlatList 
              data={recentQuizzes}
              renderItem={renderSuggestionItem}
              keyExtractor={(item, index) => item._id || `suggestion-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContainer}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 16,
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  searchButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  quizCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
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
  quizCardContent: {
    padding: 20,
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 12,
  },
  difficultyBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  quizCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  quizCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  playButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingLeft: 20,
  },
  categoryChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  suggestionsContainer: {
    paddingLeft: 20,
  },
  suggestionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  suggestionMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  removeHistoryBtn: {
    padding: 4,
  },
});
