import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the Language Context
const LanguageContext = createContext();

// Language Context Provider
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference on app start
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save language preference
  const saveLanguagePreference = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('userLanguage', newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.log('Error saving language preference:', error);
    }
  };

  // Toggle between languages
  const toggleLanguage = () => {
    const newLanguage = language === 'english' ? 'bangla' : 'english';
    saveLanguagePreference(newLanguage);
  };

  // Get text based on current language
  const getText = (englishText, banglaText) => {
    return language === 'bangla' ? banglaText : englishText;
  };

  // Check if current language is Bangla
  const isBangla = () => {
    return language === 'bangla';
  };

  // Check if current language is English
  const isEnglish = () => {
    return language === 'english';
  };

  const contextValue = {
    language,
    setLanguage: saveLanguagePreference,
    toggleLanguage,
    getText,
    isBangla,
    isEnglish,
    isLoading
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use Language Context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Export context for advanced usage
export default LanguageContext;