import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

class SmartStudyAssistant {
  constructor() {
    this.aiPersonalities = {
      FRIENDLY_TUTOR: 'friendly_tutor',
      PROFESSIONAL_INSTRUCTOR: 'professional_instructor',
      ENCOURAGING_MENTOR: 'encouraging_mentor',
      CASUAL_BUDDY: 'casual_buddy'
    };

    this.studyMethods = {
      SPACED_REPETITION: 'spaced_repetition',
      POMODORO: 'pomodoro',
      ACTIVE_RECALL: 'active_recall',
      INTERLEAVING: 'interleaving',
      ELABORATIVE_INTERROGATION: 'elaborative_interrogation'
    };

    this.currentPersonality = this.aiPersonalities.FRIENDLY_TUTOR;
    this.conversationContext = [];
    this.studySchedule = new Map();
    this.conceptMaps = new Map();
    this.forgettingCurves = new Map();
    
    // Voice settings
    this.voiceEnabled = true;
    this.voiceLanguage = 'en';
    this.voiceSpeed = 1.0;
    this.voicePitch = 1.0;
    
    // Study analytics
    this.studyAnalytics = {
      totalStudyTime: 0,
      sessionsCompleted: 0,
      topicsLearned: [],
      weakAreas: [],
      strengths: []
    };

    this.initializeAssistant();
  }

  // ========== INITIALIZATION ==========
  async initializeAssistant() {
    try {
      // Load saved preferences
      const savedSettings = await AsyncStorage.getItem('study_assistant_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.currentPersonality = settings.personality || this.aiPersonalities.FRIENDLY_TUTOR;
        this.voiceEnabled = settings.voiceEnabled !== false;
        this.voiceLanguage = settings.voiceLanguage || 'en';
      }

      // Setup notifications
      await this.setupNotifications();
      
      // Load existing study data
      await this.loadStudyData();
      
    } catch (error) {
      console.error('Error initializing Smart Study Assistant:', error);
    }
  }

