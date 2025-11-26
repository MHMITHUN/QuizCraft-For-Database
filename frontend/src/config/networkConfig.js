// Network Configuration Loader
// This file reads from the root .env file to get the current IP address

import Constants from 'expo-constants';

// Function to get the server IP from various sources
function getServerIP() {
  // 1st Priority: Expo config (set from root .env via app.config.js)
  if (Constants.expoConfig?.extra?.serverIP) {
    return Constants.expoConfig.extra.serverIP;
  }
  
  // 2nd Priority: Expo manifest (legacy support)  
  if (Constants.manifest?.extra?.serverIP) {
    return Constants.manifest.extra.serverIP;
  }
  
  // 3rd Priority: Try to get from environment
  if (Constants.expoConfig?.extra?.apiUrl) {
    const match = Constants.expoConfig.extra.apiUrl.match(/http:\/\/([^:]+):/);
    if (match) return match[1];
  }
  
  // Fallback: Default IP (you should update the root .env instead)
  console.warn('⚠️ Using fallback IP. Please check your root .env file!');
  return '127.0.0.1';
}

function getServerPort() {
  // Get port from config or use default
  return Constants.expoConfig?.extra?.serverPort || 
         Constants.manifest?.extra?.serverPort || 
         5000;
}

// Export configuration
export const SERVER_IP = getServerIP();
export const SERVER_PORT = getServerPort();
export const API_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;
export const API_HOST = `http://${SERVER_IP}:${SERVER_PORT}`;

// Debug logging
console.log('🌐 Network Configuration:');
console.log(`   Server IP: ${SERVER_IP}`);
console.log(`   Server Port: ${SERVER_PORT}`);
console.log(`   API URL: ${API_URL}`);