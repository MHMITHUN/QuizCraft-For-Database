import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { I18nProvider } from './src/i18n';
import { Ionicons } from '@expo/vector-icons';
import WebResponsiveWrapper from './src/components/WebResponsiveWrapper';
import { ToastComponent } from './src/components/Toast';
import { ThemeProvider } from './src/context/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
import GuestTrialBanner from './src/components/GuestTrialBanner';
import { navigationRef } from './src/utils/navigationRef';

// Import web styles for better responsive design (web only)
if (Platform.OS === 'web') {
  try {
    require('./src/styles/web.css');
  } catch (e) {
    console.warn('Web styles not loaded:', e);
  }
}

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from './src/screens/auth/VerifyEmailScreen';
import AdminVerificationScreen from './src/screens/auth/AdminVerificationScreen';
import AdminLoginScreen from './src/screens/auth/AdminLoginScreen';

// Main Screens
import HomeScreen from './src/screens/main/HomeScreen';
import UploadScreen from './src/screens/main/UploadScreen';
import SearchScreen from './src/screens/main/SearchScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';

// Quiz Screens
import QuizDetailScreen from './src/screens/quiz/QuizDetailScreen';
import TakeQuizScreen from './src/screens/quiz/TakeQuizScreen';
import QuizResultScreen from './src/screens/quiz/QuizResultScreen';
import MyQuizzesScreen from './src/screens/quiz/MyQuizzesScreen';

// Analytics & History
import HistoryScreen from './src/screens/analytics/HistoryScreen';
import LeaderboardScreen from './src/screens/analytics/LeaderboardScreen';
import StatsScreen from './src/screens/analytics/StatsScreen';

// Admin
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function MainTabs() {
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme === 'light' ? '#4F46E5' : '#A5B4FC',
        tabBarInactiveTintColor: theme === 'light' ? 'gray' : '#9CA3AF',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          width: isWeb ? '100%' : 'auto',
          backgroundColor: theme === 'light' ? '#fff' : '#1e1e1e',
          borderTopWidth: 1,
          borderTopColor: theme === 'light' ? '#e5e5e5' : '#272727'
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator key="auth-stack" screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} />
    </Stack.Navigator>
  );
}

// Role-based Screen Wrapper
const RoleProtectedScreen = ({ component: Component, allowedRoles, ...props }) => {
  const RoleGuard = require('./src/components/RoleGuard').default;

  return (screenProps) => (
    <RoleGuard allowedRoles={allowedRoles} navigation={screenProps.navigation} showUpgrade>
      <Component {...screenProps} {...props} />
    </RoleGuard>
  );
};

