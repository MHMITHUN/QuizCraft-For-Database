import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

/**
 * RoleGuard Component
 * 
 * Provides role-based access control for screens and components.
 * Shows an appropriate message if user doesn't have required permissions.
 * 
 * Props:
 * - allowedRoles: array of roles that can access this content
 * - fallbackMessage: custom message to show when access is denied
 * - showUpgrade: whether to show upgrade option for students/teachers
 * - onUpgrade: callback for upgrade action
 * - redirectTo: screen to redirect to if access denied
 * - navigation: navigation prop for redirecting
 */

const RoleGuard = ({
  children,
  allowedRoles = [],
  fallbackMessage,
  showUpgrade = false,
  onUpgrade,
  redirectTo,
  navigation,
  requireSubscription = false,
  minSubscriptionPlan = null
}) => {
  const { user } = useAuth();

  // Check if user exists
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.messageBox}
        >
          <Ionicons name="person-circle-outline" size={48} color="white" />
          <Text style={styles.title}>Authentication Required</Text>
          <Text style={styles.message}>
            Please log in to access this feature.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  // Check role permissions
  const hasRoleAccess = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  
  // Check subscription requirements
  let hasSubscriptionAccess = true;
  if (requireSubscription && user.role !== 'admin') {
    const userPlan = user.subscription?.plan || 'free';
    if (userPlan === 'free') {
      hasSubscriptionAccess = false;
    } else if (minSubscriptionPlan) {
      const planHierarchy = {
        'student_basic': 1,
        'student_premium': 2,
        'teacher_basic': 1,
        'teacher_premium': 2,
        'teacher_institutional': 3
      };
      
      const userPlanLevel = planHierarchy[userPlan] || 0;
      const requiredPlanLevel = planHierarchy[minSubscriptionPlan] || 0;
      hasSubscriptionAccess = userPlanLevel >= requiredPlanLevel;
    }
  }

  // If user has both role and subscription access, show content
  if (hasRoleAccess && hasSubscriptionAccess) {
    return children;
  }

  // Handle redirect if specified
  if (redirectTo && navigation) {
    navigation.replace(redirectTo);
    return null;
  }

  // Determine the type of access issue
  let title, message, icon, colors, actionText, actionHandler;

  if (!hasRoleAccess) {
    // Role access denied
    const roleDisplayNames = {
      admin: 'Administrator',
      teacher: 'Teacher',
      student: 'Student'
    };

    title = 'Access Restricted';
    message = fallbackMessage || 
      `This feature is only available to ${allowedRoles.map(r => roleDisplayNames[r] || r).join(', ')} users.`;
    icon = 'shield-outline';
    colors = ['#EF4444', '#DC2626'];

    if (showUpgrade && (user.role === 'student' || user.role === 'teacher')) {
      if (allowedRoles.includes('teacher') && user.role === 'student') {
        actionText = 'Become a Teacher';
        actionHandler = () => {
          if (navigation) {
            navigation.navigate('Profile', { requestRoleUpgrade: 'teacher' });
          }
        };
      }
    }
  } else if (!hasSubscriptionAccess) {
    // Subscription access denied
    title = 'Premium Feature';
    message = minSubscriptionPlan 
      ? `This feature requires ${minSubscriptionPlan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} subscription or higher.`
      : 'This feature is only available with a premium subscription.';
    icon = 'star-outline';
    colors = ['#F59E0B', '#D97706'];
    
    if (showUpgrade) {
      actionText = 'Upgrade Subscription';
      actionHandler = onUpgrade || (() => {
        if (navigation) {
          navigation.navigate('Subscription');
        }
      });
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors}
        style={styles.messageBox}
      >
        <Ionicons name={icon} size={48} color="white" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        
        {actionText && actionHandler && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={actionHandler}
          >
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

// Hook for checking permissions
export const useRolePermissions = () => {
  const { user } = useAuth();
  
  const hasRole = (allowedRoles) => {
    if (!user) return false;
    if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];
    return allowedRoles.length === 0 || allowedRoles.includes(user.role);
  };

  const hasSubscription = (minPlan = null) => {
    if (!user || user.role === 'admin') return true;
    
    const userPlan = user.subscription?.plan || 'free';
    if (userPlan === 'free') return false;
    
    if (!minPlan) return true;
    
    const planHierarchy = {
      'student_basic': 1,
      'student_premium': 2,
      'teacher_basic': 1,
      'teacher_premium': 2,
      'teacher_institutional': 3
    };
    
    const userPlanLevel = planHierarchy[userPlan] || 0;
    const requiredPlanLevel = planHierarchy[minPlan] || 0;
    return userPlanLevel >= requiredPlanLevel;
  };

  const canAccessFeature = (allowedRoles, requireSubscription = false, minSubscriptionPlan = null) => {
    const roleAccess = hasRole(allowedRoles);
    const subscriptionAccess = requireSubscription ? hasSubscription(minSubscriptionPlan) : true;
    return roleAccess && subscriptionAccess;
  };

  return {
    user,
    hasRole,
    hasSubscription,
    canAccessFeature,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    isPremium: user?.subscription?.plan !== 'free' && user?.subscription?.plan
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  messageBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
});

export default RoleGuard;