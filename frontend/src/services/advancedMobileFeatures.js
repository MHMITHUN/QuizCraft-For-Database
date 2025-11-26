import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import PushNotification from 'react-native-push-notification';
import Voice from '@react-native-voice/voice';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { Appearance, AccessibilityInfo } from 'react-native';
import RNFS from 'react-native-fs';

class AdvancedMobileFeatures {
  constructor() {
    this.isOffline = false;
    this.offlineQueue = [];
    this.notificationChannels = {
      quiz: 'quiz_reminders',
      achievement: 'achievements',
      assignment: 'assignments',
      social: 'social_interactions'
    };
    
    this.voiceConfig = {
      isListening: false,
      language: 'en-US',
      timeout: 10000
    };
    
    this.themeConfig = {
      current: 'system',
      colors: {
        light: {
          primary: '#4A90E2',
          background: '#FFFFFF',
          surface: '#F8F9FA',
          text: '#333333'
        },
        dark: {
          primary: '#64B5F6',
          background: '#121212',
          surface: '#1E1E1E',
          text: '#FFFFFF'
        }
      }
    };
    
    this.accessibilityConfig = {
      fontSize: 1.0,
      highContrast: false,
      screenReader: false,
      reduceMotion: false
    };
    
    this.init();
  }

  async init() {
    await this.initNetworkMonitoring();
    await this.initPushNotifications();
    await this.initVoiceRecognition();
    await this.initThemeSystem();
    await this.initAccessibilitySettings();
  }

  // ========== OFFLINE MODE ==========
  async initNetworkMonitoring() {
    try {
      // Monitor network connectivity
      const unsubscribe = NetInfo.addEventListener(state => {
        const wasOffline = this.isOffline;
        this.isOffline = !state.isConnected;
        
        if (wasOffline && !this.isOffline) {
          // Back online - sync pending data
          this.syncOfflineData();
        }
      });
      
      // Initial network state
      const netInfo = await NetInfo.fetch();
      this.isOffline = !netInfo.isConnected;
      
      return unsubscribe;
    } catch (error) {
      console.error('Error initializing network monitoring:', error);
    }
  }

  async downloadQuizForOffline(quizId) {
    try {
      if (this.isOffline) {
        throw new Error('Cannot download quiz while offline');
      }

      // Simulate fetching quiz data from server
      const quizData = await this.fetchQuizData(quizId);
      
      // Store quiz data locally
      const offlineKey = `offline_quiz_${quizId}`;
      await AsyncStorage.setItem(offlineKey, JSON.stringify({
        ...quizData,
        downloadedAt: new Date().toISOString(),
        isOfflineVersion: true
      }));
      
      // Download associated media files
      if (quizData.mediaFiles) {
        await this.downloadMediaFiles(quizData.mediaFiles, quizId);
      }
      
      // Update offline quiz index
      await this.addToOfflineQuizIndex(quizId, quizData.title);
      
      return {
        success: true,
        message: 'Quiz downloaded for offline use',
        sizeKB: Math.round(JSON.stringify(quizData).length / 1024)
      };
      
    } catch (error) {
      console.error('Error downloading quiz for offline:', error);
      throw error;
    }
  }

