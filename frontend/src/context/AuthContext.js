import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { navigationRef } from '../utils/navigationRef';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const HOME_ROUTES_BY_ROLE = {
  admin: 'AdminDashboard',
  teacher: 'TeacherDashboard',
};

const getHomeRouteForRole = (role) => HOME_ROUTES_BY_ROLE[role] || 'MainTabs';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // loading = action-level loading (login/verify/etc), NOT app boot
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [admin2FAInProgress, setAdmin2FAInProgress] = useState(false);
  const guestTrialTimerRef = useRef(null);
  const guestTrialIntervalRef = useRef(null);
  const [guestTrialRemaining, setGuestTrialRemaining] = useState(null);

  const navigateToRoleHome = useCallback((role) => {
    const targetRoute = getHomeRouteForRole(role);

    const tryNavigate = (attempt = 0) => {
      if (!navigationRef.isReady()) {
        if (attempt < 8) {
          setTimeout(() => tryNavigate(attempt + 1), 150);
        } else {
          console.warn('[AuthContext] Navigation not ready after authentication. Skipping redirect.');
        }
        return;
      }

      const rootState = navigationRef.getRootState?.();
      const availableRoutes = rootState?.routeNames ?? [];

      if (!availableRoutes.includes(targetRoute)) {
        if (attempt < 8) {
          setTimeout(() => tryNavigate(attempt + 1), 150);
        } else {
          console.warn(`[AuthContext] Target route "${targetRoute}" not available in current navigator. Skipping redirect.`);
        }
        return;
      }

      const currentRouteName = navigationRef.getCurrentRoute()?.name;
      if (currentRouteName !== targetRoute) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      }
    };

    // Allow React Navigation time to mount the authenticated navigator before resetting
    setTimeout(() => tryNavigate(), 80);
  }, []);

  const loadUser = useCallback(async ({ autoNavigate = false } = {}) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getProfile();
          const fetchedUser = response.data.data.user;
          setUser(fetchedUser);
          if (autoNavigate && fetchedUser) {
            navigateToRoleHome(fetchedUser.role);
          }
        } catch (err) {
          // Token is invalid or expired
          console.error('Load user error:', err);
          await AsyncStorage.removeItem('token');
          setUser(null);
          // Don't set error state for expired tokens on startup - just silently log out
          if (err?.response?.status === 401) {
            console.log('[AuthContext] Token expired, user needs to log in again');
          } else {
            // Only set error for other types of errors
            if (err?.message && !err.message.includes('token')) {
              setError(err.message);
            }
          }
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Load user storage error:', err);
    } finally {
      setInitializing(false);
    }
  }, [navigateToRoleHome]);

  // Load user from storage on app start
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    try {
      console.log('[AuthContext] Login started for:', email);
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(email, password);
      console.log('[AuthContext] Login response:', JSON.stringify(response.data, null, 2));
      
      // Check if admin 2FA is required
      if (response.data.requiresAdminVerification) {
        console.log('[AuthContext] Admin 2FA detected');
        setAdmin2FAInProgress(true); // Mark that we're in 2FA flow
        setLoading(false);
        return { 
          success: true, 
          requiresAdminVerification: true,
          email: response.data.data.email,
          codeExpiresAt: response.data.data.codeExpiresAt,
          message: response.data.message
        };
      }
      
      const { user: responseUser, token } = response.data.data || {};
      if (token) {
        await AsyncStorage.setItem('token', String(token));
      } else {
        await AsyncStorage.removeItem('token');
      }
      let resolvedUser = responseUser;

      if (!resolvedUser) {
        try {
          const profileResponse = await authAPI.getProfile();
          resolvedUser = profileResponse.data?.data?.user ?? null;
        } catch (profileError) {
          console.error('[AuthContext] Failed to fetch profile after login:', profileError);
        }
      }

      if (!resolvedUser) {
        const fallbackMessage = 'Login succeeded but we could not load your profile. Please try again.';
        setError(fallbackMessage);
        await AsyncStorage.removeItem('token');
        return { success: false, error: fallbackMessage };
      }

      setUser(resolvedUser);
      setAdmin2FAInProgress(false);
      navigateToRoleHome(resolvedUser.role);
      
      return { success: true, user: resolvedUser };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminLogin = async (email, code) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.verifyAdminLogin(email, code);
      
      const { user: verifiedUser, token } = response.data.data || {};
      if (token) {
        await AsyncStorage.setItem('token', String(token));
      } else {
        await AsyncStorage.removeItem('token');
      }

      if (!verifiedUser) {
        await AsyncStorage.removeItem('token');
        const errorMsg = 'Verification succeeded but no user data was returned.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setUser(verifiedUser);
      setAdmin2FAInProgress(false); // Clear 2FA flag
      navigateToRoleHome(verifiedUser.role);
      
      return { success: true, user: verifiedUser };
    } catch (err) {
      const errorMsg = err.message || 'Verification failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'student') => {
    try {
      console.log('[AuthContext] Starting register...');
      setError(null);
      // DON'T set loading here to avoid re-renders
      
      const response = await authAPI.register(name, email, password, role);
      console.log('[AuthContext] Register response received');
      
      if (!response || !response.data || !response.data.data) {
        throw new Error('Invalid response from server');
      }
      
      const { user, token } = response.data.data || {};
      console.log('[AuthContext] User email:', user?.email, 'Verified?', user?.isEmailVerified);
      
      // DON'T change any state here - just return the result
      // Navigation will handle the flow
      
      console.log('[AuthContext] Register complete, success!');
      return { success: true, needsVerification: !user?.isEmailVerified, user };
    } catch (err) {
      console.error('[AuthContext] Register error:', err);
      console.error('[AuthContext] Error details:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = useCallback(async (message) => {
    try {
      await AsyncStorage.removeItem('token');
      setUser(null);
      setGuestTrialRemaining(null);
      setError(message || null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const guestAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.guestAccess();

      const { user: guestUser, token } = response.data.data || {};
      if (token) {
        await AsyncStorage.setItem('token', String(token));
      } else {
        await AsyncStorage.removeItem('token');
      }

      if (!guestUser) {
        await AsyncStorage.removeItem('token');
        const errorMsg = 'Guest access response did not include user data.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setUser(guestUser);
      navigateToRoleHome(guestUser.role);

      return { success: true, user: guestUser };
    } catch (err) {
      const errorMsg = err.message || 'Guest access failed';
      setError(errorMsg);
      console.error('Guest access error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clearExistingTimers = () => {
      if (guestTrialTimerRef.current) {
        clearTimeout(guestTrialTimerRef.current);
        guestTrialTimerRef.current = null;
      }
      if (guestTrialIntervalRef.current) {
        clearInterval(guestTrialIntervalRef.current);
        guestTrialIntervalRef.current = null;
      }
      setGuestTrialRemaining(null);
    };

    const scheduleGuestExpiry = () => {
      if (user?.role !== 'guest' || !user?.guestTrialExpiresAt) {
        setGuestTrialRemaining(null);
        return;
      }

      const expiresAt = new Date(user.guestTrialExpiresAt).getTime();
      if (!Number.isFinite(expiresAt)) {
        setGuestTrialRemaining(null);
        return;
      }

      const finishSession = () => {
        clearExistingTimers();
        logout('Your guest trial has ended. Please create an account to continue.')
          .catch((err) => console.error('Guest trial logout error:', err));
      };

      const tick = () => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          finishSession();
        } else {
          setGuestTrialRemaining(remaining);
        }
      };

      tick();

      guestTrialIntervalRef.current = setInterval(tick, 1000);

      const totalMs = expiresAt - Date.now();
      if (totalMs > 0) {
        guestTrialTimerRef.current = setTimeout(finishSession, totalMs);
      } else {
        finishSession();
      }
    };

    clearExistingTimers();
    scheduleGuestExpiry();

    return () => {
      clearExistingTimers();
    };
  }, [user, logout]);

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      setUser(response.data.data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const refreshUser = useCallback(() => loadUser({ autoNavigate: true }), [loadUser]);

  const value = {
    user,
    loading,
    initializing,
    error,
    admin2FAInProgress,
    login,
    register,
    logout,
    guestAccess,
    updateProfile,
    refreshUser,
    guestTrialRemaining,
    verifyAdminLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
