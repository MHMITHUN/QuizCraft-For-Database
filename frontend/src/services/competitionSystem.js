import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';

class CompetitionSystem {
  constructor() {
    this.competitionTypes = {
      INTER_CLASS: 'inter_class',
      TOURNAMENT: 'tournament',
      LIVE_BATTLE: 'live_battle',
      SEASONAL_EVENT: 'seasonal_event',
      SCHOOL_CHAMPIONSHIP: 'school_championship',
      REGIONAL_CHAMPIONSHIP: 'regional_championship'
    };

    this.tournamentFormats = {
      SINGLE_ELIMINATION: 'single_elimination',
      DOUBLE_ELIMINATION: 'double_elimination',
      ROUND_ROBIN: 'round_robin',
      SWISS_SYSTEM: 'swiss_system',
      LADDER: 'ladder'
    };

    this.competitionStatus = {
      UPCOMING: 'upcoming',
      REGISTRATION_OPEN: 'registration_open',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled'
    };

    this.liveBattleRooms = new Map();
    this.eventListeners = new Map();
  }

  // ========== INTER-CLASS COMPETITIONS ==========
  async createInterClassCompetition(competitionData) {
    try {
      const competition = {
        id: `interclass_${Date.now()}`,
        type: this.competitionTypes.INTER_CLASS,
        title: competitionData.title,
        description: competitionData.description,
        organizerId: competitionData.organizerId,
        schoolId: competitionData.schoolId,
        
        // Competition Details
        subjects: competitionData.subjects || [],
        grades: competitionData.grades || [],
        classes: competitionData.classes || [],
        
        // Scheduling
        registrationStart: competitionData.registrationStart,
        registrationEnd: competitionData.registrationEnd,
        competitionStart: competitionData.competitionStart,
        competitionEnd: competitionData.competitionEnd,
        
        // Rules & Settings
        maxParticipants: competitionData.maxParticipants || 100,
        questionCount: competitionData.questionCount || 20,
        timeLimit: competitionData.timeLimit || 30, // minutes
        difficulty: competitionData.difficulty || 'mixed',
        
        // Rewards & Recognition
        rewards: competitionData.rewards || {
          first: { xp: 500, badge: 'gold_medal', title: 'Class Champion' },
          second: { xp: 300, badge: 'silver_medal', title: 'Runner-up' },
          third: { xp: 200, badge: 'bronze_medal', title: 'Third Place' }
        },
        
        // Tracking
        status: this.competitionStatus.UPCOMING,
        participantCount: 0,
        participants: [],
        results: [],
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveCompetition(competition);
      
      return {
        success: true,
        competition,
        message: 'Inter-class competition created successfully!'
      };

    } catch (error) {
      console.error('Error creating inter-class competition:', error);
      throw error;
    }
  }

  async joinInterClassCompetition(competitionId, studentData) {
    try {
      const competition = await this.loadCompetition(competitionId);
      
      if (!competition) {
        throw new Error('Competition not found');
      }

      if (competition.status !== this.competitionStatus.REGISTRATION_OPEN) {
        throw new Error('Registration is not currently open');
      }

      if (competition.participants.length >= competition.maxParticipants) {
        throw new Error('Competition is full');
      }

      // Check eligibility
      if (competition.grades.length > 0 && !competition.grades.includes(studentData.grade)) {
        throw new Error('Student grade not eligible for this competition');
      }

      if (competition.classes.length > 0 && !competition.classes.includes(studentData.classId)) {
        throw new Error('Student class not eligible for this competition');
      }

      // Add participant
      const participant = {
        studentId: studentData.studentId,
        name: studentData.name,
        grade: studentData.grade,
        classId: studentData.classId,
        className: studentData.className,
        avatar: studentData.avatar,
        registeredAt: new Date().toISOString(),
        status: 'registered'
      };

      competition.participants.push(participant);
      competition.participantCount = competition.participants.length;
      competition.updatedAt = new Date().toISOString();

      await this.saveCompetition(competition);

      return {
        success: true,
        message: 'Successfully registered for competition!',
        participant,
        position: competition.participants.length
      };

    } catch (error) {
      console.error('Error joining inter-class competition:', error);
      throw error;
    }
  }

  // ========== TOURNAMENT BRACKETS ==========
  async createTournament(tournamentData) {
    try {
      const tournament = {
        id: `tournament_${Date.now()}`,
        type: this.competitionTypes.TOURNAMENT,
        title: tournamentData.title,
        description: tournamentData.description,
        organizerId: tournamentData.organizerId,
        
        // Tournament Format
        format: tournamentData.format || this.tournamentFormats.SINGLE_ELIMINATION,
        maxParticipants: tournamentData.maxParticipants || 16,
        minParticipants: tournamentData.minParticipants || 4,
        
        // Tournament Structure
        rounds: [],
        bracket: null,
        currentRound: 0,
        
        // Competition Settings
        subjects: tournamentData.subjects || [],
        difficulty: tournamentData.difficulty || 'adaptive',
        questionCount: tournamentData.questionCount || 15,
        timeLimit: tournamentData.timeLimit || 20,
        
        // Scheduling
        registrationStart: tournamentData.registrationStart,
        registrationEnd: tournamentData.registrationEnd,
        tournamentStart: tournamentData.tournamentStart,
        
        // Tracking
        status: this.competitionStatus.UPCOMING,
        participants: [],
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveCompetition(tournament);
      
      return {
        success: true,
        tournament,
        message: 'Tournament created successfully!'
      };

    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  async generateTournamentBracket(tournamentId) {
    try {
      const tournament = await this.loadCompetition(tournamentId);
      
      if (!tournament || tournament.type !== this.competitionTypes.TOURNAMENT) {
        throw new Error('Tournament not found');
      }

      if (tournament.participants.length < tournament.minParticipants) {
        throw new Error('Not enough participants to generate bracket');
      }

      const bracket = this.createBracket(tournament.participants, tournament.format);
      
      tournament.bracket = bracket;
      tournament.status = this.competitionStatus.IN_PROGRESS;
      tournament.updatedAt = new Date().toISOString();

      await this.saveCompetition(tournament);

      return {
        success: true,
        bracket,
        message: 'Tournament bracket generated successfully!'
      };

    } catch (error) {
      console.error('Error generating tournament bracket:', error);
      throw error;
    }
  }

  createBracket(participants, format) {
    const shuffledParticipants = this.shuffleArray([...participants]);
    
    switch (format) {
      case this.tournamentFormats.SINGLE_ELIMINATION:
        return this.createSingleEliminationBracket(shuffledParticipants);
      case this.tournamentFormats.DOUBLE_ELIMINATION:
        return this.createDoubleEliminationBracket(shuffledParticipants);
      case this.tournamentFormats.ROUND_ROBIN:
        return this.createRoundRobinBracket(shuffledParticipants);
      default:
        return this.createSingleEliminationBracket(shuffledParticipants);
    }
  }

  createSingleEliminationBracket(participants) {
    const rounds = [];
    let currentParticipants = [...participants];
    let roundNumber = 1;

    // Create bye slots if needed
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participants.length)));
    while (currentParticipants.length < nextPowerOfTwo) {
      currentParticipants.push({ id: 'bye', name: 'BYE', isBye: true });
    }

    while (currentParticipants.length > 1) {
      const roundMatches = [];
      
      for (let i = 0; i < currentParticipants.length; i += 2) {
        const match = {
          id: `match_${roundNumber}_${Math.floor(i / 2) + 1}`,
          roundNumber,
          participant1: currentParticipants[i],
          participant2: currentParticipants[i + 1],
          winner: null,
          status: 'pending',
          scheduledTime: null,
          completedAt: null,
          scores: { p1: 0, p2: 0 }
        };

        // Auto-advance bye matches
        if (match.participant1.isBye) {
          match.winner = match.participant2;
          match.status = 'completed';
        } else if (match.participant2.isBye) {
          match.winner = match.participant1;
          match.status = 'completed';
        }

        roundMatches.push(match);
      }

      rounds.push({
        roundNumber,
        title: this.getRoundTitle(roundNumber, rounds.length + 1),
        matches: roundMatches,
        status: roundNumber === 1 ? 'active' : 'pending'
      });

      // Prepare next round participants
      currentParticipants = roundMatches.map(match => match.winner).filter(winner => winner !== null);
      roundNumber++;
    }

    return {
      format: this.tournamentFormats.SINGLE_ELIMINATION,
      rounds,
      totalRounds: rounds.length,
      currentRound: 1
    };
  }

  createDoubleEliminationBracket(participants) {
    // Simplified double elimination - would need more complex logic in real implementation
    const winnersBracket = this.createSingleEliminationBracket(participants);
    
    return {
      format: this.tournamentFormats.DOUBLE_ELIMINATION,
      winnersBracket: winnersBracket.rounds,
      losersBracket: [],
      finalMatch: null,
      currentRound: 1
    };
  }

  createRoundRobinBracket(participants) {
    const matches = [];
    let matchId = 1;

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matches.push({
          id: `rr_match_${matchId++}`,
          participant1: participants[i],
          participant2: participants[j],
          winner: null,
          status: 'pending',
          scores: { p1: 0, p2: 0 }
        });
      }
    }

