import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  BackHandler,
  SafeAreaView,
  StatusBar,
  VibrationIOS,
  Vibration
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import competitionSystem from '../services/competitionSystem';

const { width, height } = Dimensions.get('window');

const LiveBattleRoom = ({ navigation, route }) => {
  const { battleId, playerId } = route.params;
  
  // Game State
  const [battleData, setBattleData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting, active, results, ended
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [lastQuestionResult, setLastQuestionResult] = useState(null);
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  // Timer Ref
  const timerRef = useRef(null);
  const battleListener = useRef(null);

  useEffect(() => {
    initializeBattle();
    setupBackHandler();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (gamePhase === 'active' && currentQuestion) {
      startQuestionTimer();
      animateQuestionIn();
    }
  }, [currentQuestion, gamePhase]);

  const initializeBattle = async () => {
    try {
      // Setup battle event listener
      battleListener.current = competitionSystem.addBattleListener(battleId, handleBattleEvent);
      
      // Get initial battle state (mock data for demo)
      const mockBattle = {
        id: battleId,
        title: 'Math Challenge',
        players: [
          { id: playerId, name: 'You', avatar: '🎯', score: 0 },
          { id: 'opponent_1', name: 'Alex', avatar: '⚡', score: 0 }
        ],
        status: 'waiting',
        currentQuestion: 0,
        totalQuestions: 10
      };
      
      setBattleData(mockBattle);
      setPlayers(mockBattle.players);
      setGamePhase(mockBattle.status);
      
      animateIn();
      
      // Auto-start after 3 seconds for demo
      setTimeout(() => {
        startBattle();
      }, 3000);
      
    } catch (error) {
      console.error('Error initializing battle:', error);
      Alert.alert('Error', 'Failed to join battle room');
      navigation.goBack();
    }
  };

  const setupBackHandler = () => {
    const backAction = () => {
      Alert.alert(
        'Leave Battle?',
        'Are you sure you want to leave the battle?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: () => leaveBattle() }
        ]
      );
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => BackHandler.removeEventListener('hardwareBackPress', backAction);
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (battleListener.current) {
      competitionSystem.removeBattleListener(battleListener.current);
    }
  };

  const animateIn = () => {
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
  };

  const animateQuestionIn = () => {
    scaleAnim.setValue(0.8);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const startBattle = () => {
    const mockQuestion = {
      id: 'q1',
      question: 'What is 15 × 8?',
      options: ['120', '115', '125', '110'],
      correctAnswer: 0,
      points: 10,
      timeLimit: 30
    };
    
    setCurrentQuestion(mockQuestion);
    setQuestionNumber(1);
    setGamePhase('active');
    setTimeLeft(30);
    setSelectedAnswer(null);
    
    // Vibrate to signal start
    if (Vibration) {
      Vibration.vibrate(100);
    }
  };

  const startQuestionTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const startTime = 30;
    setTimeLeft(startTime);
    progressAnim.setValue(1);
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: startTime * 1000,
      useNativeDriver: false,
    }).start();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!selectedAnswer) {
            handleTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBattleEvent = ({ event, data }) => {
    console.log('Battle event:', event, data);
    
    switch (event) {
      case 'player_joined':
        setPlayers(prev => [...prev.filter(p => p.id !== data.player.id), data.player]);
        break;
        
      case 'battle_started':
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setGamePhase('active');
        break;
        
      case 'question_results':
        showQuestionResults(data);
        break;
        
      case 'next_question':
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setSelectedAnswer(null);
        break;
        
      case 'battle_ended':
        showFinalResults(data);
        break;
    }
  };

  const submitAnswer = async (answerIndex) => {
    if (selectedAnswer !== null || gamePhase !== 'active') return;
    
    setSelectedAnswer(answerIndex);
    clearInterval(timerRef.current);
    
    // Animate selection
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    try {
      const result = await competitionSystem.submitBattleAnswer(battleId, playerId, answerIndex);
      
      if (result.success) {
        setMyScore(result.currentScore);
        
        // Show immediate feedback
        const isCorrect = answerIndex === currentQuestion.correctAnswer;
        setLastQuestionResult({
          isCorrect,
          points: result.points,
          correctAnswer: currentQuestion.correctAnswer
        });
        
        // Vibrate based on result
        if (Vibration) {
          Vibration.vibrate(isCorrect ? [0, 100] : [0, 100, 100, 100]);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
    }
  };

  const handleTimeUp = () => {
    setLastQuestionResult({
      isCorrect: false,
      points: 0,
      correctAnswer: currentQuestion.correctAnswer
    });
    
    if (Vibration) {
      Vibration.vibrate([0, 100, 100, 100]);
    }
  };

  const showQuestionResults = (data) => {
    setGamePhase('results');
    setLeaderboard(data.leaderboard);
    
    // Auto-move to next question after 3 seconds
    setTimeout(() => {
      setLastQuestionResult(null);
      if (data.questionNumber < battleData.totalQuestions) {
        // Next question will be handled by event
      }
    }, 3000);
  };

  const showFinalResults = (data) => {
    setGamePhase('ended');
    setLeaderboard(data.results);
    
    // Celebrate if won
    if (data.winner && data.winner.playerId === playerId) {
      celebrateWin();
    }
  };

  const celebrateWin = () => {
    if (Vibration) {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  };

  const leaveBattle = () => {
    cleanup();
    navigation.goBack();
  };

  const playAgain = () => {
    navigation.replace('CompetitionScreen');
  };

  // ========== RENDER METHODS ==========
  const renderWaitingRoom = () => (
    <Animated.View style={[styles.waitingContainer, { opacity: fadeAnim }]}>
      <View style={styles.waitingContent}>
        <Text style={styles.waitingTitle}>Waiting for Players</Text>
        <Text style={styles.roomCodeText}>
          Room Code: {competitionSystem.generateRoomCode(battleId)}
        </Text>
        
        <View style={styles.playersContainer}>
          {players.map((player, index) => (
            <Animated.View 
              key={player.id} 
              style={[
                styles.playerCard,
                { 
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim 
                }
              ]}
            >
              <Text style={styles.playerAvatar}>{player.avatar}</Text>
              <Text style={styles.playerName}>{player.name}</Text>
              <View style={[
                styles.readyIndicator,
                player.id === playerId ? styles.readyIndicatorActive : null
              ]}>
                <Ionicons 
                  name={player.id === playerId ? "checkmark-circle" : "time-outline"} 
                  size={20} 
                  color={player.id === playerId ? "#4CAF50" : "#FFA726"} 
                />
              </View>
            </Animated.View>
          ))}
        </View>
        
        <Text style={styles.waitingSubtext}>
          Battle will start automatically when ready...
        </Text>
      </View>
    </Animated.View>
  );

  const renderActiveQuestion = () => (
    <Animated.View 
      style={[
        styles.questionContainer, 
        { 
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { 
              translateX: shakeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 10]
              })
            }
          ]
        }
      ]}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]} 
        />
      </View>
      
      {/* Question Header */}
      <View style={styles.questionHeader}>
        <Text style={styles.questionCounter}>
          Question {questionNumber} of {battleData.totalQuestions}
        </Text>
        <View style={styles.timerContainer}>
          <Ionicons name="timer-outline" size={20} color="#FF5722" />
          <Text style={[styles.timerText, timeLeft <= 5 && styles.timerCritical]}>
            {timeLeft}s
          </Text>
        </View>
      </View>
      
      {/* Question */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>
      
      {/* Answer Options */}
      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = lastQuestionResult && index === lastQuestionResult.correctAnswer;
          const isWrong = lastQuestionResult && isSelected && !lastQuestionResult.isCorrect;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                isSelected && styles.selectedOption,
                isCorrect && styles.correctOption,
                isWrong && styles.wrongOption
              ]}
              onPress={() => submitAnswer(index)}
              disabled={selectedAnswer !== null}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                  isCorrect && styles.correctOptionText,
                  isWrong && styles.wrongOptionText
                ]}>
                  {option}
                </Text>
              </View>
              
              {isSelected && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color="#fff" 
                />
              )}
              
              {lastQuestionResult && isCorrect && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color="#fff" 
                />
              )}
              
              {lastQuestionResult && isWrong && (
                <Ionicons 
                  name="close-circle" 
                  size={20} 
                  color="#fff" 
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Result Feedback */}
      {lastQuestionResult && (
        <Animated.View style={styles.resultFeedback}>
          <Text style={[
            styles.resultText,
            lastQuestionResult.isCorrect ? styles.correctText : styles.wrongText
          ]}>
            {lastQuestionResult.isCorrect ? 
              `Correct! +${lastQuestionResult.points} points` : 
              'Wrong answer!'
            }
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderLeaderboard = () => (
    <View style={styles.leaderboardContainer}>
      <Text style={styles.leaderboardTitle}>Current Standings</Text>
      {leaderboard.map((player, index) => (
        <View key={player.playerId} style={styles.leaderboardItem}>
          <View style={styles.rankContainer}>
            <Text style={styles.rankText}>#{index + 1}</Text>
            {index === 0 && <Ionicons name="trophy" size={16} color="#FFD700" />}
          </View>
          <Text style={styles.leaderboardName}>
            {player.name || (player.playerId === playerId ? 'You' : 'Player')}
          </Text>
          <Text style={styles.leaderboardScore}>{player.totalScore}</Text>
        </View>
      ))}
    </View>
  );

  const renderFinalResults = () => (
    <Animated.View style={[styles.finalResultsContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={leaderboard[0]?.playerId === playerId ? ['#4CAF50', '#45A049'] : ['#FF5722', '#E64A19']}
        style={styles.resultHeader}
      >
        <Ionicons 
          name={leaderboard[0]?.playerId === playerId ? "trophy" : "medal"} 
          size={60} 
          color="#fff" 
        />
        <Text style={styles.resultTitle}>
          {leaderboard[0]?.playerId === playerId ? 'Victory!' : 'Good Game!'}
        </Text>
        <Text style={styles.resultSubtitle}>
          Final Score: {myScore} points
        </Text>
      </LinearGradient>
      
      {renderLeaderboard()}
      
      <View style={styles.finalActions}>
        <TouchableOpacity style={styles.actionButton} onPress={playAgain}>
          <Ionicons name="refresh" size={20} color="#667eea" />
          <Text style={styles.actionButtonText}>Play Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={leaveBattle}>
          <Ionicons name="home" size={20} color="#667eea" />
          <Text style={styles.actionButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderGameContent = () => {
    switch (gamePhase) {
      case 'waiting':
        return renderWaitingRoom();
      case 'active':
        return renderActiveQuestion();
      case 'results':
        return (
          <View style={styles.resultsPhaseContainer}>
            {renderActiveQuestion()}
            {renderLeaderboard()}
          </View>
        );
      case 'ended':
        return renderFinalResults();
      default:
        return renderWaitingRoom();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={leaveBattle}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Battle</Text>
          {battleData && (
            <Text style={styles.headerSubtitle}>{battleData.title}</Text>
          )}
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{myScore}</Text>
        </View>
      </LinearGradient>
      
      {/* Game Content */}
      <View style={styles.gameArea}>
        {renderGameContent()}
      </View>
      
      {/* Bottom Players Bar (for active game) */}
      {gamePhase === 'active' && (
        <View style={styles.playersBar}>
          {players.map(player => (
            <View key={player.id} style={styles.playerChip}>
              <Text style={styles.playerChipAvatar}>{player.avatar}</Text>
              <Text style={styles.playerChipName}>{player.name}</Text>
              <Text style={styles.playerChipScore}>{player.score}</Text>
            </View>
          ))}
        </View>
      )}
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
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  gameArea: {
    flex: 1,
    padding: 20,
  },

  // Waiting Room Styles
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingContent: {
    alignItems: 'center',
    width: '100%',
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  roomCodeText: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 30,
  },
  playersContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playerAvatar: {
    fontSize: 40,
    marginBottom: 10,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyIndicatorActive: {
    // Additional styling if needed
  },
  waitingSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Question Styles
  questionContainer: {
    flex: 1,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  questionCounter: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    marginLeft: 5,
  },
  timerCritical: {
    color: '#D32F2F',
    fontSize: 18,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedOption: {
    backgroundColor: '#667eea',
  },
  correctOption: {
    backgroundColor: '#4CAF50',
  },
  wrongOption: {
    backgroundColor: '#FF5722',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: '#fff',
  },
  correctOptionText: {
    color: '#fff',
  },
  wrongOptionText: {
    color: '#fff',
  },
  resultFeedback: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    alignItems: 'center',
    elevation: 2,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
  },
  correctText: {
    color: '#4CAF50',
  },
  wrongText: {
    color: '#FF5722',
  },

  // Results Phase
  resultsPhaseContainer: {
    flex: 1,
  },

  // Leaderboard Styles
  leaderboardContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    elevation: 3,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 5,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  leaderboardScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },

  // Final Results
  finalResultsContainer: {
    flex: 1,
  },
  resultHeader: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 15,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  resultSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  finalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },

  // Players Bar
  playersBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 5,
    gap: 15,
  },
  playerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  playerChipAvatar: {
    fontSize: 16,
  },
  playerChipName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  playerChipScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
  },
});

export default LiveBattleRoom;