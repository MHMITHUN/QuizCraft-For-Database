import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

class LocalizationSystem {
  constructor() {
    this.supportedLanguages = {
      'en': { 
        name: 'English', 
        nativeName: 'English', 
        flag: '🇺🇸', 
        rtl: false,
        script: 'latin'
      },
      'bn': { 
        name: 'Bengali', 
        nativeName: 'বাংলা', 
        flag: '🇧🇩', 
        rtl: false,
        script: 'bengali'
      },
      'hi': { 
        name: 'Hindi', 
        nativeName: 'हिन्दी', 
        flag: '🇮🇳', 
        rtl: false,
        script: 'devanagari'
      },
      'ur': { 
        name: 'Urdu', 
        nativeName: 'اردو', 
        flag: '🇵🇰', 
        rtl: true,
        script: 'arabic'
      },
      'ar': { 
        name: 'Arabic', 
        nativeName: 'العربية', 
        flag: '🇸🇦', 
        rtl: true,
        script: 'arabic'
      }
    };

    this.regions = {
      'BD': {
        name: 'Bangladesh',
        flag: '🇧🇩',
        currency: 'BDT',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        defaultLanguage: 'bn',
        curriculumBoards: ['NCTB', 'Cambridge', 'Edexcel'],
        gradeSystems: ['Class 1-12', 'O Level', 'A Level']
      },
      'IN': {
        name: 'India',
        flag: '🇮🇳',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        defaultLanguage: 'hi',
        curriculumBoards: ['CBSE', 'ICSE', 'State Boards'],
        gradeSystems: ['Class 1-12', 'Standard 1-12']
      },
      'PK': {
        name: 'Pakistan',
        flag: '🇵🇰',
        currency: 'PKR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        defaultLanguage: 'ur',
        curriculumBoards: ['Federal', 'Provincial', 'Cambridge'],
        gradeSystems: ['Class 1-12', 'O Level', 'A Level']
      },
      'US': {
        name: 'United States',
        flag: '🇺🇸',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        defaultLanguage: 'en',
        curriculumBoards: ['Common Core', 'State Standards'],
        gradeSystems: ['Grade K-12']
      }
    };

    this.currentLanguage = 'en';
    this.currentRegion = 'BD';
    this.fallbackLanguage = 'en';
    
    this.i18n = new I18n();
    this.initializeI18n();
    
    // Translation cache
    this.translationCache = new Map();
    
    // Cultural context data
    this.culturalContexts = new Map();
  }

  // ========== INITIALIZATION ==========
  async initializeI18n() {
    try {
      // Load saved preferences
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      const savedRegion = await AsyncStorage.getItem('selectedRegion');
      
      // Use saved preferences or detect from device
      this.currentLanguage = savedLanguage || this.detectLanguage();
      this.currentRegion = savedRegion || this.detectRegion();
      
      // Load translations
      await this.loadTranslations();
      
      // Configure i18n
      this.i18n.locale = this.currentLanguage;
      this.i18n.enableFallback = true;
      this.i18n.defaultLocale = this.fallbackLanguage;
      
    } catch (error) {
      console.error('Error initializing localization:', error);
      // Fallback to defaults
      this.currentLanguage = 'en';
      this.currentRegion = 'BD';
    }
  }

  detectLanguage() {
    const deviceLocale = Localization.locale;
    const languageCode = deviceLocale.split('-')[0];
    
    if (this.supportedLanguages[languageCode]) {
      return languageCode;
    }
    
    return this.fallbackLanguage;
  }

  detectRegion() {
    const deviceLocale = Localization.locale;
    const regionCode = deviceLocale.split('-')[1] || Localization.region;
    
    if (this.regions[regionCode]) {
      return regionCode;
    }
    
    return 'BD'; // Default to Bangladesh
  }