// Main App Stack
function AppStack() {
  const { user } = useAuth();

  // Don't render until we have a user
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const initial = user.role === 'admin'
    ? 'AdminDashboard'
    : user.role === 'teacher'
      ? 'TeacherDashboard'
      : 'MainTabs';

  return (
    <Stack.Navigator
      key={`app-stack-${user.role || 'default'}`}
      initialRouteName={initial}
      screenOptions={{ headerShown: true }}
    >
      {/* Public screens available to all users */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuizDetail"
        component={QuizDetailScreen}
        options={{ title: 'Quiz Details' }}
      />
      <Stack.Screen
        name="TakeQuiz"
        component={TakeQuizScreen}
        options={{ title: 'Take Quiz', headerShown: false }}
      />
      <Stack.Screen
        name="QuizResult"
        component={QuizResultScreen}
        options={{ title: 'Results', headerLeft: null }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: 'Leaderboard' }}
      />

      {/* Authenticated user screens */}
      <Stack.Screen
        name="MyQuizzes"
        component={MyQuizzesScreen}
        options={{ title: 'My Quizzes' }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Quiz History' }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: 'My Statistics' }}
      />
      <Stack.Screen
        name="Subscription"
        component={require('./src/screens/billing/SubscriptionScreen').default}
        options={{ title: 'Subscription' }}
      />
      <Stack.Screen
        name="MyPayments"
        component={require('./src/screens/billing/MyPaymentsScreen').default}
        options={{ title: 'My Payments' }}
      />

      {/* Auth screens accessible from app for re-login */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Login', headerShown: false }}
      />
      {/* Include these auth screens as well so navigation works from anywhere */}
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: 'Sign Up', headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot Password', headerShown: false }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ title: 'Verify Email', headerShown: false }}
      />
      <Stack.Screen
        name="AdminLogin"
        component={AdminLoginScreen}
        options={{ title: 'Admin Login', headerShown: false }}
      />
      <Stack.Screen
        name="AdminVerification"
        component={AdminVerificationScreen}
        options={{ title: 'Admin Verification', headerShown: false }}
      />

      {/* Student-specific screens */}
      <Stack.Screen
        name="JoinClass"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/JoinClassScreen').default,
          allowedRoles: ['student']
        })}
        options={{ title: 'Join Class' }}
      />

      {/* Teacher-specific screens */}
      <Stack.Screen
        name="TeacherDashboard"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/TeacherDashboardScreen').default,
          allowedRoles: ['teacher', 'admin']
        })}
        options={{ title: 'Teacher Dashboard' }}
      />
      <Stack.Screen
        name="ClassDetail"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/ClassDetailScreen').default,
          allowedRoles: ['teacher', 'admin', 'student']
        })}
        options={{ title: 'Class Details' }}
      />
      <Stack.Screen
        name="StudentProgress"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/StudentProgressScreen').default,
          allowedRoles: ['teacher', 'admin']
        })}
        options={{ title: 'Student Progress', headerShown: false }}
      />
      <Stack.Screen
        name="QuizAnalytics"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/QuizAnalyticsScreen').default,
          allowedRoles: ['teacher', 'admin']
        })}
        options={{ title: 'Quiz Analytics', headerShown: false }}
      />
      <Stack.Screen
        name="AdvancedReports"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/AdvancedReportsScreen').default,
          allowedRoles: ['teacher', 'admin']
        })}
        options={{ title: 'Advanced Reports', headerShown: false }}
      />
      <Stack.Screen
        name="Gradebook"
        component={RoleProtectedScreen({
          component: require('./src/screens/teacher/GradebookScreen').default,
          allowedRoles: ['teacher', 'admin']
        })}
        options={{ title: 'Gradebook', headerShown: false }}
      />

      {/* Admin-specific screens */}
      <Stack.Screen
        name="AdminDashboard"
        component={RoleProtectedScreen({
          component: AdminDashboardScreen,
          allowedRoles: ['admin']
        })}
        options={{ title: 'Admin Dashboard' }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={RoleProtectedScreen({
          component: require('./src/screens/admin/AdminUsersScreen').default,
          allowedRoles: ['admin']
        })}
        options={{ title: 'User Management' }}
      />
      <Stack.Screen
        name="AdminQuizzes"
        component={RoleProtectedScreen({
          component: require('./src/screens/admin/AdminQuizzesScreen').default,
          allowedRoles: ['admin']
        })}
        options={{ title: 'Quiz Management' }}
      />
      <Stack.Screen
        name="AdminPayments"
        component={RoleProtectedScreen({
          component: require('./src/screens/admin/AdminPaymentsScreen').default,
          allowedRoles: ['admin']
        })}
        options={{ title: 'Payment Management' }}
      />
      <Stack.Screen
        name="AdminSettings"
        component={RoleProtectedScreen({
          component: require('./src/screens/admin/AdminSettingsScreen').default,
          allowedRoles: ['admin']
        })}
        options={{ title: 'System Settings' }}
      />
    </Stack.Navigator>
  );
}

// Root Navigation
function RootNavigator() {
  const { user, initializing } = useAuth();
  const [renderDelay, setRenderDelay] = React.useState(true);

  // Small delay to ensure navigation container is mounted
  React.useEffect(() => {
    const timer = setTimeout(() => setRenderDelay(false), 50);
    return () => clearTimeout(timer);
  }, []);

  if (initializing || renderDelay) {
    // Show a proper loading screen only during app boot
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#6B7280' }}>Loading QuizCraft...</Text>
      </View>
    );
  }

  return user ? <AppStack key="app" /> : <AuthStack key="auth" />;
}

