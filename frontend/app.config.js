// Load environment variables from root directory (safely)
try {
  require('dotenv').config({ path: '../.env' });
} catch (e) {
  console.warn('Environment variables not loaded:', e.message);
}

export default {
  expo: {
    name: "QuizCraft",
    slug: "quizcraft-mobile",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#667eea"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.quizcraft.mobile"
    },
    android: {
      package: "com.quizcraft.mobile",
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {},
    extra: {
      // These values come from the root .env file
      // Only change IP in the root .env file!
      serverIP: process.env.SERVER_IP || '192.168.203.153',
      serverPort: process.env.SERVER_PORT || '5000',
      apiUrl: `http://${process.env.SERVER_IP || '192.168.203.153'}:${process.env.SERVER_PORT || '5000'}/api`
    }
  }
};