  // ========== TRANSLATION MANAGEMENT ==========
  async loadTranslations() {
    try {
      // Load base translations from storage or bundle
      const translations = await this.loadTranslationFiles();
      
      // Set translations in i18n
      Object.keys(translations).forEach(lang => {
        this.i18n.translations[lang] = translations[lang];
      });
      
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }

  async loadTranslationFiles() {
    // Mock translation data - in real app, these would be loaded from files or API
    return {
      en: {
        // Navigation & General
        navigation: {
          home: 'Home',
          quizzes: 'Quizzes',
          progress: 'Progress',
          competitions: 'Competitions',
          profile: 'Profile',
          settings: 'Settings'
        },
        
        // Quiz Interface
        quiz: {
          start: 'Start Quiz',
          submit: 'Submit Answer',
          next: 'Next Question',
          previous: 'Previous Question',
          finish: 'Finish Quiz',
          score: 'Score',
          time_remaining: 'Time Remaining',
          question_count: 'Question {{current}} of {{total}}',
          correct: 'Correct!',
          incorrect: 'Incorrect',
          explanation: 'Explanation',
          retry: 'Try Again'
        },
        
        // Subjects
        subjects: {
          mathematics: 'Mathematics',
          science: 'Science',
          english: 'English',
          history: 'History',
          geography: 'Geography',
          physics: 'Physics',
          chemistry: 'Chemistry',
          biology: 'Biology'
        },
        
        // Messages
        messages: {
          welcome: 'Welcome to QuizCraft!',
          loading: 'Loading...',
          error: 'An error occurred',
          success: 'Success!',
          no_internet: 'No internet connection',
          sync_complete: 'Sync completed successfully'
        },
        
        // Bangladesh specific content
        bd_content: {
          curriculum_boards: {
            nctb: 'National Curriculum and Textbook Board',
            cambridge: 'Cambridge International',
            edexcel: 'Pearson Edexcel'
          },
          grade_levels: {
            class_1: 'Class 1',
            class_2: 'Class 2',
            class_3: 'Class 3',
            class_4: 'Class 4',
            class_5: 'Class 5',
            class_6: 'Class 6',
            class_7: 'Class 7',
            class_8: 'Class 8',
            class_9: 'Class 9',
            class_10: 'Class 10',
            hsc_1: 'HSC 1st Year',
            hsc_2: 'HSC 2nd Year'
          }
        }
      },
      
      bn: {
        navigation: {
          home: 'হোম',
          quizzes: 'কুইজ',
          progress: 'অগ্রগতি',
          competitions: 'প্রতিযোগিতা',
          profile: 'প্রোফাইল',
          settings: 'সেটিংস'
        },
        
        quiz: {
          start: 'কুইজ শুরু করুন',
          submit: 'উত্তর জমা দিন',
          next: 'পরবর্তী প্রশ্ন',
          previous: 'পূর্ববর্তী প্রশ্ন',
          finish: 'কুইজ শেষ করুন',
          score: 'স্কোর',
          time_remaining: 'অবশিষ্ট সময়',
          question_count: 'প্রশ্ন {{current}} এর {{total}}',
          correct: 'সঠিক!',
          incorrect: 'ভুল',
          explanation: 'ব্যাখ্যা',
          retry: 'আবার চেষ্টা করুন'
        },
        
        subjects: {
          mathematics: 'গণিত',
          science: 'বিজ্ঞান',
          english: 'ইংরেজি',
          history: 'ইতিহাস',
          geography: 'ভূগোল',
          physics: 'পদার্থবিদ্যা',
          chemistry: 'রসায়ন',
          biology: 'জীববিজ্ঞান'
        },
        
        messages: {
          welcome: 'QuizCraft-এ স্বাগতম!',
          loading: 'লোড হচ্ছে...',
          error: 'একটি ত্রুটি ঘটেছে',
          success: 'সফল!',
          no_internet: 'ইন্টারনেট সংযোগ নেই',
          sync_complete: 'সিঙ্ক সফলভাবে সম্পন্ন হয়েছে'
        },
        
        bd_content: {
          curriculum_boards: {
            nctb: 'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড',
            cambridge: 'কেমব্রিজ আন্তর্জাতিক',
            edexcel: 'পিয়ারসন এডেক্সেল'
          },
          grade_levels: {
            class_1: '১ম শ্রেণী',
            class_2: '২য় শ্রেণী',
            class_3: '৩য় শ্রেণী',
            class_4: '৪র্থ শ্রেণী',
            class_5: '৫ম শ্রেণী',
            class_6: '৬ষ্ঠ শ্রেণী',
            class_7: '৭ম শ্রেণী',
            class_8: '৮ম শ্রেণী',
            class_9: '৯ম শ্রেণী',
            class_10: '১০ম শ্রেণী',
            hsc_1: 'উচ্চ মাধ্যমিক ১ম বর্ষ',
            hsc_2: 'উচ্চ মাধ্যমিক ২য় বর্ষ'
          }
        }
      },
      
      hi: {
        navigation: {
          home: 'होम',
          quizzes: 'प्रश्नोत्तरी',
          progress: 'प्रगति',
          competitions: 'प्रतियोगिताएं',
          profile: 'प्रोफाइल',
          settings: 'सेटिंग्स'
        },
        
        quiz: {
          start: 'प्रश्नोत्तरी शुरू करें',
          submit: 'उत्तर जमा करें',
          next: 'अगला प्रश्न',
          previous: 'पिछला प्रश्न',
          finish: 'प्रश्नोत्तरी समाप्त करें',
          score: 'स्कोर',
          time_remaining: 'बचा हुआ समय',
          question_count: 'प्रश्न {{current}} का {{total}}',
          correct: 'सही!',
          incorrect: 'गलत',
          explanation: 'व्याख्या',
          retry: 'फिर से कोशिश करें'
        },
        
        subjects: {
          mathematics: 'गणित',
          science: 'विज्ञान',
          english: 'अंग्रेजी',
          history: 'इतिहास',
          geography: 'भूगोल',
          physics: 'भौतिक विज्ञान',
          chemistry: 'रसायन विज्ञान',
          biology: 'जीव विज्ञान'
        },
        
        messages: {
          welcome: 'QuizCraft में आपका स्वागत है!',
          loading: 'लोड हो रहा है...',
          error: 'एक त्रुटि हुई',
          success: 'सफलता!',
          no_internet: 'कोई इंटरनेट कनेक्शन नहीं',
          sync_complete: 'सिंक सफलतापूर्वक पूरा हुआ'
        }
      }
    };
  }

  // ========== AI-POWERED TRANSLATION ==========
  async translateText(text, targetLanguage, context = null) {
    try {
      // Check cache first
      const cacheKey = `${text}_${targetLanguage}_${context}`;
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
      }

      // Mock AI translation service
      const translation = await this.aiTranslationService(text, targetLanguage, context);
      
      // Cache the result
      this.translationCache.set(cacheKey, translation);
      
      return translation;

    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Fallback to original text
    }
  }

