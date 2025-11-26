import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QuizButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary', // primary, secondary, success, danger
  size = 'medium', // small, medium, large
  icon,
  iconPosition = 'left', // left, right
  style,
  textStyle,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
          borderWidth: 2,
          borderColor: disabled ? '#D1D5DB' : '#4F46E5',
        };
      case 'success':
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#10B981',
        };
      case 'danger':
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#EF4444',
        };
      default: // primary
        return {
          backgroundColor: disabled ? '#9CA3AF' : '#4F46E5',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingHorizontal: 40,
          paddingVertical: 20,
          minHeight: 60,
        };
      default: // medium
        return {
          paddingHorizontal: 24,
          paddingVertical: 12,
          minHeight: 48,
        };
    }
  };

  const getTextColor = () => {
    if (disabled) return '#9CA3AF';
    if (variant === 'secondary') return '#4F46E5';
    return '#FFFFFF';
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        Platform.OS === 'web' && styles.webButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={getTextColor()} 
          size={size === 'small' ? 'small' : 'small'} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons 
              name={icon} 
              size={getTextSize()} 
              color={getTextColor()} 
              style={styles.iconLeft} 
            />
          )}
          
          <Text 
            style={[
              styles.text,
              { 
                color: getTextColor(),
                fontSize: getTextSize(),
                fontWeight: size === 'large' ? 'bold' : '600'
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          
          {icon && iconPosition === 'right' && (
            <Ionicons 
              name={icon} 
              size={getTextSize()} 
              color={getTextColor()} 
              style={styles.iconRight} 
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
      }
    }),
  },
  webButton: {
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    },
    ':active': {
      transform: 'translateY(0) scale(0.98)',
    },
  },
  disabled: {
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
        opacity: 0.6,
      }
    }),
  },
  text: {
    textAlign: 'center',
    lineHeight: 20,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});