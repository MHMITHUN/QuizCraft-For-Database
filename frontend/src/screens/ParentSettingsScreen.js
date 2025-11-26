import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Slider } from '@react-native-community/slider';
import { parentDashboard } from '../services/parentDashboard';
import { showToast } from '../components/Toast';

const ParentSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    notifications: {
      enableNotifications: true,
      performanceAlerts: true,
      studyReminders: true,
      achievementNotifications: true,
      weeklyReports: true,
      lowScoreAlert: true,
      streakBreakAlert: true,
      inactivityAlert: true
    },
    thresholds: {
      lowScoreThreshold: 70,
      inactivityDays: 3,
      studyTimeMinimum: 15,
      performanceDropPercent: 15
    },
    schedule: {
      studyReminderTime: '16:00',
      weeklyReportDay: 'Sunday',
      dailyReportTime: '20:00',
      enableQuietHours: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    },
    privacy: {
      dataSharing: false,
      analyticsOptIn: true,
      childDataVisible: true,
      shareProgressWithSchool: false
    },
    family: {
      parentName: 'Parent User',
      email: 'parent@example.com',
      phoneNumber: '+1234567890',
      timeZone: 'America/New_York',
      language: 'English'
    }
  });

  const [activeSection, setActiveSection] = useState('notifications');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTimeField, setSelectedTimeField] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await parentDashboard.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Failed to load settings', 'error');
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const result = await parentDashboard.saveSettings(settings);
      if (result) {
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const exportSettings = async () => {
    try {
      const settingsJson = JSON.stringify(settings, null, 2);
      await Share.share({
        message: settingsJson,
        title: 'Parent Dashboard Settings'
      });
    } catch (error) {
      console.error('Error exporting settings:', error);
      showToast('Failed to export settings', 'error');
    }
  };

  const resetToDefault = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            // Reset to default values
            setSettings({
              notifications: {
                enableNotifications: true,
                performanceAlerts: true,
                studyReminders: true,
                achievementNotifications: true,
                weeklyReports: true,
                lowScoreAlert: true,
                streakBreakAlert: true,
                inactivityAlert: true
              },
              thresholds: {
                lowScoreThreshold: 70,
                inactivityDays: 3,
                studyTimeMinimum: 15,
                performanceDropPercent: 15
              },
              schedule: {
                studyReminderTime: '16:00',
                weeklyReportDay: 'Sunday',
                dailyReportTime: '20:00',
                enableQuietHours: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00'
              },
              privacy: {
                dataSharing: false,
                analyticsOptIn: true,
                childDataVisible: true,
                shareProgressWithSchool: false
              },
              family: settings.family // Keep family info unchanged
            });
            showToast('Settings reset to default', 'success');
          }
        }
      ]
    );
  };

  const handleTimeChange = () => {
    updateSetting('schedule', selectedTimeField, tempTime);
    setShowTimeModal(false);
  };

  const openTimeModal = (field, currentTime) => {
    setSelectedTimeField(field);
    setTempTime(currentTime);
    setShowTimeModal(true);
  };

  const renderNotificationsSection = () => (
    <View style={styles.sectionContainer}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>🔔 Notification Types</Text>
        
        {[
          { key: 'enableNotifications', label: 'Enable All Notifications', description: 'Master toggle for all notifications' },
          { key: 'performanceAlerts', label: 'Performance Alerts', description: 'Get notified about significant performance changes' },
          { key: 'studyReminders', label: 'Study Reminders', description: 'Daily reminders for study time' },
          { key: 'achievementNotifications', label: 'Achievement Notifications', description: 'Celebrate your child\'s achievements' },
          { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive comprehensive weekly progress reports' },
          { key: 'lowScoreAlert', label: 'Low Score Alerts', description: 'Alert when scores fall below threshold' },
          { key: 'streakBreakAlert', label: 'Streak Break Alerts', description: 'Notify when study streaks are broken' },
          { key: 'inactivityAlert', label: 'Inactivity Alerts', description: 'Alert when child hasn\'t studied for days' }
        ].map((item, index) => (
          <Animated.View 
            key={item.key}
            entering={SlideInRight.delay(250 + index * 50)}
            style={styles.settingItem}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.label}</Text>
              <Text style={styles.settingDescription}>{item.description}</Text>
            </View>
            <Switch
              value={settings.notifications[item.key]}
              onValueChange={(value) => updateSetting('notifications', item.key, value)}
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              thumbColor={settings.notifications[item.key] ? '#fff' : '#f4f3f4'}
            />
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>🎯 Alert Thresholds</Text>
        
        <View style={styles.thresholdContainer}>
          <Text style={styles.thresholdLabel}>
            Low Score Threshold: {settings.thresholds.lowScoreThreshold}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={90}
            value={settings.thresholds.lowScoreThreshold}
            onValueChange={(value) => updateSetting('thresholds', 'lowScoreThreshold', Math.round(value))}
            step={5}
            minimumTrackTintColor="#4A90E2"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
        </View>

        <View style={styles.thresholdContainer}>
          <Text style={styles.thresholdLabel}>
            Inactivity Alert: {settings.thresholds.inactivityDays} days
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={7}
            value={settings.thresholds.inactivityDays}
            onValueChange={(value) => updateSetting('thresholds', 'inactivityDays', Math.round(value))}
            step={1}
            minimumTrackTintColor="#4A90E2"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
        </View>

        <View style={styles.thresholdContainer}>
          <Text style={styles.thresholdLabel}>
            Minimum Study Time: {settings.thresholds.studyTimeMinimum} minutes
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={60}
            value={settings.thresholds.studyTimeMinimum}
            onValueChange={(value) => updateSetting('thresholds', 'studyTimeMinimum', Math.round(value))}
            step={5}
            minimumTrackTintColor="#4A90E2"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
        </View>

        <View style={styles.thresholdContainer}>
          <Text style={styles.thresholdLabel}>
            Performance Drop Alert: {settings.thresholds.performanceDropPercent}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={30}
            value={settings.thresholds.performanceDropPercent}
            onValueChange={(value) => updateSetting('thresholds', 'performanceDropPercent', Math.round(value))}
            step={5}
            minimumTrackTintColor="#4A90E2"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
        </View>
      </Animated.View>
    </View>
  );

  const renderScheduleSection = () => (
    <View style={styles.sectionContainer}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>⏰ Notification Schedule</Text>
        
        <TouchableOpacity 
          style={styles.timeSettingItem}
          onPress={() => openTimeModal('studyReminderTime', settings.schedule.studyReminderTime)}
        >
          <View style={styles.timeSettingContent}>
            <Text style={styles.settingTitle}>Study Reminder Time</Text>
            <Text style={styles.settingDescription}>When to send daily study reminders</Text>
          </View>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{settings.schedule.studyReminderTime}</Text>
            <Feather name="chevron-right" size={16} color="#666" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.timeSettingItem}
          onPress={() => openTimeModal('dailyReportTime', settings.schedule.dailyReportTime)}
        >
          <View style={styles.timeSettingContent}>
            <Text style={styles.settingTitle}>Daily Report Time</Text>
            <Text style={styles.settingDescription}>When to send daily progress reports</Text>
          </View>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{settings.schedule.dailyReportTime}</Text>
            <Feather name="chevron-right" size={16} color="#666" />
          </View>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Weekly Report Day</Text>
            <Text style={styles.settingDescription}>Day of the week to receive weekly reports</Text>
          </View>
          <View style={styles.pickerContainer}>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                Alert.alert(
                  'Select Day',
                  'Choose the day for weekly reports',
                  days.map(day => ({
                    text: day,
                    onPress: () => updateSetting('schedule', 'weeklyReportDay', day)
                  }))
                );
              }}
            >
              <Text style={styles.pickerText}>{settings.schedule.weeklyReportDay}</Text>
              <Feather name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>🌙 Quiet Hours</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
            <Text style={styles.settingDescription}>Disable notifications during specified hours</Text>
          </View>
          <Switch
            value={settings.schedule.enableQuietHours}
            onValueChange={(value) => updateSetting('schedule', 'enableQuietHours', value)}
            trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
            thumbColor={settings.schedule.enableQuietHours ? '#fff' : '#f4f3f4'}
          />
        </View>

        {settings.schedule.enableQuietHours && (
          <>
            <TouchableOpacity 
              style={styles.timeSettingItem}
              onPress={() => openTimeModal('quietHoursStart', settings.schedule.quietHoursStart)}
            >
              <View style={styles.timeSettingContent}>
                <Text style={styles.settingTitle}>Quiet Hours Start</Text>
                <Text style={styles.settingDescription}>When to start quiet hours</Text>
              </View>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>{settings.schedule.quietHoursStart}</Text>
                <Feather name="chevron-right" size={16} color="#666" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.timeSettingItem}
              onPress={() => openTimeModal('quietHoursEnd', settings.schedule.quietHoursEnd)}
            >
              <View style={styles.timeSettingContent}>
                <Text style={styles.settingTitle}>Quiet Hours End</Text>
                <Text style={styles.settingDescription}>When to end quiet hours</Text>
              </View>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>{settings.schedule.quietHoursEnd}</Text>
                <Feather name="chevron-right" size={16} color="#666" />
              </View>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );

  const renderPrivacySection = () => (
    <View style={styles.sectionContainer}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>🔒 Privacy & Data</Text>
        
        {[
          { key: 'dataSharing', label: 'Data Sharing', description: 'Share anonymized data to improve the app' },
          { key: 'analyticsOptIn', label: 'Analytics', description: 'Help improve the app with usage analytics' },
          { key: 'childDataVisible', label: 'Child Data Visibility', description: 'Allow child to see their own detailed progress' },
          { key: 'shareProgressWithSchool', label: 'Share with School', description: 'Allow teachers to access progress reports' }
        ].map((item, index) => (
          <Animated.View 
            key={item.key}
            entering={SlideInRight.delay(250 + index * 50)}
            style={styles.settingItem}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.label}</Text>
              <Text style={styles.settingDescription}>{item.description}</Text>
            </View>
            <Switch
              value={settings.privacy[item.key]}
              onValueChange={(value) => updateSetting('privacy', item.key, value)}
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              thumbColor={settings.privacy[item.key] ? '#fff' : '#f4f3f4'}
            />
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>📄 Data Management</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={exportSettings}>
          <MaterialIcons name="download" size={24} color="#4A90E2" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Export Settings</Text>
            <Text style={styles.actionDescription}>Download your settings as a backup</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            Alert.alert(
              'Delete All Data',
              'This will permanently delete all your data and cannot be undone. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => showToast('Data deletion would be processed here', 'info')
                }
              ]
            );
          }}
        >
          <MaterialIcons name="delete" size={24} color="#F44336" />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: '#F44336' }]}>Delete All Data</Text>
            <Text style={styles.actionDescription}>Permanently remove all your data</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#666" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderAccountSection = () => (
    <View style={styles.sectionContainer}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>👤 Account Information</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Parent Name</Text>
          <TextInput
            style={styles.textInput}
            value={settings.family.parentName}
            onChangeText={(value) => updateSetting('family', 'parentName', value)}
            placeholder="Enter your name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.textInput}
            value={settings.family.email}
            onChangeText={(value) => updateSetting('family', 'email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={settings.family.phoneNumber}
            onChangeText={(value) => updateSetting('family', 'phoneNumber', value)}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Time Zone</Text>
            <Text style={styles.settingDescription}>Your current time zone</Text>
          </View>
          <View style={styles.pickerContainer}>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => {
                const timeZones = [
                  'America/New_York', 'America/Chicago', 'America/Denver', 
                  'America/Los_Angeles', 'Europe/London', 'Europe/Paris'
                ];
                Alert.alert(
                  'Select Time Zone',
                  'Choose your time zone',
                  timeZones.map(tz => ({
                    text: tz,
                    onPress: () => updateSetting('family', 'timeZone', tz)
                  }))
                );
              }}
            >
              <Text style={styles.pickerText}>{settings.family.timeZone}</Text>
              <Feather name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Language</Text>
            <Text style={styles.settingDescription}>App display language</Text>
          </View>
          <View style={styles.pickerContainer}>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => {
                const languages = ['English', 'Spanish', 'French', 'German', 'Chinese'];
                Alert.alert(
                  'Select Language',
                  'Choose your preferred language',
                  languages.map(lang => ({
                    text: lang,
                    onPress: () => updateSetting('family', 'language', lang)
                  }))
                );
              }}
            >
              <Text style={styles.pickerText}>{settings.family.language}</Text>
              <Feather name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.settingsCard}>
        <Text style={styles.cardTitle}>⚙️ App Settings</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Help')}
        >
          <MaterialIcons name="help-outline" size={24} color="#4A90E2" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Help & Support</Text>
            <Text style={styles.actionDescription}>Get help and contact support</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('About')}
        >
          <MaterialIcons name="info-outline" size={24} color="#4A90E2" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>About QuizCraft</Text>
            <Text style={styles.actionDescription}>Version info and legal</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#666" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'notifications':
        return renderNotificationsSection();
      case 'schedule':
        return renderScheduleSection();
      case 'privacy':
        return renderPrivacySection();
      case 'account':
        return renderAccountSection();
      default:
        return renderNotificationsSection();
    }
  };

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
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={resetToDefault}
          >
            <Feather name="refresh-cw" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={saveSettings}
            disabled={loading}
          >
            <Feather name="save" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Section Navigation */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.sectionTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'notifications', label: 'Notifications', icon: 'bell' },
            { key: 'schedule', label: 'Schedule', icon: 'clock' },
            { key: 'privacy', label: 'Privacy', icon: 'shield' },
            { key: 'account', label: 'Account', icon: 'user' }
          ].map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[
                styles.sectionTab,
                activeSection === section.key && styles.activeSectionTab
              ]}
              onPress={() => setActiveSection(section.key)}
            >
              <Feather 
                name={section.icon} 
                size={16} 
                color={activeSection === section.key ? "#4A90E2" : "#666"} 
              />
              <Text style={[
                styles.sectionTabText,
                activeSection === section.key && styles.activeSectionTabText
              ]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Section Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSectionContent()}
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.timeInput}
              value={tempTime}
              onChangeText={setTempTime}
              placeholder="HH:MM (24-hour format)"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleTimeChange}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  sectionTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 8,
  },
  activeSectionTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  sectionTabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  activeSectionTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionContainer: {
    padding: 20,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  thresholdContainer: {
    marginVertical: 16,
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4A90E2',
  },
  timeSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeSettingContent: {
    flex: 1,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginRight: 8,
  },
  pickerContainer: {
    minWidth: 120,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  pickerText: {
    fontSize: 12,
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
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
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ParentSettingsScreen;