  async aiTranslationService(text, targetLanguage, context) {
    // Mock AI translation - in real app, this would call an AI service like Google Translate API
    const mockTranslations = {
      'bn': {
        'What is 2 + 2?': '২ + ২ কত?',
        'Choose the correct answer': 'সঠিক উত্তর বেছে নিন',
        'Mathematics': 'গণিত',
        'Science': 'বিজ্ঞান',
        'Well done!': 'খুব ভাল!',
        'Try again': 'আবার চেষ্টা করুন'
      },
      'hi': {
        'What is 2 + 2?': '2 + 2 क्या है?',
        'Choose the correct answer': 'सही उत्तर चुनें',
        'Mathematics': 'गणित',
        'Science': 'विज्ञान',
        'Well done!': 'बहुत बढ़िया!',
        'Try again': 'फिर से कोशिश करें'
      }
    };

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return mock translation or original text
    const translation = mockTranslations[targetLanguage]?.[text] || text;
    
    return {
      originalText: text,
      translatedText: translation,
      targetLanguage,
      context,
      confidence: 0.95,
      translatedAt: new Date().toISOString()
    };
  }

  async translateQuiz(quizData, targetLanguage) {
    try {
      const translatedQuiz = { ...quizData };
      
      // Translate quiz title and description
      if (quizData.title) {
        const titleTranslation = await this.translateText(
          quizData.title, 
          targetLanguage, 
          'quiz_title'
        );
        translatedQuiz.title = titleTranslation.translatedText;
      }
      
      if (quizData.description) {
        const descTranslation = await this.translateText(
          quizData.description, 
          targetLanguage, 
          'quiz_description'
        );
        translatedQuiz.description = descTranslation.translatedText;
      }
      
      // Translate questions
      if (quizData.questions) {
        translatedQuiz.questions = await Promise.all(
          quizData.questions.map(async (question) => {
            const translatedQuestion = { ...question };
            
            // Translate question text
            if (question.question) {
              const questionTranslation = await this.translateText(
                question.question,
                targetLanguage,
                'question_text'
              );
              translatedQuestion.question = questionTranslation.translatedText;
            }
            
            // Translate options
            if (question.options) {
              translatedQuestion.options = await Promise.all(
                question.options.map(async (option) => {
                  const optionTranslation = await this.translateText(
                    option,
                    targetLanguage,
                    'answer_option'
                  );
                  return optionTranslation.translatedText;
                })
              );
            }
            
            // Translate explanation
            if (question.explanation) {
              const explanationTranslation = await this.translateText(
                question.explanation,
                targetLanguage,
                'explanation'
              );
              translatedQuestion.explanation = explanationTranslation.translatedText;
            }
            
            return translatedQuestion;
          })
        );
      }
      
      return {
        success: true,
        translatedQuiz,
        originalLanguage: quizData.language || 'en',
        targetLanguage,
        translatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error translating quiz:', error);
      throw error;
    }
  }

  // ========== REGIONAL CONTENT ADAPTATION ==========
  async adaptContentForRegion(content, region) {
    try {
      const regionConfig = this.regions[region];
      if (!regionConfig) {
        throw new Error(`Unsupported region: ${region}`);
      }

      const adaptedContent = {
        ...content,
        region: region,
        currency: regionConfig.currency,
        dateFormat: regionConfig.dateFormat,
        timeFormat: regionConfig.timeFormat,
        curriculumBoards: regionConfig.curriculumBoards,
        gradeSystems: regionConfig.gradeSystems
      };

      // Apply cultural adaptations
      if (region === 'BD') {
        adaptedContent = await this.applyBangladeshAdaptations(adaptedContent);
      } else if (region === 'IN') {
        adaptedContent = await this.applyIndiaAdaptations(adaptedContent);
      } else if (region === 'PK') {
        adaptedContent = await this.applyPakistanAdaptations(adaptedContent);
      }

      return adaptedContent;

    } catch (error) {
      console.error('Error adapting content for region:', error);
      throw error;
    }
  }

  async applyBangladeshAdaptations(content) {
    const adaptations = {
      // Use Bangladeshi curriculum references
      mathTopics: [
        'সংখ্যা পদ্ধতি', 'বীজগণিত', 'জ্যামিতি', 'ত্রিকোণমিতি', 
        'পরিসংখ্যান', 'সম্ভাব্যতা'
      ],
      scienceTopics: [
        'পদার্থবিদ্যা', 'রসায়ন', 'জীববিজ্ঞান', 'পরিবেশবিজ্ঞান'
      ],
      
      // Use familiar examples and contexts
      examples: {
        currency: 'টাকা',
        distances: 'কিলোমিটার',
        temperature: 'সেলসিয়াস',
        culturalReferences: [
          'ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী',
          'পদ্মা নদী', 'সুন্দরবন', 'কক্সবাজার'
        ]
      },
      
      // Educational system context
      examSystems: ['JSC', 'SSC', 'HSC'],
      boards: ['NCTB', 'Cambridge', 'Edexcel']
    };
    
    return { ...content, ...adaptations };
  }

  async applyIndiaAdaptations(content) {
    const adaptations = {
      mathTopics: [
        'Number Systems', 'Algebra', 'Geometry', 'Trigonometry',
        'Statistics', 'Probability'
      ],
      
      examples: {
        currency: 'Rupees',
        distances: 'Kilometers',
        temperature: 'Celsius',
        culturalReferences: [
          'Delhi', 'Mumbai', 'Chennai', 'Kolkata',
          'Ganges River', 'Himalayas', 'Kerala'
        ]
      },
      
      examSystems: ['CBSE', 'ICSE', 'State Board'],
      boards: ['CBSE', 'ICSE', 'Various State Boards']
    };
    
    return { ...content, ...adaptations };
  }

  async applyPakistanAdaptations(content) {
    const adaptations = {
      mathTopics: [
        'نمبر سسٹم', 'الجبرا', 'جیومیٹری', 'مثلثیات',
        'شماریات', 'امکانات'
      ],
      
      examples: {
        currency: 'Rupees',
        distances: 'Kilometers', 
        temperature: 'Celsius',
        culturalReferences: [
          'کراچی', 'لاہور', 'اسلام آباد', 'فیصل آباد',
          'دریائے سندھ', 'کے ٹو', 'سوات'
        ]
      },
      
      examSystems: ['Matric', 'Intermediate', 'O Level', 'A Level'],
      boards: ['Federal Board', 'Provincial Boards', 'Cambridge']
    };
    
    return { ...content, ...adaptations };
  }

  // ========== CULTURAL CONTEXT AWARENESS ==========
  getCulturalContext(region, contentType) {
    const contextKey = `${region}_${contentType}`;
    
    if (this.culturalContexts.has(contextKey)) {
      return this.culturalContexts.get(contextKey);
    }
    
    // Generate cultural context
    const context = this.generateCulturalContext(region, contentType);
    this.culturalContexts.set(contextKey, context);
    
    return context;
  }

  generateCulturalContext(region, contentType) {
    const contexts = {
      'BD_math': {
        preferredUnits: ['metric'],
        culturalExamples: ['rice price', 'cricket scores', 'monsoon rainfall'],
        festivalsAndEvents: ['Eid', 'Pohela Boishakh', 'Victory Day'],
        commonScenarios: ['market shopping', 'bus fare calculation', 'school grades']
      },
      
      'BD_science': {
        localFlora: ['mango', 'jackfruit', 'rice', 'jute'],
        localFauna: ['Royal Bengal Tiger', 'Hilsa fish', 'peacock'],
        environmental: ['monsoon', 'cyclones', 'rivers', 'deltas'],
        technology: ['mobile banking', 'solar panels', 'tube wells']
      },
      
      'IN_math': {
        preferredUnits: ['metric', 'traditional units like maund'],
        culturalExamples: ['cricket statistics', 'Bollywood box office'],
        festivalsAndEvents: ['Diwali', 'Holi', 'Independence Day'],
        commonScenarios: ['train schedules', 'market prices', 'exam scores']
      },
      
      'PK_math': {
        preferredUnits: ['metric'],
        culturalExamples: ['cricket scores', 'currency exchange'],
        festivalsAndEvents: ['Eid', 'Pakistan Day', 'Independence Day'],
        commonScenarios: ['bazaar shopping', 'exam results', 'sports scores']
      }
    };
    
    const contextKey = `${region}_${contentType}`;
    return contexts[contextKey] || {};
  }

  // ========== SCRIPT SUPPORT ==========
  getScriptDirection(language) {
    const langConfig = this.supportedLanguages[language];
    return langConfig ? (langConfig.rtl ? 'rtl' : 'ltr') : 'ltr';
  }

  getScriptType(language) {
    const langConfig = this.supportedLanguages[language];
    return langConfig ? langConfig.script : 'latin';
  }

  formatTextForScript(text, language) {
    const scriptType = this.getScriptType(language);
    const direction = this.getScriptDirection(language);
    
    return {
      text,
      direction,
      script: scriptType,
      fontFamily: this.getFontFamily(scriptType),
      needsSpecialHandling: scriptType !== 'latin'
    };
  }

  getFontFamily(scriptType) {
    const fonts = {
      'latin': 'System',
      'bengali': 'SolaimanLipi', // For Bengali text
      'devanagari': 'Mangal', // For Hindi text
      'arabic': 'Al Nile' // For Arabic/Urdu text
    };
    
    return fonts[scriptType] || 'System';
  }

  // ========== LANGUAGE MANAGEMENT ==========
  async setLanguage(languageCode) {
    try {
      if (!this.supportedLanguages[languageCode]) {
        throw new Error(`Unsupported language: ${languageCode}`);
      }

      this.currentLanguage = languageCode;
      this.i18n.locale = languageCode;
      
      // Save preference
      await AsyncStorage.setItem('selectedLanguage', languageCode);
      
      return {
        success: true,
        language: languageCode,
        message: 'Language changed successfully'
      };

    } catch (error) {
      console.error('Error setting language:', error);
      throw error;
    }
  }

  async setRegion(regionCode) {
    try {
      if (!this.regions[regionCode]) {
        throw new Error(`Unsupported region: ${regionCode}`);
      }

      this.currentRegion = regionCode;
      
      // Save preference
      await AsyncStorage.setItem('selectedRegion', regionCode);
      
      // Optionally change language to region's default
      const regionConfig = this.regions[regionCode];
      if (regionConfig.defaultLanguage !== this.currentLanguage) {
        await this.setLanguage(regionConfig.defaultLanguage);
      }
      
      return {
        success: true,
        region: regionCode,
        message: 'Region changed successfully'
      };

    } catch (error) {
      console.error('Error setting region:', error);
      throw error;
    }
  }

  // ========== FORMATTING UTILITIES ==========
  formatNumber(number, language = this.currentLanguage) {
    try {
      const locale = this.getLocaleString(language);
      return new Intl.NumberFormat(locale).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  formatCurrency(amount, currency = null, language = this.currentLanguage) {
    try {
      const locale = this.getLocaleString(language);
      const currencyCode = currency || this.regions[this.currentRegion]?.currency || 'USD';
      
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
      }).format(amount);
    } catch (error) {
      return `${amount} ${currency}`;
    }
  }

  formatDate(date, language = this.currentLanguage) {
    try {
      const locale = this.getLocaleString(language);
      const dateFormat = this.regions[this.currentRegion]?.dateFormat || 'DD/MM/YYYY';
      
      return new Intl.DateTimeFormat(locale).format(new Date(date));
    } catch (error) {
      return new Date(date).toLocaleDateString();
    }
  }

  formatTime(time, language = this.currentLanguage) {
    try {
      const locale = this.getLocaleString(language);
      const timeFormat = this.regions[this.currentRegion]?.timeFormat || '12h';
      
      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: timeFormat === '12h'
      }).format(new Date(time));
    } catch (error) {
      return new Date(time).toLocaleTimeString();
    }
  }

  getLocaleString(language) {
    const localeMap = {
      'en': 'en-US',
      'bn': 'bn-BD',
      'hi': 'hi-IN',
      'ur': 'ur-PK',
      'ar': 'ar-SA'
    };
    
    return localeMap[language] || 'en-US';
  }

  // ========== TRANSLATION INTERFACE ==========
  t(key, interpolation = {}) {
    return this.i18n.t(key, interpolation);
  }

  // Get current language info
  getCurrentLanguage() {
    return {
      code: this.currentLanguage,
      ...this.supportedLanguages[this.currentLanguage]
    };
  }

  // Get current region info
  getCurrentRegion() {
    return {
      code: this.currentRegion,
      ...this.regions[this.currentRegion]
    };
  }

  // Get all supported languages
  getSupportedLanguages() {
    return Object.entries(this.supportedLanguages).map(([code, info]) => ({
      code,
      ...info
    }));
  }

  // Get all supported regions
  getSupportedRegions() {
    return Object.entries(this.regions).map(([code, info]) => ({
      code,
      ...info
    }));
  }

  // ========== CONTENT LOCALIZATION PIPELINE ==========
  async localizeContent(content, targetLanguage = this.currentLanguage, targetRegion = this.currentRegion) {
    try {
      let localizedContent = { ...content };
      
      // Step 1: Translate text content
      if (targetLanguage !== 'en') {
        localizedContent = await this.translateQuiz(localizedContent, targetLanguage);
        localizedContent = localizedContent.translatedQuiz;
      }
      
      // Step 2: Adapt for regional context
      localizedContent = await this.adaptContentForRegion(localizedContent, targetRegion);
      
      // Step 3: Apply cultural context
      const culturalContext = this.getCulturalContext(targetRegion, content.type || 'general');
      localizedContent.culturalContext = culturalContext;
      
      // Step 4: Format for script requirements
      const scriptInfo = this.formatTextForScript('', targetLanguage);
      localizedContent.scriptInfo = scriptInfo;
      
      return {
        success: true,
        localizedContent,
        sourceLanguage: content.language || 'en',
        targetLanguage,
        targetRegion,
        localizedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error localizing content:', error);
      throw error;
    }
  }
}

export const localizationSystem = new LocalizationSystem();
export default localizationSystem;