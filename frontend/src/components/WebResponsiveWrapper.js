import React from 'react';
import { View, Dimensions, Platform } from 'react-native';

const WebResponsiveWrapper = ({ children, style = {} }) => {
  const screenData = Dimensions.get('window');
  const isWeb = Platform.OS === 'web';
  
  // Platform-specific styles
  const platformStyles = isWeb ? {
    // Web-specific styles for full screen
    minHeight: '100vh',
    width: '100vw',
    maxWidth: '100vw',
    flex: 1,
    ...style
  } : {
    // Mobile-specific styles
    flex: 1,
    width: '100%',
    height: '100%',
    ...style
  };
  
  // Add web-specific props only for web
  const platformProps = isWeb ? {
    className: 'web-responsive-container'
  } : {};

  return (
    <View 
      style={[
        {
          flex: 1,
          backgroundColor: '#f8fafc',
        },
        platformStyles
      ]}
      {...platformProps}
    >
      {children}
    </View>
  );
};

export default WebResponsiveWrapper;
