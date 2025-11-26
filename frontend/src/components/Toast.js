import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

let toastRef = null;

class ToastComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isVisible: false,
      message: '',
      type: 'info', // 'success', 'error', 'warning', 'info'
      duration: 3000,
    };

    this.fadeAnim = new Animated.Value(0);
    this.translateYAnim = new Animated.Value(-100);
    this.scaleAnim = new Animated.Value(0.8);
    this.timeout = null;
  }

  componentDidMount() {
    toastRef = this;
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  show = (message, type = 'info', duration = 3000) => {
    this.setState({
      isVisible: true,
      message,
      type,
      duration,
    });

    // Reset animations
    this.fadeAnim.setValue(0);
    this.translateYAnim.setValue(-100);
    this.scaleAnim.setValue(0.8);

    // Start entrance animation
    Animated.parallel([
      Animated.timing(this.fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(this.translateYAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(this.scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    this.timeout = setTimeout(() => {
      this.hide();
    }, duration);
  };

  hide = () => {
    Animated.parallel([
      Animated.timing(this.fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(this.translateYAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(this.scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      this.setState({ isVisible: false });
    });
  };

  getToastConfig = () => {
    const { type } = this.state;
    
    const configs = {
      success: {
        backgroundColor: '#10B981',
        icon: 'checkmark-circle',
        textColor: '#FFFFFF',
      },
      error: {
        backgroundColor: '#EF4444',
        icon: 'close-circle',
        textColor: '#FFFFFF',
      },
      warning: {
        backgroundColor: '#F59E0B',
        icon: 'warning',
        textColor: '#FFFFFF',
      },
      info: {
        backgroundColor: '#3B82F6',
        icon: 'information-circle',
        textColor: '#FFFFFF',
      },
    };

    return configs[type] || configs.info;
  };

  render() {
    const { isVisible, message } = this.state;
    const config = this.getToastConfig();

    if (!isVisible) return null;

    return (
      <View style={styles.container} pointerEvents="none">
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: config.backgroundColor },
            {
              opacity: this.fadeAnim,
              transform: [
                { translateY: this.translateYAnim },
                { scale: this.scaleAnim }
              ],
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons 
              name={config.icon} 
              size={20} 
              color={config.textColor} 
              style={styles.icon}
            />
            <Text style={[styles.message, { color: config.textColor }]}>
              {message}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={this.hide}
            pointerEvents="box-only"
          >
            <Ionicons name="close" size={16} color={config.textColor} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
}

// Toast API
const Toast = {
  show: (message, type = 'info', duration = 3000) => {
    if (toastRef) {
      toastRef.show(message, type, duration);
    }
  },
  
  success: (message, duration = 3000) => {
    Toast.show(message, 'success', duration);
  },
  
  error: (message, duration = 3000) => {
    Toast.show(message, 'error', duration);
  },
  
  warning: (message, duration = 3000) => {
    Toast.show(message, 'warning', duration);
  },
  
  info: (message, duration = 3000) => {
    Toast.show(message, 'info', duration);
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: screenWidth - 40,
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    flex: 1,
    flexWrap: 'wrap',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

// Export both the component and the API
export default Toast;
export { ToastComponent };