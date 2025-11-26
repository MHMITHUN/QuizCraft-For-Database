import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import competitionSystem from '../services/competitionSystem';

const { width, height } = Dimensions.get('window');

const TournamentBracket = ({ navigation, route }) => {
  const { tournamentId } = route.params;
  
  // State Management
  const [tournament, setTournament] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    loadTournament();
  }, []);

  const loadTournament = async () => {
    try {
      setLoading(true);
      
      // Mock tournament data for demonstration
      const mockTournament = {
        id: tournamentId,
        title: 'Mathematics Championship 2024',
        description: 'Single elimination tournament',
        format: 'single_elimination',
        status: 'in_progress',
        currentRound: 2,
        totalRounds: 4,
        participants: [
          { id: 'p1', name: 'Alex Chen', avatar: '🎯', seed: 1 },
          { id: 'p2', name: 'Sarah Kim', avatar: '⚡', seed: 2 },
          { id: 'p3', name: 'Mike Johnson', avatar: '🏆', seed: 3 },
          { id: 'p4', name: 'Emma Davis', avatar: '🌟', seed: 4 },
          { id: 'p5', name: 'James Wilson', avatar: '🔥', seed: 5 },
          { id: 'p6', name: 'Lisa Garcia', avatar: '💎', seed: 6 },
          { id: 'p7', name: 'David Brown', avatar: '⭐', seed: 7 },
          { id: 'p8', name: 'Anna Taylor', avatar: '🚀', seed: 8 }
        ],
        bracket: {
          format: 'single_elimination',
          totalRounds: 4,
          currentRound: 2,
          rounds: [
            {
              roundNumber: 1,
              title: 'Quarter-Finals',
              matches: [
                {
                  id: 'match_1_1',
                  roundNumber: 1,
                  participant1: { id: 'p1', name: 'Alex Chen', avatar: '🎯' },
                  participant2: { id: 'p8', name: 'Anna Taylor', avatar: '🚀' },
                  winner: { id: 'p1', name: 'Alex Chen', avatar: '🎯' },
                  status: 'completed',
                  scores: { p1: 95, p2: 87 },
                  completedAt: '2024-01-15T10:30:00Z'
                },
                {
                  id: 'match_1_2',
                  roundNumber: 1,
                  participant1: { id: 'p4', name: 'Emma Davis', avatar: '🌟' },
                  participant2: { id: 'p5', name: 'James Wilson', avatar: '🔥' },
                  winner: { id: 'p4', name: 'Emma Davis', avatar: '🌟' },
                  status: 'completed',
                  scores: { p1: 92, p2: 89 },
                  completedAt: '2024-01-15T10:45:00Z'
                },
                {
                  id: 'match_1_3',
                  roundNumber: 1,
                  participant1: { id: 'p2', name: 'Sarah Kim', avatar: '⚡' },
                  participant2: { id: 'p7', name: 'David Brown', avatar: '⭐' },
                  winner: { id: 'p2', name: 'Sarah Kim', avatar: '⚡' },
                  status: 'completed',
                  scores: { p1: 98, p2: 85 },
                  completedAt: '2024-01-15T11:00:00Z'
                },
                {
                  id: 'match_1_4',
                  roundNumber: 1,
                  participant1: { id: 'p3', name: 'Mike Johnson', avatar: '🏆' },
                  participant2: { id: 'p6', name: 'Lisa Garcia', avatar: '💎' },
                  winner: { id: 'p3', name: 'Mike Johnson', avatar: '🏆' },
                  status: 'completed',
                  scores: { p1: 94, p2: 90 },
                  completedAt: '2024-01-15T11:15:00Z'
                }
              ],
              status: 'completed'
            },
            {
              roundNumber: 2,
              title: 'Semi-Finals',
              matches: [
                {
                  id: 'match_2_1',
                  roundNumber: 2,
                  participant1: { id: 'p1', name: 'Alex Chen', avatar: '🎯' },
                  participant2: { id: 'p4', name: 'Emma Davis', avatar: '🌟' },
                  winner: { id: 'p1', name: 'Alex Chen', avatar: '🎯' },
                  status: 'completed',
                  scores: { p1: 96, p2: 91 },
                  completedAt: '2024-01-16T10:30:00Z'
                },
                {
                  id: 'match_2_2',
                  roundNumber: 2,
                  participant1: { id: 'p2', name: 'Sarah Kim', avatar: '⚡' },
                  participant2: { id: 'p3', name: 'Mike Johnson', avatar: '🏆' },
                  winner: null,
                  status: 'active',
                  scores: { p1: 0, p2: 0 },
                  scheduledTime: '2024-01-16T14:00:00Z'
                }
              ],
              status: 'active'
            },
            {
              roundNumber: 3,
              title: 'Final',
              matches: [
                {
                  id: 'match_3_1',
                  roundNumber: 3,
                  participant1: { id: 'p1', name: 'Alex Chen', avatar: '🎯' },
                  participant2: null,
                  winner: null,
                  status: 'pending',
                  scores: { p1: 0, p2: 0 }
                }
              ],
              status: 'pending'
            }
          ]
        }
      };
      
      setTournament(mockTournament);
      setBracket(mockTournament.bracket);
      setCurrentRound(mockTournament.bracket.currentRound);
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
      
    } catch (error) {
      console.error('Error loading tournament:', error);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPress = (match) => {
    setSelectedMatch(match);
    
    if (match.status === 'active') {
      Alert.alert(
        'Active Match',
        `${match.participant1.name} vs ${match.participant2?.name || 'TBD'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Watch Live', onPress: () => watchMatch(match.id) },
          { text: 'View Details', onPress: () => showMatchDetails(match) }
        ]
      );
    } else if (match.status === 'completed') {
      showMatchDetails(match);
    }
  };

  const watchMatch = (matchId) => {
    // Navigate to live match viewing
    Alert.alert('Feature Coming Soon', 'Live match watching will be available soon!');
  };

  const showMatchDetails = (match) => {
    const details = `
Match: ${match.participant1.name} vs ${match.participant2?.name || 'TBD'}
Status: ${match.status.toUpperCase()}
${match.status === 'completed' ? `
Final Scores:
${match.participant1.name}: ${match.scores.p1}
${match.participant2.name}: ${match.scores.p2}
Winner: ${match.winner?.name}
Completed: ${new Date(match.completedAt).toLocaleString()}
` : ''}`;

    Alert.alert('Match Details', details);
  };

  // ========== RENDER METHODS ==========
  const renderHeader = () => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.header}
    >
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Tournament Bracket</Text>
        {tournament && (
          <Text style={styles.headerSubtitle}>{tournament.title}</Text>
        )}
      </View>
      
      <TouchableOpacity style={styles.infoButton} onPress={showTournamentInfo}>
        <Ionicons name="information-circle-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderRoundSelector = () => (
    <View style={styles.roundSelector}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roundSelectorContent}
      >
        {bracket.rounds.map((round) => (
          <TouchableOpacity
            key={round.roundNumber}
            style={[
              styles.roundTab,
              currentRound === round.roundNumber && styles.activeRoundTab,
              round.status === 'completed' && styles.completedRoundTab
            ]}
            onPress={() => setCurrentRound(round.roundNumber)}
          >
            <Text style={[
              styles.roundTabText,
              currentRound === round.roundNumber && styles.activeRoundTabText
            ]}>
              {round.title}
            </Text>
            <View style={styles.roundStatus}>
              <Ionicons 
                name={
                  round.status === 'completed' ? 'checkmark-circle' :
                  round.status === 'active' ? 'play-circle' : 'time-outline'
                }
                size={16}
                color={
                  currentRound === round.roundNumber ? '#fff' :
                  round.status === 'completed' ? '#4CAF50' :
                  round.status === 'active' ? '#FF9800' : '#999'
                }
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBracketView = () => {
    const currentRoundData = bracket.rounds.find(r => r.roundNumber === currentRound);
    
    return (
      <Animated.View 
        style={[
          styles.bracketContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.bracketScrollView}
        >
          <View style={styles.bracketContent}>
            {renderAllRounds()}
          </View>
        </ScrollView>
        
        {/* Current Round Details */}
        {currentRoundData && renderRoundDetails(currentRoundData)}
      </Animated.View>
    );
  };

  const renderAllRounds = () => {
    const rounds = bracket.rounds;
    const roundWidth = 250;
    const matchHeight = 120;
    const roundSpacing = 50;
    
    return (
      <View style={styles.fullBracket}>
        {rounds.map((round, roundIndex) => (
          <View 
            key={round.roundNumber} 
            style={[
              styles.roundColumn,
              { width: roundWidth }
            ]}
          >
            <Text style={styles.roundTitle}>{round.title}</Text>
            
            <View style={styles.matchesColumn}>
              {round.matches.map((match, matchIndex) => {
                const matchY = matchIndex * (matchHeight + 20);
                
                return (
                  <TouchableOpacity
                    key={match.id}
                    style={[
                      styles.matchCard,
                      { top: matchY },
                      match.status === 'active' && styles.activeMatchCard,
                      match.status === 'completed' && styles.completedMatchCard
                    ]}
                    onPress={() => handleMatchPress(match)}
                  >
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchRound}>Round {round.roundNumber}</Text>
                      <View style={[
                        styles.matchStatusBadge,
                        { backgroundColor: getStatusColor(match.status) }
                      ]}>
                        <Text style={styles.matchStatusText}>
                          {match.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.participantsContainer}>
                      {/* Participant 1 */}
                      <View style={[
                        styles.participantRow,
                        match.winner?.id === match.participant1.id && styles.winnerRow
                      ]}>
                        <Text style={styles.participantAvatar}>
                          {match.participant1.avatar}
                        </Text>
                        <Text style={styles.participantName} numberOfLines={1}>
                          {match.participant1.name}
                        </Text>
                        {match.status === 'completed' && (
                          <Text style={styles.participantScore}>
                            {match.scores.p1}
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.vsDivider}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                      
                      {/* Participant 2 */}
                      <View style={[
                        styles.participantRow,
                        match.winner?.id === match.participant2?.id && styles.winnerRow
                      ]}>
                        <Text style={styles.participantAvatar}>
                          {match.participant2?.avatar || '❓'}
                        </Text>
                        <Text style={styles.participantName} numberOfLines={1}>
                          {match.participant2?.name || 'TBD'}
                        </Text>
                        {match.status === 'completed' && match.participant2 && (
                          <Text style={styles.participantScore}>
                            {match.scores.p2}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {match.status === 'completed' && match.winner && (
                      <View style={styles.winnerBadge}>
                        <Ionicons name="trophy" size={16} color="#FFD700" />
                        <Text style={styles.winnerText}>
                          {match.winner.name} Wins!
                        </Text>
                      </View>
                    )}
                    
                    {match.status === 'active' && (
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Connection Lines */}
            {roundIndex < rounds.length - 1 && renderConnections(round, rounds[roundIndex + 1])}
          </View>
        ))}
      </View>
    );
  };

  const renderConnections = (currentRound, nextRound) => {
    // SVG lines connecting matches between rounds
    return (
      <Svg
        style={styles.connectionLines}
        width={50}
        height={400}
      >
        {currentRound.matches.map((match, index) => {
          if (index % 2 === 0) {
            const nextMatchIndex = Math.floor(index / 2);
            const startY = (index * 140) + 60;
            const endY = (nextMatchIndex * 140) + 60;
            
            return (
              <Line
                key={`line_${index}`}
                x1="0"
                y1={startY}
                x2="50"
                y2={endY}
                stroke="#667eea"
                strokeWidth="2"
              />
            );
          }
          return null;
        })}
      </Svg>
    );
  };

  const renderRoundDetails = (round) => (
    <View style={styles.roundDetails}>
      <Text style={styles.roundDetailsTitle}>
        {round.title} - {round.matches.length} matches
      </Text>
      <Text style={styles.roundDetailsStatus}>
        Status: {round.status.toUpperCase()}
      </Text>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'active': return '#FF9800';
      case 'pending': return '#999';
      default: return '#999';
    }
  };

  const showTournamentInfo = () => {
    if (!tournament) return;
    
    const info = `
Tournament: ${tournament.title}
Format: ${tournament.format.replace('_', ' ').toUpperCase()}
Status: ${tournament.status.toUpperCase()}
Total Rounds: ${bracket.totalRounds}
Current Round: ${bracket.currentRound}
Participants: ${tournament.participants.length}
`;
    
    Alert.alert('Tournament Information', info);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading tournament bracket...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {renderHeader()}
      {renderRoundSelector()}
      {renderBracketView()}
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
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundSelector: {
    backgroundColor: '#fff',
    elevation: 3,
  },
  roundSelectorContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  roundTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  activeRoundTab: {
    backgroundColor: '#667eea',
  },
  completedRoundTab: {
    backgroundColor: '#E8F5E8',
  },
  roundTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeRoundTabText: {
    color: '#fff',
  },
  roundStatus: {
    // Additional styling for status indicator
  },
  bracketContainer: {
    flex: 1,
  },
  bracketScrollView: {
    flex: 1,
  },
  bracketContent: {
    padding: 20,
  },
  fullBracket: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 600,
  },
  roundColumn: {
    marginRight: 50,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  matchesColumn: {
    position: 'relative',
    minHeight: 400,
  },
  matchCard: {
    position: 'absolute',
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  activeMatchCard: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  completedMatchCard: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchRound: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  matchStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  participantsContainer: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  winnerRow: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  participantAvatar: {
    fontSize: 18,
    marginRight: 8,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  participantScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    minWidth: 30,
    textAlign: 'right',
  },
  vsDivider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  vsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFF3C4',
    borderRadius: 15,
    gap: 4,
  },
  winnerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  connectionLines: {
    position: 'absolute',
    right: -50,
    top: 60,
  },
  roundDetails: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    elevation: 2,
  },
  roundDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  roundDetailsStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default TournamentBracket;