  async getOfflineQuizzes() {
    try {
      const indexKey = 'offline_quiz_index';
      const stored = await AsyncStorage.getItem(indexKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading offline quizzes:', error);
      return [];
    }
  }

  async loadOfflineQuiz(quizId) {
    try {
      const offlineKey = `offline_quiz_${quizId}`;
      const stored = await AsyncStorage.getItem(offlineKey);
      
      if (stored) {
        const quiz = JSON.parse(stored);
        return {
          ...quiz,
          isOfflineMode: true,
          syncRequired: false
        };
      }
      
      throw new Error('Offline quiz not found');
    } catch (error) {
      console.error('Error loading offline quiz:', error);
      throw error;
    }
  }

  async saveOfflineQuizResult(quizId, results) {
    try {
      const resultKey = `offline_result_${quizId}_${Date.now()}`;
      const resultData = {
        quizId,
        results,
        completedAt: new Date().toISOString(),
        isOffline: true,
        syncStatus: 'pending'
      };
      
      await AsyncStorage.setItem(resultKey, JSON.stringify(resultData));
      
      // Add to sync queue
      this.offlineQueue.push({
        type: 'quiz_result',
        key: resultKey,
        data: resultData
      });
      
      return {
        success: true,
        message: 'Results saved offline - will sync when connected'
      };
      
    } catch (error) {
      console.error('Error saving offline quiz result:', error);
      throw error;
    }
  }

  async syncOfflineData() {
    try {
      if (this.isOffline || this.offlineQueue.length === 0) {
        return { synced: 0 };
      }

      let syncedCount = 0;
      const failedItems = [];

      for (const item of this.offlineQueue) {
        try {
          await this.syncSingleItem(item);
          syncedCount++;
          
          // Remove from offline storage after successful sync
          await AsyncStorage.removeItem(item.key);
          
        } catch (syncError) {
          console.error('Error syncing item:', syncError);
          failedItems.push(item);
        }
      }
      
      // Update queue with failed items only
      this.offlineQueue = failedItems;
      
      return {
        synced: syncedCount,
        failed: failedItems.length,
        message: `Synced ${syncedCount} items`
      };
      
    } catch (error) {
      console.error('Error syncing offline data:', error);
      throw error;
    }
  }

  // ========== PUSH NOTIFICATIONS ==========
  async initPushNotifications() {
    try {
      PushNotification.configure({
        onRegister: (token) => {
          console.log('FCM Token:', token);
          this.saveDeviceToken(token);
        },
        
        onNotification: (notification) => {
          console.log('Notification received:', notification);
          this.handleNotification(notification);
        },
        
        requestPermissions: true,
        senderID: 'YOUR_SENDER_ID', // For Android
      });
      
      // Create notification channels
      this.createNotificationChannels();
      
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  createNotificationChannels() {
    Object.entries(this.notificationChannels).forEach(([key, channelId]) => {
      PushNotification.createChannel({
        channelId,
        channelName: key.charAt(0).toUpperCase() + key.slice(1),
        channelDescription: `Notifications for ${key}`,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      });
    });
  }

  async scheduleSmartReminder(type, data, scheduledTime) {
    try {
      const notificationId = `${type}_${Date.now()}`;
      
      const notificationConfig = {
        id: notificationId,
        title: this.getNotificationTitle(type, data),
        message: this.getNotificationMessage(type, data),
        date: new Date(scheduledTime),
        channelId: this.notificationChannels[type] || this.notificationChannels.quiz,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        priority: 'high',
        actions: this.getNotificationActions(type),
        userInfo: { type, data }
      };
      
      PushNotification.localNotificationSchedule(notificationConfig);
      
      // Store scheduled notification for management
      await this.saveScheduledNotification(notificationId, notificationConfig);
      
      return {
        success: true,
        notificationId,
        scheduledFor: scheduledTime
      };
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  async scheduleStudyReminders(studentId, studySchedule) {
    try {
      const reminders = [];
      
      for (const session of studySchedule) {
        const reminder = await this.scheduleSmartReminder('quiz', {
          studentId,
          subject: session.subject,
          topic: session.topic,
          difficulty: session.difficulty
        }, session.scheduledTime);
        
        reminders.push(reminder);
      }
      
      return {
        success: true,
        scheduled: reminders.length,
        reminders
      };
      
    } catch (error) {
      console.error('Error scheduling study reminders:', error);
      throw error;
    }
  }

  getNotificationTitle(type, data) {
    const titles = {
      quiz: `📚 Time to study ${data.subject || 'your subjects'}!`,
      achievement: `🏆 Congratulations! New achievement unlocked!`,
      assignment: `📝 Assignment reminder: ${data.title}`,
      social: `👥 ${data.senderName} sent you a message`
    };
    
    return titles[type] || 'QuizCraft Reminder';
  }

  getNotificationMessage(type, data) {
    const messages = {
      quiz: `Ready to practice ${data.topic || 'some questions'}? Let's keep your streak going!`,
      achievement: `You've earned "${data.achievementName}" - keep up the great work!`,
      assignment: `Due: ${data.dueDate}. Don't forget to complete your assignment.`,
      social: `"${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`
    };
    
    return messages[type] || 'Tap to open QuizCraft';
  }

  getNotificationActions(type) {
    const actionSets = {
      quiz: [
        { id: 'start', title: 'Start Quiz', icon: 'ic_play' },
        { id: 'later', title: 'Remind Later', icon: 'ic_schedule' }
      ],
      achievement: [
        { id: 'view', title: 'View Achievement', icon: 'ic_trophy' },
        { id: 'share', title: 'Share', icon: 'ic_share' }
      ],
      assignment: [
        { id: 'open', title: 'Open Assignment', icon: 'ic_assignment' },
        { id: 'snooze', title: 'Snooze', icon: 'ic_snooze' }
      ]
    };
    
    return actionSets[type] || [];
  }

  // ========== VOICE-TO-TEXT ==========
  async initVoiceRecognition() {
    try {
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      
      // Check if speech recognition is available
      const available = await Voice.isAvailable();
      console.log('Voice recognition available:', available);
      
      return available;
    } catch (error) {
      console.error('Error initializing voice recognition:', error);
      return false;
    }
  }

  async startVoiceInput(options = {}) {
    try {
      if (this.voiceConfig.isListening) {
        await this.stopVoiceInput();
      }
      
      const config = {
        ...this.voiceConfig,
        ...options
      };
      
      await Voice.start(config.language);
      
      this.voiceConfig.isListening = true;
      
      // Auto-stop after timeout
      setTimeout(() => {
        if (this.voiceConfig.isListening) {
          this.stopVoiceInput();
        }
      }, config.timeout);
      
      return {
        success: true,
        listening: true,
        language: config.language
      };
      
    } catch (error) {
      console.error('Error starting voice input:', error);
      throw error;
    }
  }

  async stopVoiceInput() {
    try {
      await Voice.stop();
      this.voiceConfig.isListening = false;
      
      return {
        success: true,
        listening: false
      };
    } catch (error) {
      console.error('Error stopping voice input:', error);
      throw error;
    }
  }

  // Voice recognition event handlers
  onSpeechStart(e) {
    console.log('Speech started');
  }

  onSpeechRecognized(e) {
    console.log('Speech recognized');
  }

  onSpeechEnd(e) {
    console.log('Speech ended');
    this.voiceConfig.isListening = false;
  }

  onSpeechError(e) {
    console.error('Speech error:', e.error);
    this.voiceConfig.isListening = false;
  }

  onSpeechResults(e) {
    const results = e.value || [];
    const recognizedText = results[0] || '';
    
    console.log('Speech results:', results);
    
    // Trigger callback if set
    if (this.voiceResultCallback) {
      this.voiceResultCallback({
        success: true,
        text: recognizedText,
        confidence: results.length > 0 ? 0.9 : 0,
        alternatives: results.slice(1)
      });
    }
  }

  setVoiceResultCallback(callback) {
    this.voiceResultCallback = callback;
  }

  // ========== CAMERA INTEGRATION ==========
  async launchCameraForQuizCreation(options = {}) {
    try {
      const cameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
        maxWidth: 1200,
        maxHeight: 1200,
        ...options
      };
      
      return new Promise((resolve, reject) => {
        launchCamera(cameraOptions, (response) => {
          if (response.didCancel) {
            resolve({ cancelled: true });
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve({
              success: true,
              image: response.assets[0],
              uri: response.assets[0].uri,
              base64: response.assets[0].base64
            });
          }
        });
      });
    } catch (error) {
      console.error('Error launching camera:', error);
      throw error;
    }
  }

  async scanTextFromImage(imageUri) {
    try {
      // Mock OCR processing - in real app, would use Google ML Kit or similar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate extracted text
      const extractedText = `
        Chapter 5: Basic Mathematics
        
        1. Addition and Subtraction
        - 5 + 3 = 8
        - 10 - 4 = 6
        
        2. Multiplication
        - 4 × 3 = 12
        - 7 × 2 = 14
        
        Practice Problems:
        1. What is 8 + 7?
        2. Solve 15 - 6
        3. Calculate 9 × 3
      `;
      
      return {
        success: true,
        extractedText,
        confidence: 0.85,
        suggestions: {
          subject: 'Mathematics',
          topics: ['Addition', 'Subtraction', 'Multiplication'],
          questionsFound: 3
        }
      };
      
    } catch (error) {
      console.error('Error scanning text from image:', error);
      throw error;
    }
  }

  async uploadDocument() {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
        allowMultiSelection: false
      });
      
      return {
        success: true,
        document: result[0],
        name: result[0].name,
        size: result[0].size,
        type: result[0].type,
        uri: result[0].uri
      };
      
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return { cancelled: true };
      }
      
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  // ========== THEME SYSTEM ==========
  async initThemeSystem() {
    try {
      // Load saved theme preference
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        this.themeConfig.current = savedTheme;
      }
      
      // Listen for system theme changes
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        if (this.themeConfig.current === 'system') {
          this.applyTheme(colorScheme);
        }
      });
      
      // Apply initial theme
      if (this.themeConfig.current === 'system') {
        const colorScheme = Appearance.getColorScheme();
        this.applyTheme(colorScheme);
      } else {
        this.applyTheme(this.themeConfig.current);
      }
      
      return subscription;
    } catch (error) {
      console.error('Error initializing theme system:', error);
    }
  }

  async setTheme(theme) {
    try {
      this.themeConfig.current = theme;
      await AsyncStorage.setItem('app_theme', theme);
      
      if (theme === 'system') {
        const colorScheme = Appearance.getColorScheme();
        this.applyTheme(colorScheme);
      } else {
        this.applyTheme(theme);
      }
      
      return {
        success: true,
        theme: theme,
        applied: theme === 'system' ? Appearance.getColorScheme() : theme
      };
    } catch (error) {
      console.error('Error setting theme:', error);
      throw error;
    }
  }

  applyTheme(theme) {
    const colors = this.themeConfig.colors[theme] || this.themeConfig.colors.light;
    
    // In a real app, you would update your theme provider/context here
    console.log('Applying theme:', theme, colors);
    
    // Notify theme change listeners
    if (this.themeChangeCallback) {
      this.themeChangeCallback({
        theme,
        colors,
        isDark: theme === 'dark'
      });
    }
  }

  getCurrentTheme() {
    const currentTheme = this.themeConfig.current === 'system' 
      ? Appearance.getColorScheme() 
      : this.themeConfig.current;
      
    return {
      theme: currentTheme,
      colors: this.themeConfig.colors[currentTheme] || this.themeConfig.colors.light,
      isDark: currentTheme === 'dark'
    };
  }

  setThemeChangeCallback(callback) {
    this.themeChangeCallback = callback;
  }

  // ========== ACCESSIBILITY FEATURES ==========
  async initAccessibilitySettings() {
    try {
      // Load saved accessibility preferences
      const saved = await AsyncStorage.getItem('accessibility_config');
      if (saved) {
        this.accessibilityConfig = { ...this.accessibilityConfig, ...JSON.parse(saved) };
      }
      
      // Check if screen reader is enabled
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.accessibilityConfig.screenReader = screenReaderEnabled;
      
      // Check if reduce motion is enabled
      const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      this.accessibilityConfig.reduceMotion = reduceMotionEnabled;
      
      // Listen for accessibility changes
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        this.accessibilityConfig.screenReader = enabled;
        this.onAccessibilityChange('screenReader', enabled);
      });
      
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        this.accessibilityConfig.reduceMotion = enabled;
        this.onAccessibilityChange('reduceMotion', enabled);
      });
      
      this.applyAccessibilitySettings();
      
    } catch (error) {
      console.error('Error initializing accessibility settings:', error);
    }
  }

  async updateAccessibilitySetting(setting, value) {
    try {
      this.accessibilityConfig[setting] = value;
      
      await AsyncStorage.setItem('accessibility_config', JSON.stringify(this.accessibilityConfig));
      
      this.applyAccessibilitySettings();
      this.onAccessibilityChange(setting, value);
      
      return {
        success: true,
        setting,
        value
      };
    } catch (error) {
      console.error('Error updating accessibility setting:', error);
      throw error;
    }
  }

  applyAccessibilitySettings() {
    // Apply font scaling
    if (this.accessibilityConfig.fontSize !== 1.0) {
      // In real app, would update font scale in theme provider
      console.log('Applying font scale:', this.accessibilityConfig.fontSize);
    }
    
    // Apply high contrast mode
    if (this.accessibilityConfig.highContrast) {
      console.log('Applying high contrast mode');
    }
    
    // Reduce animations if needed
    if (this.accessibilityConfig.reduceMotion) {
      console.log('Reducing motion and animations');
    }
  }

  onAccessibilityChange(setting, value) {
    if (this.accessibilityChangeCallback) {
      this.accessibilityChangeCallback({
        setting,
        value,
        config: this.accessibilityConfig
      });
    }
  }

  setAccessibilityChangeCallback(callback) {
    this.accessibilityChangeCallback = callback;
  }

  getAccessibilityConfig() {
    return {
      ...this.accessibilityConfig,
      screenReaderActive: this.accessibilityConfig.screenReader,
      motionReduced: this.accessibilityConfig.reduceMotion
    };
  }

  // ========== HELPER METHODS ==========
  async fetchQuizData(quizId) {
    // Mock API call
    return {
      id: quizId,
      title: 'Sample Offline Quiz',
      subject: 'Mathematics',
      questions: [
        {
          id: 1,
          question: 'What is 5 + 3?',
          options: ['6', '7', '8', '9'],
          correctAnswer: 2
        }
      ],
      mediaFiles: []
    };
  }

  async downloadMediaFiles(mediaFiles, quizId) {
    try {
      for (const file of mediaFiles) {
        const downloadPath = `${RNFS.DocumentDirectoryPath}/quiz_media/${quizId}/${file.name}`;
        await RNFS.downloadFile({
          fromUrl: file.url,
          toFile: downloadPath
        }).promise;
      }
    } catch (error) {
      console.error('Error downloading media files:', error);
    }
  }

  async addToOfflineQuizIndex(quizId, title) {
    const indexKey = 'offline_quiz_index';
    const existing = await AsyncStorage.getItem(indexKey);
    const index = existing ? JSON.parse(existing) : [];
    
    index.unshift({
      id: quizId,
      title,
      downloadedAt: new Date().toISOString()
    });
    
    await AsyncStorage.setItem(indexKey, JSON.stringify(index));
  }

  async syncSingleItem(item) {
    // Mock API sync - in real app, would make actual API calls
    console.log('Syncing item:', item.type);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async saveDeviceToken(token) {
    await AsyncStorage.setItem('device_token', JSON.stringify(token));
  }

  async saveScheduledNotification(id, config) {
    const key = 'scheduled_notifications';
    const existing = await AsyncStorage.getItem(key);
    const notifications = existing ? JSON.parse(existing) : {};
    
    notifications[id] = config;
    await AsyncStorage.setItem(key, JSON.stringify(notifications));
  }

  handleNotification(notification) {
    console.log('Handling notification:', notification);
    
    if (notification.action) {
      this.handleNotificationAction(notification.action, notification.userInfo);
    }
  }

  handleNotificationAction(action, data) {
    console.log('Notification action:', action, data);
    
    // Handle different notification actions
    switch (action) {
      case 'start':
        // Navigate to quiz
        break;
      case 'later':
        // Reschedule notification
        break;
      case 'view':
        // View achievement
        break;
      default:
        break;
    }
  }
}

export const advancedMobileFeatures = new AdvancedMobileFeatures();
export default advancedMobileFeatures;