  async setupNotifications() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }

  // ========== AI TUTOR CONVERSATION ==========
  async askAITutor(question, context = {}) {
    try {
      const response = await this.generateAIResponse(question, context);
      
      // Add to conversation history
      this.conversationContext.push({
        type: 'user',
        message: question,
        timestamp: new Date().toISOString()
      });
      
      this.conversationContext.push({
        type: 'assistant',
        message: response.text,
        timestamp: new Date().toISOString(),
        emotion: response.emotion,
        helpfulness: response.helpfulness
      });

      // Limit conversation history
      if (this.conversationContext.length > 20) {
        this.conversationContext = this.conversationContext.slice(-20);
      }

      // Speak response if voice is enabled
      if (this.voiceEnabled) {
        await this.speak(response.text);
      }

      return {
        success: true,
        response: response.text,
        emotion: response.emotion,
        suggestions: response.suggestions || [],
        relatedTopics: response.relatedTopics || [],
        followUpQuestions: response.followUpQuestions || []
      };

    } catch (error) {
      console.error('Error asking AI tutor:', error);
      throw error;
    }
  }

  async generateAIResponse(question, context) {
    // Mock AI response generation - in real app, this would use actual AI service
    const personality = this.getPersonalityTraits(this.currentPersonality);
    const questionType = this.analyzeQuestionType(question);
    
    let response = '';
    let emotion = 'neutral';
    let suggestions = [];
    let relatedTopics = [];
    let followUpQuestions = [];

    switch (questionType) {
      case 'concept_explanation':
        response = await this.generateConceptExplanation(question, context, personality);
        emotion = 'helpful';
        suggestions = this.generateStudySuggestions(question);
        relatedTopics = this.findRelatedTopics(question);
        followUpQuestions = this.generateFollowUpQuestions(question);
        break;
        
      case 'problem_solving':
        response = await this.generateProblemSolution(question, context, personality);
        emotion = 'encouraging';
        suggestions = this.generatePracticeSuggestions(question);
        break;
        
      case 'study_help':
        response = await this.generateStudyAdvice(question, context, personality);
        emotion = 'supportive';
        suggestions = this.generateStudyMethodSuggestions(question);
        break;
        
      case 'motivation':
        response = await this.generateMotivationalResponse(question, context, personality);
        emotion = 'encouraging';
        break;
        
      default:
        response = await this.generateGeneralResponse(question, context, personality);
        emotion = 'friendly';
    }

    return {
      text: response,
      emotion,
      suggestions,
      relatedTopics,
      followUpQuestions,
      helpfulness: this.calculateHelpfulness(response, questionType)
    };
  }

  analyzeQuestionType(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('explain') || lowerQuestion.includes('what is') || lowerQuestion.includes('define')) {
      return 'concept_explanation';
    } else if (lowerQuestion.includes('solve') || lowerQuestion.includes('calculate') || lowerQuestion.includes('how do')) {
      return 'problem_solving';
    } else if (lowerQuestion.includes('study') || lowerQuestion.includes('learn') || lowerQuestion.includes('remember')) {
      return 'study_help';
    } else if (lowerQuestion.includes('motivate') || lowerQuestion.includes('encourage') || lowerQuestion.includes('difficult')) {
      return 'motivation';
    }
    
    return 'general';
  }

  getPersonalityTraits(personality) {
    const traits = {
      [this.aiPersonalities.FRIENDLY_TUTOR]: {
        tone: 'warm and encouraging',
        language: 'simple and clear',
        approach: 'patient and supportive',
        examples: 'uses everyday analogies'
      },
      [this.aiPersonalities.PROFESSIONAL_INSTRUCTOR]: {
        tone: 'formal and precise',
        language: 'academic and detailed',
        approach: 'structured and thorough',
        examples: 'uses technical examples'
      },
      [this.aiPersonalities.ENCOURAGING_MENTOR]: {
        tone: 'positive and uplifting',
        language: 'motivational and inspiring',
        approach: 'goal-oriented and empowering',
        examples: 'uses success stories'
      },
      [this.aiPersonalities.CASUAL_BUDDY]: {
        tone: 'relaxed and friendly',
        language: 'informal and conversational',
        approach: 'fun and engaging',
        examples: 'uses pop culture references'
      }
    };
    
    return traits[personality] || traits[this.aiPersonalities.FRIENDLY_TUTOR];
  }

  async generateConceptExplanation(question, context, personality) {
    // Mock concept explanation generation
    const concept = this.extractConcept(question);
    
    const explanations = {
      'algebra': `Algebra is like a puzzle where letters (variables) represent unknown numbers. Think of it as a detective game - you use clues (equations) to find the missing numbers! For example, if x + 3 = 7, you can figure out that x must be 4.`,
      'photosynthesis': `Photosynthesis is how plants make their own food using sunlight! It's like a solar-powered kitchen inside every leaf. Plants take in carbon dioxide from air, water from soil, and use sunlight energy to create sugar (glucose) and release oxygen.`,
      'gravity': `Gravity is the invisible force that pulls everything toward Earth. Imagine Earth as a giant magnet, but instead of attracting metal, it attracts everything with mass. That's why when you drop something, it falls down instead of floating away!`,
      'democracy': `Democracy means "rule by the people." It's like when your class votes on which movie to watch - everyone gets a say, and the majority decides. In a democracy, citizens elect their leaders and have a voice in important decisions.`
    };
    
    let baseExplanation = explanations[concept] || `Let me help you understand ${concept}. This is an important concept that builds on what you already know.`;
    
    // Adjust based on personality
    if (personality.tone === 'formal and precise') {
      baseExplanation = baseExplanation.replace(/!/g, '.').replace(/like/g, 'similar to');
    } else if (personality.tone === 'positive and uplifting') {
      baseExplanation += ` You're doing great by asking questions - that's how real learning happens!`;
    }
    
    return baseExplanation;
  }

  async generateProblemSolution(question, context, personality) {
    const problemType = this.identifyProblemType(question);
    
    let solution = '';
    switch (problemType) {
      case 'math':
        solution = `Let's break this problem down step by step. First, identify what we know and what we're looking for. Then, choose the right formula or method. Finally, solve carefully and check our answer.`;
        break;
      case 'science':
        solution = `For science problems, start by understanding the concept involved. Then apply the relevant principles or formulas. Don't forget to include proper units in your answer!`;
        break;
      default:
        solution = `Let's approach this systematically. Break the problem into smaller parts, solve each part, and then put it all together.`;
    }
    
    return solution;
  }

  async generateStudyAdvice(question, context, personality) {
    const studyTips = [
      `Try the Pomodoro Technique: study for 25 minutes, then take a 5-minute break. This helps maintain focus!`,
      `Create concept maps to visualize connections between topics. It's like drawing a roadmap of your knowledge!`,
      `Use active recall: close your book and try to explain the concept out loud. This strengthens memory much better than just reading.`,
      `Space out your learning sessions over several days rather than cramming. Your brain needs time to process information!`,
      `Teach someone else what you've learned. If you can explain it simply, you truly understand it.`
    ];
    
    return studyTips[Math.floor(Math.random() * studyTips.length)];
  }

  async generateMotivationalResponse(question, context, personality) {
    const motivationalMessages = [
      `Remember, every expert was once a beginner! The fact that you're asking questions shows you're on the right path to mastering this topic.`,
      `Challenges are opportunities to grow. Each difficulty you overcome makes you stronger and more capable.`,
      `Learning is a journey, not a race. Take your time to understand concepts thoroughly - it's better to go slow and understand than to rush and forget.`,
      `You have unlimited potential! Every time you learn something new, you're literally rewiring your brain to become smarter.`,
      `Mistakes are proof that you're trying. They're not failures - they're stepping stones to success!`
    ];
    
    return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  }

  // ========== STUDY SCHEDULER ==========
  async createStudySchedule(preferences) {
    try {
      const schedule = {
        id: `schedule_${Date.now()}`,
        userId: preferences.userId,
        subjects: preferences.subjects || [],
        dailyGoal: preferences.dailyGoal || 60, // minutes
        preferredTimes: preferences.preferredTimes || ['morning'],
        studyMethod: preferences.studyMethod || this.studyMethods.SPACED_REPETITION,
        difficulty: preferences.difficulty || 'medium',
        breaks: preferences.breaks || { frequency: 25, duration: 5 },
        weeklyPattern: preferences.weeklyPattern || 'monday-friday',
        createdAt: new Date().toISOString()
      };

      // Generate actual schedule
      const optimizedSchedule = await this.optimizeStudySchedule(schedule);
      
      // Save schedule
      await this.saveStudySchedule(optimizedSchedule);
      
      // Set up reminders
      await this.scheduleStudyReminders(optimizedSchedule);

      return {
        success: true,
        schedule: optimizedSchedule,
        message: 'AI-optimized study schedule created!'
      };

    } catch (error) {
      console.error('Error creating study schedule:', error);
      throw error;
    }
  }

  async optimizeStudySchedule(baseSchedule) {
    try {
      // Mock AI optimization - in real app, would use ML algorithms
      const optimizedSessions = [];
      const subjects = baseSchedule.subjects;
      const dailyGoal = baseSchedule.dailyGoal;
      
      // Apply spaced repetition algorithm
      for (let day = 0; day < 7; day++) {
        const daySchedule = {
          day: this.getDayName(day),
          sessions: []
        };

        let remainingTime = dailyGoal;
        let sessionCount = 0;

        for (const subject of subjects) {
          if (remainingTime <= 0) break;
          
          const difficulty = this.getSubjectDifficulty(subject);
          const sessionLength = this.calculateOptimalSessionLength(difficulty);
          const priority = this.calculateSubjectPriority(subject, day);
          
          if (sessionLength <= remainingTime) {
            daySchedule.sessions.push({
              id: `session_${day}_${sessionCount++}`,
              subject: subject.name,
              duration: sessionLength,
              priority: priority,
              type: 'study',
              topics: subject.topics || [],
              method: this.selectStudyMethod(subject, baseSchedule.studyMethod),
              reminderTime: this.calculateReminderTime(subject, sessionLength)
            });
            
            remainingTime -= sessionLength;
            
            // Add break if needed
            if (remainingTime > 5 && sessionCount < subjects.length) {
              daySchedule.sessions.push({
                id: `break_${day}_${sessionCount}`,
                type: 'break',
                duration: baseSchedule.breaks.duration,
                activity: this.suggestBreakActivity()
              });
              remainingTime -= baseSchedule.breaks.duration;
            }
          }
        }

        optimizedSessions.push(daySchedule);
      }

      return {
        ...baseSchedule,
        optimizedSessions,
        totalWeeklyTime: this.calculateWeeklyTime(optimizedSessions),
        efficiency: this.calculateScheduleEfficiency(optimizedSessions),
        nextReview: this.calculateNextReviewDate()
      };

    } catch (error) {
      console.error('Error optimizing study schedule:', error);
      throw error;
    }
  }

  calculateOptimalSessionLength(difficulty) {
    const baseLengths = {
      'easy': 20,
      'medium': 30,
      'hard': 45
    };
    return baseLengths[difficulty] || 30;
  }

  calculateSubjectPriority(subject, day) {
    // Mock priority calculation based on subject difficulty, last studied, etc.
    let priority = 1;
    
    if (subject.difficulty === 'hard') priority += 2;
    if (subject.lastStudied && this.daysSinceLastStudy(subject.lastStudied) > 3) priority += 1;
    if (subject.examDate && this.daysUntilExam(subject.examDate) < 14) priority += 3;
    
    return Math.min(priority, 5);
  }

  selectStudyMethod(subject, preferredMethod) {
    // Customize study method based on subject type
    const subjectMethods = {
      'mathematics': this.studyMethods.ACTIVE_RECALL,
      'science': this.studyMethods.ELABORATIVE_INTERROGATION,
      'language': this.studyMethods.SPACED_REPETITION,
      'history': this.studyMethods.INTERLEAVING
    };
    
    return subjectMethods[subject.type] || preferredMethod;
  }

  // ========== CONCEPT MAPS ==========
  async createConceptMap(topic, subtopics = []) {
    try {
      const conceptMap = {
        id: `concept_${Date.now()}`,
        mainTopic: topic,
        nodes: [],
        connections: [],
        layout: 'hierarchical',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Create main topic node
      const mainNode = {
        id: 'main',
        label: topic,
        type: 'main',
        level: 0,
        position: { x: 0, y: 0 },
        color: '#4CAF50',
        size: 60
      };
      conceptMap.nodes.push(mainNode);

      // Add subtopic nodes
      subtopics.forEach((subtopic, index) => {
        const node = {
          id: `sub_${index}`,
          label: subtopic.name || subtopic,
          type: 'subtopic',
          level: 1,
          position: this.calculateNodePosition(index, subtopics.length),
          color: '#2196F3',
          size: 40,
          description: subtopic.description || ''
        };
        conceptMap.nodes.push(node);

        // Create connection to main topic
        conceptMap.connections.push({
          id: `conn_${index}`,
          source: 'main',
          target: `sub_${index}`,
          type: 'parent-child',
          strength: 1,
          label: subtopic.relationship || 'includes'
        });
      });

      // Add auto-generated connections between subtopics
      const autoConnections = this.generateAutoConnections(conceptMap.nodes);
      conceptMap.connections.push(...autoConnections);

      // Save concept map
      this.conceptMaps.set(conceptMap.id, conceptMap);
      await this.saveConceptMap(conceptMap);

      return {
        success: true,
        conceptMap,
        message: 'Concept map created successfully!'
      };

    } catch (error) {
      console.error('Error creating concept map:', error);
      throw error;
    }
  }

  calculateNodePosition(index, total) {
    const radius = 150;
    const angle = (2 * Math.PI * index) / total;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }

  generateAutoConnections(nodes) {
    const connections = [];
    const subtopicNodes = nodes.filter(node => node.type === 'subtopic');
    
    // Find potential connections based on semantic similarity (mocked)
    for (let i = 0; i < subtopicNodes.length; i++) {
      for (let j = i + 1; j < subtopicNodes.length; j++) {
        const similarity = this.calculateSemanticSimilarity(
          subtopicNodes[i].label, 
          subtopicNodes[j].label
        );
        
        if (similarity > 0.6) {
          connections.push({
            id: `auto_${i}_${j}`,
            source: subtopicNodes[i].id,
            target: subtopicNodes[j].id,
            type: 'related',
            strength: similarity,
            label: 'related to',
            auto: true
          });
        }
      }
    }
    
    return connections;
  }

  calculateSemanticSimilarity(term1, term2) {
    // Mock semantic similarity calculation
    // In real app, would use NLP libraries or AI services
    const commonWords = ['and', 'or', 'the', 'of', 'to', 'in', 'for', 'with'];
    const words1 = term1.toLowerCase().split(' ').filter(w => !commonWords.includes(w));
    const words2 = term2.toLowerCase().split(' ').filter(w => !commonWords.includes(w));
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  // ========== FORGETTING CURVE & REMINDERS ==========
  async trackLearningProgress(topicId, performance) {
    try {
      let curve = this.forgettingCurves.get(topicId);
      
      if (!curve) {
        curve = {
          topicId,
          learningEvents: [],
          retentionRate: 1.0,
          nextReviewDate: null,
          difficulty: 1.0,
          createdAt: new Date().toISOString()
        };
      }

      // Add learning event
      const event = {
        timestamp: new Date().toISOString(),
        performance: performance, // 0.0 to 1.0
        studyDuration: performance.duration || 0,
        method: performance.method || 'review'
      };
      
      curve.learningEvents.push(event);
      
      // Update retention rate based on Ebbinghaus forgetting curve
      curve.retentionRate = this.calculateRetentionRate(curve.learningEvents);
      
      // Calculate next optimal review time
      curve.nextReviewDate = this.calculateNextReviewDate(curve);
      
      // Adjust difficulty based on performance
      curve.difficulty = this.adjustDifficulty(curve.difficulty, performance.score);
      
      // Save updated curve
      this.forgettingCurves.set(topicId, curve);
      await this.saveForgettingCurve(curve);
      
      // Schedule reminder if needed
      if (curve.nextReviewDate) {
        await this.scheduleReviewReminder(topicId, curve.nextReviewDate);
      }

      return {
        success: true,
        retentionRate: curve.retentionRate,
        nextReview: curve.nextReviewDate,
        difficulty: curve.difficulty
      };

    } catch (error) {
      console.error('Error tracking learning progress:', error);
      throw error;
    }
  }

  calculateRetentionRate(learningEvents) {
    if (learningEvents.length === 0) return 1.0;
    
    const latest = learningEvents[learningEvents.length - 1];
    const timeSinceLastStudy = Date.now() - new Date(latest.timestamp).getTime();
    const daysSince = timeSinceLastStudy / (1000 * 60 * 60 * 24);
    
    // Simplified Ebbinghaus curve: R(t) = e^(-t/S)
    // where S is the stability factor based on performance
    const stability = this.calculateStabilityFactor(learningEvents);
    const retention = Math.exp(-daysSince / stability);
    
    return Math.max(0.1, Math.min(1.0, retention));
  }

  calculateStabilityFactor(learningEvents) {
    const recentEvents = learningEvents.slice(-5); // Last 5 events
    const avgPerformance = recentEvents.reduce((sum, event) => sum + event.performance, 0) / recentEvents.length;
    
    // Higher performance = longer retention
    return 1 + (avgPerformance * 10); // 1-11 day stability
  }

  calculateNextReviewDate(curve) {
    const retentionThreshold = 0.7; // Review when retention drops to 70%
    const daysUntilThreshold = -curve.difficulty * Math.log(retentionThreshold);
    
    return new Date(Date.now() + daysUntilThreshold * 24 * 60 * 60 * 1000);
  }

  // ========== VOICE ASSISTANT ==========
  async processVoiceCommand(command) {
    try {
      const intent = await this.parseVoiceIntent(command);
      let response = '';
      
      switch (intent.action) {
        case 'create_quiz':
          response = await this.handleCreateQuizIntent(intent);
          break;
        case 'explain_concept':
          response = await this.handleExplainConceptIntent(intent);
          break;
        case 'schedule_study':
          response = await this.handleScheduleStudyIntent(intent);
          break;
        case 'check_progress':
          response = await this.handleCheckProgressIntent(intent);
          break;
        default:
          response = await this.askAITutor(command);
      }

      if (this.voiceEnabled) {
        await this.speak(response.response || response);
      }

      return response;

    } catch (error) {
      console.error('Error processing voice command:', error);
      const errorResponse = "I'm sorry, I didn't understand that. Could you please try again?";
      
      if (this.voiceEnabled) {
        await this.speak(errorResponse);
      }
      
      return { success: false, response: errorResponse };
    }
  }

  async parseVoiceIntent(command) {
    const lowerCommand = command.toLowerCase();
    
    // Simple intent parsing (in real app, would use NLP service)
    if (lowerCommand.includes('create') && lowerCommand.includes('quiz')) {
      return {
        action: 'create_quiz',
        subject: this.extractSubject(lowerCommand),
        difficulty: this.extractDifficulty(lowerCommand)
      };
    } else if (lowerCommand.includes('explain') || lowerCommand.includes('what is')) {
      return {
        action: 'explain_concept',
        concept: this.extractConcept(lowerCommand)
      };
    } else if (lowerCommand.includes('schedule') || lowerCommand.includes('plan')) {
      return {
        action: 'schedule_study',
        subject: this.extractSubject(lowerCommand),
        time: this.extractTime(lowerCommand)
      };
    } else if (lowerCommand.includes('progress') || lowerCommand.includes('how am i doing')) {
      return {
        action: 'check_progress',
        subject: this.extractSubject(lowerCommand)
      };
    }
    
    return { action: 'general', query: command };
  }

  async speak(text) {
    try {
      if (!this.voiceEnabled) return;
      
      await Speech.speak(text, {
        language: this.voiceLanguage,
        pitch: this.voicePitch,
        rate: this.voiceSpeed,
        voice: this.getVoiceId()
      });
      
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  }

  getVoiceId() {
    // Map language to voice ID
    const voiceMap = {
      'en': 'en-US-female-1',
      'bn': 'bn-BD-female-1',
      'hi': 'hi-IN-female-1'
    };
    
    return voiceMap[this.voiceLanguage] || voiceMap['en'];
  }

  // ========== STUDY ANALYTICS ==========
  async generateStudyInsights() {
    try {
      const insights = {
        overview: await this.generateOverviewInsights(),
        strengths: await this.identifyStrengths(),
        weaknesses: await this.identifyWeaknesses(),
        recommendations: await this.generateRecommendations(),
        progress: await this.trackProgressTrends(),
        timeAnalysis: await this.analyzeStudyTime(),
        efficiency: await this.calculateStudyEfficiency()
      };

      return {
        success: true,
        insights,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error generating study insights:', error);
      throw error;
    }
  }

  async generateOverviewInsights() {
    return {
      totalStudyTime: this.studyAnalytics.totalStudyTime,
      sessionsCompleted: this.studyAnalytics.sessionsCompleted,
      averageSessionLength: this.studyAnalytics.totalStudyTime / Math.max(this.studyAnalytics.sessionsCompleted, 1),
      topicsLearned: this.studyAnalytics.topicsLearned.length,
      consistencyScore: this.calculateConsistencyScore()
    };
  }

  async identifyStrengths() {
    // Mock strength identification
    return [
      { area: 'Mathematics', score: 0.85, trend: 'improving' },
      { area: 'Problem Solving', score: 0.78, trend: 'stable' },
      { area: 'Study Consistency', score: 0.92, trend: 'excellent' }
    ];
  }

  async identifyWeaknesses() {
    // Mock weakness identification
    return [
      { area: 'Science Concepts', score: 0.45, improvement: 'needs_focus' },
      { area: 'Time Management', score: 0.60, improvement: 'moderate' }
    ];
  }

  async generateRecommendations() {
    return [
      {
        type: 'study_method',
        priority: 'high',
        recommendation: 'Try using active recall for science topics to improve retention',
        expectedImprovement: '25%'
      },
      {
        type: 'schedule',
        priority: 'medium',
        recommendation: 'Consider shorter, more frequent study sessions',
        expectedImprovement: '15%'
      }
    ];
  }

  // ========== UTILITY METHODS ==========
  extractSubject(text) {
    const subjects = ['math', 'mathematics', 'science', 'english', 'history', 'physics', 'chemistry', 'biology'];
    return subjects.find(subject => text.includes(subject)) || null;
  }

  extractConcept(text) {
    // Extract the main concept from the question
    const conceptPatterns = [
      /what is ([\w\s]+)/i,
      /explain ([\w\s]+)/i,
      /define ([\w\s]+)/i
    ];
    
    for (const pattern of conceptPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  extractDifficulty(text) {
    if (text.includes('easy') || text.includes('basic')) return 'easy';
    if (text.includes('hard') || text.includes('difficult') || text.includes('advanced')) return 'hard';
    return 'medium';
  }

  getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }

  // ========== STORAGE METHODS ==========
  async saveStudySchedule(schedule) {
    const key = `study_schedule_${schedule.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(schedule));
  }

  async saveConceptMap(conceptMap) {
    const key = `concept_map_${conceptMap.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(conceptMap));
  }

  async saveForgettingCurve(curve) {
    const key = `forgetting_curve_${curve.topicId}`;
    await AsyncStorage.setItem(key, JSON.stringify(curve));
  }

  async loadStudyData() {
    try {
      // Load existing data from storage
      const keys = await AsyncStorage.getAllKeys();
      
      for (const key of keys) {
        if (key.startsWith('study_schedule_')) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const schedule = JSON.parse(data);
            this.studySchedule.set(schedule.id, schedule);
          }
        } else if (key.startsWith('concept_map_')) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const conceptMap = JSON.parse(data);
            this.conceptMaps.set(conceptMap.id, conceptMap);
          }
        } else if (key.startsWith('forgetting_curve_')) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const curve = JSON.parse(data);
            this.forgettingCurves.set(curve.topicId, curve);
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading study data:', error);
    }
  }

  // ========== NOTIFICATION METHODS ==========
  async scheduleStudyReminders(schedule) {
    try {
      for (const day of schedule.optimizedSessions) {
        for (const session of day.sessions) {
          if (session.type === 'study' && session.reminderTime) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📚 Study Time!',
                body: `Time to study ${session.subject} for ${session.duration} minutes`,
                sound: 'default',
              },
              trigger: {
                date: new Date(session.reminderTime),
                repeats: true
              },
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }

  async scheduleReviewReminder(topicId, reviewDate) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔄 Review Time!',
          body: `It's time to review this topic to maintain your memory`,
          sound: 'default',
        },
        trigger: {
          date: reviewDate
        },
      });
      
    } catch (error) {
      console.error('Error scheduling review reminder:', error);
    }
  }
}

export const smartStudyAssistant = new SmartStudyAssistant();
export default smartStudyAssistant;