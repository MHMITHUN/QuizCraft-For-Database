import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionsAPI, paymentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

const { width: screenWidth } = Dimensions.get('window');

export default function SubscriptionScreen({ navigation }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { theme } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  // Define subscription packages with role-specific features
  const subscriptionPlans = {
    student: [
      {
        id: 'student_basic',
        name: 'Student Basic',
        namebn: 'ছাত্র বেসিক',
        price: { monthly: 99, yearly: 990 },
        features: [
          'Take unlimited quizzes',
          'Join unlimited classes',
          'Access to quiz explanations',
          'Basic progress tracking',
          'Mobile app access',
          'Email support'
        ],
        featuresbn: [
          'সীমাহীন কুইজ নিন',
          'সীমাহীন ক্লাসে যোগ দিন',
          'কুইজের ব্যাখ্যা দেখুন',
          'মৌলিক অগ্রগতি ট্র্যাকিং',
          'মোবাইল অ্যাপ ব্যবহার',
          'ইমেইল সাপোর্ট'
        ],
        color: '#10B981',
        popular: false
      },
      {
        id: 'student_premium',
        name: 'Student Premium',
        namebn: 'ছাত্র প্রিমিয়াম',
        price: { monthly: 199, yearly: 1990 },
        features: [
          'Everything in Basic',
          'Create personal quizzes',
          'Advanced analytics & insights',
          'Download quizzes for offline',
          'Priority support',
          'Ad-free experience',
          'Custom study schedules'
        ],
        featuresbn: [
          'বেসিকের সব সুবিধা',
          'ব্যক্তিগত কুইজ তৈরি করুন',
          'উন্নত বিশ্লেষণ ও অন্তর্দৃষ্টি',
          'অফলাইনের জন্য কুইজ ডাউনলোড',
          'অগ্রাধিকার সাপোর্ট',
          'বিজ্ঞাপন মুক্ত অভিজ্ঞতা',
          'কাস্টম অধ্যয়ন সময়সূচী'
        ],
        color: '#4F46E5',
        popular: true
      }
    ],
    teacher: [
      {
        id: 'teacher_basic',
        name: 'Teacher Basic',
        namebn: 'শিক্ষক বেসিক',
        price: { monthly: 299, yearly: 2990 },
        features: [
          'Create unlimited quizzes',
          'Manage up to 5 classes',
          'Up to 50 students per class',
          'Basic student analytics',
          'Quiz assignment & tracking',
          'Email support'
        ],
        featuresbn: [
          'সীমাহীন কুইজ তৈরি করুন',
          '৫টি পর্যন্ত ক্লাস পরিচালনা',
          'প্রতি ক্লাসে ৫০ জন পর্যন্ত ছাত্র',
          'মৌলিক ছাত্র বিশ্লেষণ',
          'কুইজ অ্যাসাইনমেন্ট ও ট্র্যাকিং',
          'ইমেইল সাপোর্ট'
        ],
        color: '#059669',
        popular: false
      },
      {
        id: 'teacher_premium',
        name: 'Teacher Premium',
        namebn: 'শিক্ষক প্রিমিয়াম',
        price: { monthly: 499, yearly: 4990 },
        features: [
          'Everything in Basic',
          'Unlimited classes & students',
          'Advanced student analytics',
          'Custom quiz templates',
          'Bulk quiz creation',
          'Parent progress reports',
          'API integration',
          'Priority support'
        ],
        featuresbn: [
          'বেসিকের সব সুবিধা',
          'সীমাহীন ক্লাস ও ছাত্র',
          'উন্নত ছাত্র বিশ্লেষণ',
          'কাস্টম কুইজ টেমপ্লেট',
          'বাল্ক কুইজ তৈরি',
          'অভিভাবক অগ্রগতি রিপোর্ট',
          'API ইন্টিগ্রেশন',
          'অগ্রাধিকার সাপোর্ট'
        ],
        color: '#7C3AED',
        popular: true
      },
      {
        id: 'teacher_institutional',
        name: 'Institutional',
        namebn: 'প্রাতিষ্ঠানিক',
        price: { monthly: 999, yearly: 9990 },
        features: [
          'Everything in Premium',
          'Multi-teacher management',
          'School-wide analytics',
          'Custom branding',
          'LMS integration',
          'Dedicated account manager',
          'On-site training',
          'Custom features'
        ],
        featuresbn: [
          'প্রিমিয়ামের সব সুবিধা',
          'বহু শিক্ষক ব্যবস্থাপনা',
          'স্কুল-ব্যাপী বিশ্লেষণ',
          'কাস্টম ব্র্যান্ডিং',
          'LMS ইন্টিগ্রেশন',
          'নিবেদিতপ্রাণ অ্যাকাউন্ট ম্যানেজার',
          'অন-সাইট প্রশিক্ষণ',
          'কাস্টম ফিচার'
        ],
        color: '#DC2626',
        popular: false
      }
    ]
  };

  useEffect(() => {
    loadCurrentSubscription();
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

  const loadCurrentSubscription = async () => {
    try {
      const res = await subscriptionsAPI.mine();
      setCurrentSubscription(res?.data?.data?.subscription);
    } catch (error) {
      console.warn('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestSubscription = async (plan) => {
    setRequesting(true);
    setSelectedPlan(plan.id);
    try {
      // Create payment request that requires admin approval
      const paymentData = {
        plan: plan.id,
        planName: plan.name,
        amount: plan.price[billingCycle],
        billingCycle,
        currency: 'BDT',
        status: 'pending_approval',
        userRole: user.role,
        paymentMethod: 'bank_transfer' // Default for Bangladesh
      };

      await paymentsAPI.create(paymentData);

      Alert.alert(
        'Subscription Request Submitted!',
        `Your subscription request for ${plan.name} (${billingCycle}) has been submitted for admin approval. You will receive an email with payment instructions once approved.\n\nAmount: ৳${plan.price[billingCycle]} BDT`,
        [
          {
            text: 'View Requests',
            onPress: () => navigation.navigate('MyPayments')
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Request subscription error:', error);
      const message = error?.response?.data?.message || 'Failed to submit subscription request';
      Alert.alert('Error', message);
    } finally {
      setRequesting(false);
      setSelectedPlan(null);
    }
  };

  const getPlansForUser = () => {
    const userRole = user?.role || 'student';
    return subscriptionPlans[userRole] || subscriptionPlans.student;
  };

  const formatPrice = (price) => {
    return `৳${price}`;
  };

  const renderPlanCard = (plan, index) => {
    const isCurrentPlan = currentSubscription?.plan === plan.id;
    const isRequesting = requesting && selectedPlan === plan.id;
    
    return (
      <Animated.View
        key={plan.id}
        style={[
          styles.planCard,
          { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' },
          plan.popular && styles.popularCard,
          isCurrentPlan && styles.currentPlanCard,
          { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
        ]}
      >
        {plan.popular && (
          <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={[styles.planName, { color: theme === 'light' ? '#1e293b' : 'white' }]}>{plan.name}</Text>
          <Text style={[styles.planNameBn, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>{plan.namebn}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: plan.color }]}>
              {formatPrice(plan.price[billingCycle])}
            </Text>
            <Text style={[styles.pricePeriod, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>/{billingCycle === 'monthly' ? 'month' : 'year'}</Text>
          </View>
          
          {billingCycle === 'yearly' && (
            <Text style={styles.yearlyDiscount}>
              Save {formatPrice((plan.price.monthly * 12) - plan.price.yearly)} per year!
            </Text>
          )}
        </View>

        <View style={styles.featuresList}>
          {plan.features.map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={plan.color} />
              <Text style={[styles.featureText, { color: theme === 'light' ? '#374151' : 'white' }]}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: plan.color },
            isCurrentPlan && styles.currentPlanButton,
            isRequesting && styles.requestingButton
          ]}
          onPress={() => !isCurrentPlan && requestSubscription(plan)}
          disabled={isCurrentPlan || isRequesting}
        >
          {isRequesting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={[styles.subscribeButtonText, isCurrentPlan && styles.currentPlanButtonText]}>
              {isCurrentPlan ? 'Current Plan' : 'Request Approval'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'light' ? '#f8fafc' : '#121212' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={[styles.loadingText, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>Loading subscription plans...</Text>
      </View>
    );
  }

  const plansToShow = getPlansForUser();

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#f8fafc' : '#121212' }]}>
      <LinearGradient
        colors={theme === 'light' ? ['#4F46E5', '#7C3AED', '#EC4899'] : ['#222','#555']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
          <Text style={styles.headerSubtitle}>
            Unlock the full potential of QuizCraft
          </Text>
          
          {currentSubscription && (
            <View style={styles.currentSubContainer}>
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.currentSubText}>
                Current: {currentSubscription.planName || currentSubscription.plan}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggleContainer}>
          <Text style={[styles.billingToggleLabel, { color: theme === 'light' ? '#1e293b' : 'white' }]}>Billing Cycle</Text>
          <View style={[styles.billingToggle, { backgroundColor: theme === 'light' ? '#e2e8f0' : '#272727' }]}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'monthly' && (theme === 'light' ? styles.billingOptionActive : styles.billingOptionActiveDark)
              ]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[
                styles.billingOptionText,
                { color: theme === 'light' ? '#64748b' : '#9CA3AF' },
                billingCycle === 'monthly' && styles.billingOptionTextActive
              ]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'yearly' && (theme === 'light' ? styles.billingOptionActive : styles.billingOptionActiveDark)
              ]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[
                styles.billingOptionText,
                { color: theme === 'light' ? '#64748b' : '#9CA3AF' },
                billingCycle === 'yearly' && styles.billingOptionTextActive
              ]}>Yearly</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save 17%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans List */}
        <View style={styles.plansContainer}>
          {plansToShow.map((plan, index) => renderPlanCard(plan, index))}
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <View style={[styles.infoCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            <Text style={[styles.infoTitle, { color: theme === 'light' ? '#1e293b' : 'white' }]}>Admin Approval Required</Text>
            <Text style={[styles.infoDescription, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>
              All subscription requests require admin approval. You'll receive payment instructions via email once approved.
            </Text>
          </View>
          
          <View style={[styles.infoCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            <Ionicons name="card" size={24} color="#F59E0B" />
            <Text style={[styles.infoTitle, { color: theme === 'light' ? '#1e293b' : 'white' }]}>Payment Methods</Text>
            <Text style={[styles.infoDescription, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>
              We accept bank transfers, bKash, Nagad, and other mobile banking services popular in Bangladesh.
            </Text>
          </View>
          
          <View style={[styles.infoCard, { backgroundColor: theme === 'light' ? 'white' : '#1e1e1e' }]}>
            <Ionicons name="headset" size={24} color="#8B5CF6" />
            <Text style={[styles.infoTitle, { color: theme === 'light' ? '#1e293b' : 'white' }]}>Need Help?</Text>
            <Text style={[styles.infoDescription, { color: theme === 'light' ? '#64748b' : '#9CA3AF' }]}>
              Contact our support team for assistance with plan selection or payment processes.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Poppins-Medium',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  currentSubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currentSubText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  billingToggleContainer: {
    padding: 20,
    alignItems: 'center',
  },
  billingToggleLabel: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e293b',
    marginBottom: 12,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  billingOption: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    position: 'relative',
  },
  billingOptionActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billingOptionActiveDark: {
    backgroundColor: '#4F46E5',
  },
  billingOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#64748b',
  },
  billingOptionTextActive: {
    color: '#1e293b',
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: 'white',
  },
  plansContainer: {
    paddingHorizontal: 20,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  popularCard: {
    borderWidth: 2,
    borderColor: '#4F46E5',
    transform: [{ scale: 1.02 }],
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#f0fdf4',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  planNameBn: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#64748b',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
  },
  pricePeriod: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#64748b',
    marginLeft: 4,
  },
  yearlyDiscount: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#10B981',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#374151',
    marginLeft: 12,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  currentPlanButton: {
    backgroundColor: '#10B981',
  },
  requestingButton: {
    opacity: 0.8,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  currentPlanButtonText: {
    color: 'white',
  },
  footerInfo: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    textAlign: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