export default function App() {
  const isWeb = Platform.OS === 'web';

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const isWeb = Platform.OS === 'web';
  const { theme } = useTheme();
  const [navReady, setNavReady] = React.useState(false);

  const lightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#f8fafc',
      text: '#000000',
      card: '#ffffff',
      border: '#e5e5e5',
    },
  };

  const darkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#121212',
      text: '#ffffff',
      card: '#1e1e1e',
      border: '#272727',
    },
  };

  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return (
    <WebResponsiveWrapper>
      <I18nProvider>
        <AuthProvider>
          <NavigationContainer
            theme={currentTheme}
            ref={navigationRef}
            onReady={() => setNavReady(true)}
          >
            <NavigationStateHandler navigationRef={navigationRef} navReady={navReady} />
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
            <View style={{
              flex: 1,
              minHeight: isWeb ? '100vh' : 'auto',
              width: isWeb ? '100vw' : 'auto'
            }}>
              <GuestTrialBanner />
              <View style={{ flex: 1 }}>
                <RootNavigator />
              </View>
              <ToastComponent />
            </View>
          </NavigationContainer>
        </AuthProvider>
      </I18nProvider>
    </WebResponsiveWrapper>
  );
}

function NavigationStateHandler({ navigationRef, navReady }) {
  const { user, initializing } = useAuth();
  const previousRoleRef = React.useRef(null);
  const wasAuthenticatedRef = React.useRef(false);
  const hasNavigatedRef = React.useRef(false);

  React.useEffect(() => {
    const scheduleReset = (routeName, attempt = 0, delay = 100) => {
      setTimeout(() => {
        if (!navigationRef.isReady()) {
          if (attempt < 8) {
            scheduleReset(routeName, attempt + 1, 150);
          }
          return;
        }

        const routeNames = navigationRef.getRootState?.()?.routeNames ?? [];
        if (!routeNames.includes(routeName)) {
          if (attempt < 8) {
            scheduleReset(routeName, attempt + 1, 150);
          } else {
            console.warn(`[NavigationStateHandler] Route "${routeName}" not available after authentication transition.`);
          }
          return;
        }

        navigationRef.reset({
          index: 0,
          routes: [{ name: routeName }],
        });
        hasNavigatedRef.current = true;
      }, delay);
    };

    // Wait until navigation is ready AND auth is done initializing
    if (!navReady || initializing) {
      return;
    }

    // Additional check: ensure navigationRef is actually ready
    if (!navigationRef.isReady()) {
      return;
    }

    const isAuthenticated = !!user;
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    const targetRoute = getTargetRouteForUser(user);

    // Don't navigate if we're already where we need to be
    if (currentRoute === targetRoute && hasNavigatedRef.current) {
      return;
    }

    if (isAuthenticated) {
      const roleChanged = previousRoleRef.current !== null && previousRoleRef.current !== user?.role;
      const cameFromAuthFlow = !currentRoute || AUTH_FLOW_ROUTES.has(currentRoute);

      if (roleChanged || cameFromAuthFlow || currentRoute !== targetRoute) {
        scheduleReset(targetRoute);
      }
    } else {
      // Only navigate to Welcome if user was authenticated or we're not already there
      if ((wasAuthenticatedRef.current && currentRoute !== 'Welcome') || (!hasNavigatedRef.current && currentRoute !== targetRoute)) {
        scheduleReset(targetRoute);
      }
    }

    previousRoleRef.current = user?.role ?? null;
    wasAuthenticatedRef.current = isAuthenticated;
  }, [user, navReady, initializing, navigationRef]);

  return null;
}

const AUTH_FLOW_ROUTES = new Set([
  'Welcome',
  'Login',
  'Signup',
  'ForgotPassword',
  'VerifyEmail',
  'AdminLogin',
  'AdminVerification',
]);

function getTargetRouteForUser(user) {
  if (!user) {
    return 'Welcome';
  }

  switch (user.role) {
    case 'admin':
      return 'AdminDashboard';
    case 'teacher':
      return 'TeacherDashboard';
    default:
      return 'MainTabs';
  }
}