    return {
      format: this.tournamentFormats.ROUND_ROBIN,
      matches,
      standings: participants.map(p => ({
        participant: p,
        wins: 0,
        losses: 0,
        points: 0
      }))
    };
  }

  // ========== LIVE QUIZ BATTLES ==========
  async createLiveBattle(battleData) {
    try {
      const battle = {
        id: `battle_${Date.now()}`,
        type: this.competitionTypes.LIVE_BATTLE,
        title: battleData.title || 'Quick Battle',
        hostId: battleData.hostId,
        
        // Battle Settings
        mode: battleData.mode || 'versus', // versus, multiplayer, team
        maxPlayers: battleData.maxPlayers || 2,
        subject: battleData.subject,
        difficulty: battleData.difficulty || 'mixed',
        questionCount: battleData.questionCount || 10,
        timePerQuestion: battleData.timePerQuestion || 30,
        
        // Room Status
        status: 'waiting',
        players: [],
        spectators: [],
        
        // Game State
        currentQuestion: 0,
        questions: [],
        scores: {},
        answers: {},
        
        // Timing
        createdAt: new Date().toISOString(),
        startedAt: null,
        endedAt: null
      };

      // Generate questions for the battle
      battle.questions = await this.generateBattleQuestions(
        battleData.subject, 
        battleData.difficulty, 
        battleData.questionCount
      );

      this.liveBattleRooms.set(battle.id, battle);
      
      return {
        success: true,
        battle,
        roomCode: this.generateRoomCode(battle.id)
      };

    } catch (error) {
      console.error('Error creating live battle:', error);
      throw error;
    }
  }

  async joinLiveBattle(battleId, playerData) {
    try {
      const battle = this.liveBattleRooms.get(battleId);
      
      if (!battle) {
        throw new Error('Battle room not found');
      }

      if (battle.status !== 'waiting') {
        throw new Error('Battle has already started');
      }

      if (battle.players.length >= battle.maxPlayers) {
        throw new Error('Battle room is full');
      }

      const player = {
        id: playerData.playerId,
        name: playerData.name,
        avatar: playerData.avatar,
        score: 0,
        answers: [],
        joinedAt: new Date().toISOString(),
        isReady: false
      };

      battle.players.push(player);
      battle.scores[player.id] = 0;

      // Notify other players
      this.broadcastToRoom(battleId, 'player_joined', {
        player,
        totalPlayers: battle.players.length
      });

      return {
        success: true,
        battle,
        player,
        message: 'Joined battle successfully!'
      };

    } catch (error) {
      console.error('Error joining live battle:', error);
      throw error;
    }
  }

  async startLiveBattle(battleId, hostId) {
    try {
      const battle = this.liveBattleRooms.get(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      if (battle.hostId !== hostId) {
        throw new Error('Only the host can start the battle');
      }

      if (battle.players.length < 2) {
        throw new Error('Need at least 2 players to start');
      }

      battle.status = 'active';
      battle.startedAt = new Date().toISOString();
      battle.currentQuestion = 0;

      // Start the first question
      this.broadcastToRoom(battleId, 'battle_started', {
        question: battle.questions[0],
        questionNumber: 1,
        totalQuestions: battle.questions.length
      });

      // Set timer for first question
      this.setQuestionTimer(battleId, 0);

      return {
        success: true,
        message: 'Battle started!',
        firstQuestion: battle.questions[0]
      };

    } catch (error) {
      console.error('Error starting live battle:', error);
      throw error;
    }
  }

  async submitBattleAnswer(battleId, playerId, answer) {
    try {
      const battle = this.liveBattleRooms.get(battleId);
      
      if (!battle || battle.status !== 'active') {
        throw new Error('Battle not active');
      }

      const currentQ = battle.currentQuestion;
      const question = battle.questions[currentQ];
      
      if (!question) {
        throw new Error('No active question');
      }

      // Record answer
      if (!battle.answers[currentQ]) {
        battle.answers[currentQ] = {};
      }

      const isCorrect = this.checkAnswer(question, answer);
      const timeBonus = this.calculateTimeBonus();

      battle.answers[currentQ][playerId] = {
        answer,
        isCorrect,
        submittedAt: new Date().toISOString(),
        timeBonus
      };

      // Update score
      if (isCorrect) {
        const points = question.points + timeBonus;
        battle.scores[playerId] = (battle.scores[playerId] || 0) + points;
      }

      // Check if all players have answered
      const allAnswered = battle.players.every(player => 
        battle.answers[currentQ] && battle.answers[currentQ][player.id]
      );

      if (allAnswered) {
        this.processQuestionResults(battleId);
      }

      return {
        success: true,
        isCorrect,
        points: isCorrect ? question.points + timeBonus : 0,
        currentScore: battle.scores[playerId]
      };

    } catch (error) {
      console.error('Error submitting battle answer:', error);
      throw error;
    }
  }

  // ========== SEASONAL EVENTS ==========
  async createSeasonalEvent(eventData) {
    try {
      const event = {
        id: `seasonal_${Date.now()}`,
        type: this.competitionTypes.SEASONAL_EVENT,
        title: eventData.title,
        description: eventData.description,
        theme: eventData.theme, // 'science_week', 'math_olympics', 'reading_month', etc.
        
        // Event Details
        seasonType: eventData.seasonType, // 'weekly', 'monthly', 'special'
        duration: eventData.duration || 7, // days
        
        // Multiple Competition Types
        competitions: [],
        challenges: [],
        leaderboards: {},
        
        // Special Features
        specialRewards: eventData.specialRewards || {},
        badgeDesigns: eventData.badgeDesigns || {},
        
        // Global Settings
        subjects: eventData.subjects || [],
        grades: eventData.grades || 'all',
        regions: eventData.regions || ['global'],
        
        // Timing
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        
        // Tracking
        status: this.competitionStatus.UPCOMING,
        totalParticipants: 0,
        totalCompletions: 0,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Generate event-specific competitions
      event.competitions = await this.generateSeasonalCompetitions(eventData);
      
      await this.saveCompetition(event);
      
      return {
        success: true,
        event,
        message: 'Seasonal event created successfully!'
      };

    } catch (error) {
      console.error('Error creating seasonal event:', error);
      throw error;
    }
  }

  async generateSeasonalCompetitions(eventData) {
    const competitions = [];
    
    switch (eventData.theme) {
      case 'science_week':
        competitions.push(
          {
            id: `sci_daily_${Date.now()}`,
            title: 'Daily Science Challenge',
            type: 'daily_challenge',
            subject: 'science',
            difficulty: 'mixed',
            duration: 7
          },
          {
            id: `sci_quiz_${Date.now()}`,
            title: 'Science Quiz Marathon',
            type: 'quiz_marathon',
            subject: 'science',
            questionCount: 50,
            timeLimit: 60
          }
        );
        break;
        
      case 'math_olympics':
        competitions.push(
          {
            id: `math_speed_${Date.now()}`,
            title: 'Speed Math Challenge',
            type: 'speed_challenge',
            subject: 'mathematics',
            timePerQuestion: 15,
            questionCount: 20
          },
          {
            id: `math_problem_${Date.now()}`,
            title: 'Problem Solving Contest',
            type: 'problem_solving',
            subject: 'mathematics',
            difficulty: 'advanced',
            questionCount: 10
          }
        );
        break;
        
      default:
        competitions.push({
          id: `general_${Date.now()}`,
          title: 'General Knowledge Challenge',
          type: 'mixed_subjects',
          subjects: eventData.subjects,
          questionCount: 25
        });
    }
    
    return competitions;
  }

  // ========== REGIONAL CHAMPIONSHIPS ==========
  async createRegionalChampionship(championshipData) {
    try {
      const championship = {
        id: `regional_${Date.now()}`,
        type: this.competitionTypes.REGIONAL_CHAMPIONSHIP,
        title: championshipData.title,
        description: championshipData.description,
        
        // Geographic Scope
        region: championshipData.region, // 'dhaka', 'chittagong', 'sylhet', etc.
        districts: championshipData.districts || [],
        schools: championshipData.schools || [],
        
        // Championship Structure
        phases: {
          school_level: {
            status: 'upcoming',
            startDate: championshipData.schoolPhaseStart,
            endDate: championshipData.schoolPhaseEnd,
            qualifiers: []
          },
          district_level: {
            status: 'pending',
            startDate: championshipData.districtPhaseStart,
            endDate: championshipData.districtPhaseEnd,
            qualifiers: []
          },
          regional_final: {
            status: 'pending',
            startDate: championshipData.finalDate,
            venue: championshipData.finalVenue,
            qualifiers: []
          }
        },
        
        // Competition Categories
        categories: championshipData.categories || [
          { name: 'Primary (Grades 1-5)', grades: [1,2,3,4,5] },
          { name: 'Secondary (Grades 6-10)', grades: [6,7,8,9,10] }
        ],
        
        // Subjects & Format
        subjects: championshipData.subjects,
        format: 'multi_phase',
        
        // Awards & Recognition
        awards: {
          regional_champion: { title: 'Regional Champion', prize: 'Trophy + Certificate' },
          district_champions: { title: 'District Champion', prize: 'Medal + Certificate' },
          school_champions: { title: 'School Champion', prize: 'Certificate' }
        },
        
        // Tracking
        status: this.competitionStatus.UPCOMING,
        totalRegistrations: 0,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveCompetition(championship);
      
      return {
        success: true,
        championship,
        message: 'Regional championship created successfully!'
      };

    } catch (error) {
      console.error('Error creating regional championship:', error);
      throw error;
    }
  }

  // ========== HELPER METHODS ==========
  async saveCompetition(competition) {
    const key = `competition_${competition.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(competition));
    
    // Update competition index
    const indexKey = 'competitions_index';
    const existing = await AsyncStorage.getItem(indexKey);
    const competitions = existing ? JSON.parse(existing) : [];
    
    const existingIndex = competitions.findIndex(c => c.id === competition.id);
    const competitionSummary = {
      id: competition.id,
      title: competition.title,
      type: competition.type,
      status: competition.status,
      participantCount: competition.participantCount || 0,
      createdAt: competition.createdAt
    };
    
    if (existingIndex >= 0) {
      competitions[existingIndex] = competitionSummary;
    } else {
      competitions.unshift(competitionSummary);
    }
    
    await AsyncStorage.setItem(indexKey, JSON.stringify(competitions));
  }

  async loadCompetition(competitionId) {
    const key = `competition_${competitionId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  async getActiveCompetitions() {
    try {
      const indexKey = 'competitions_index';
      const stored = await AsyncStorage.getItem(indexKey);
      const competitions = stored ? JSON.parse(stored) : [];
      
      return competitions.filter(c => 
        c.status === this.competitionStatus.REGISTRATION_OPEN || 
        c.status === this.competitionStatus.IN_PROGRESS
      );
    } catch (error) {
      console.error('Error loading active competitions:', error);
      return [];
    }
  }

  async generateBattleQuestions(subject, difficulty, count) {
    // Mock question generation - in real app, would use smartQuizGenerator
    const questions = [];
    
    for (let i = 0; i < count; i++) {
      questions.push({
        id: `battle_q_${i + 1}`,
        question: `Battle Question ${i + 1} - ${subject}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: Math.floor(Math.random() * 4),
        points: 10,
        timeLimit: 30
      });
    }
    
    return questions;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getRoundTitle(roundNumber, totalRounds) {
    const remaining = totalRounds - roundNumber + 1;
    
    if (remaining === 1) return 'Final';
    if (remaining === 2) return 'Semi-Final';
    if (remaining === 3) return 'Quarter-Final';
    
    return `Round ${roundNumber}`;
  }

  generateRoomCode(battleId) {
    return battleId.substring(battleId.length - 6).toUpperCase();
  }

  broadcastToRoom(battleId, event, data) {
    const battle = this.liveBattleRooms.get(battleId);
    if (battle) {
      // In a real app, this would use WebSocket or similar real-time communication
      console.log(`Broadcasting to room ${battleId}:`, event, data);
      
      // Emit event to listeners
      EventRegister.emit(`battle_${battleId}`, { event, data });
    }
  }

  setQuestionTimer(battleId, questionIndex) {
    const battle = this.liveBattleRooms.get(battleId);
    if (!battle) return;

    const timeLimit = battle.timePerQuestion * 1000;
    
    setTimeout(() => {
      this.processQuestionResults(battleId);
    }, timeLimit);
  }

  processQuestionResults(battleId) {
    const battle = this.liveBattleRooms.get(battleId);
    if (!battle) return;

    const currentQ = battle.currentQuestion;
    const question = battle.questions[currentQ];
    const answers = battle.answers[currentQ] || {};

    // Calculate results
    const results = battle.players.map(player => {
      const answer = answers[player.id];
      return {
        playerId: player.id,
        name: player.name,
        answer: answer?.answer,
        isCorrect: answer?.isCorrect || false,
        points: answer?.isCorrect ? question.points + (answer.timeBonus || 0) : 0,
        totalScore: battle.scores[player.id] || 0
      };
    });

    // Broadcast results
    this.broadcastToRoom(battleId, 'question_results', {
      questionNumber: currentQ + 1,
      correctAnswer: question.correctAnswer,
      results,
      leaderboard: results.sort((a, b) => b.totalScore - a.totalScore)
    });

    // Move to next question or end battle
    if (currentQ + 1 < battle.questions.length) {
      setTimeout(() => {
        battle.currentQuestion++;
        this.broadcastToRoom(battleId, 'next_question', {
          question: battle.questions[battle.currentQuestion],
          questionNumber: battle.currentQuestion + 1
        });
        this.setQuestionTimer(battleId, battle.currentQuestion);
      }, 3000); // 3 second pause between questions
    } else {
      this.endLiveBattle(battleId);
    }
  }

  endLiveBattle(battleId) {
    const battle = this.liveBattleRooms.get(battleId);
    if (!battle) return;

    battle.status = 'completed';
    battle.endedAt = new Date().toISOString();

    // Calculate final results
    const finalResults = battle.players.map(player => ({
      playerId: player.id,
      name: player.name,
      avatar: player.avatar,
      totalScore: battle.scores[player.id] || 0,
      correctAnswers: Object.values(battle.answers).reduce((count, questionAnswers) => {
        return count + (questionAnswers[player.id]?.isCorrect ? 1 : 0);
      }, 0)
    })).sort((a, b) => b.totalScore - a.totalScore);

    // Assign rankings
    finalResults.forEach((result, index) => {
      result.rank = index + 1;
      result.xpEarned = this.calculateBattleXP(result.rank, battle.players.length);
    });

    // Broadcast final results
    this.broadcastToRoom(battleId, 'battle_ended', {
      results: finalResults,
      winner: finalResults[0],
      duration: new Date(battle.endedAt) - new Date(battle.startedAt)
    });

    // Clean up room after 5 minutes
    setTimeout(() => {
      this.liveBattleRooms.delete(battleId);
    }, 300000);
  }

  checkAnswer(question, answer) {
    if (question.type === 'multiple_choice') {
      return answer === question.correctAnswer;
    }
    // Add other question type checks as needed
    return false;
  }

  calculateTimeBonus() {
    // Simple time bonus calculation
    return Math.floor(Math.random() * 5);
  }

  calculateBattleXP(rank, totalPlayers) {
    const baseXP = 50;
    const bonusXP = Math.max(0, (totalPlayers - rank) * 10);
    return baseXP + bonusXP;
  }

  // Event listener management for live battles
  addBattleListener(battleId, callback) {
    const listenerId = EventRegister.addEventListener(`battle_${battleId}`, callback);
    
    if (!this.eventListeners.has(battleId)) {
      this.eventListeners.set(battleId, []);
    }
    this.eventListeners.get(battleId).push(listenerId);
    
    return listenerId;
  }

  removeBattleListener(listenerId) {
    EventRegister.removeEventListener(listenerId);
  }

  removeBattleListeners(battleId) {
    const listeners = this.eventListeners.get(battleId);
    if (listeners) {
      listeners.forEach(listenerId => EventRegister.removeEventListener(listenerId));
      this.eventListeners.delete(battleId);
    }
  }
}

export const competitionSystem = new CompetitionSystem();
export default competitionSystem;