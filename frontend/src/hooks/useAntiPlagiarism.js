import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Anti-Plagiarism Hook
 * Monitors app state, tab switching, and suspicious behavior during quiz attempts
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether monitoring is enabled
 * @param {number} options.maxViolations - Maximum violations before action (default: 3)
 * @param {Function} options.onViolation - Callback when violation occurs
 * @param {Function} options.onMaxViolations - Callback when max violations reached
 * @param {boolean} options.strictMode - Stricter monitoring (default: false)
 */
export const useAntiPlagiarism = ({
  enabled = true,
  maxViolations = 3,
  onViolation,
  onMaxViolations,
  strictMode = false,
} = {}) => {
  const [violations, setViolations] = useState([]);
  const [isAppActive, setIsAppActive] = useState(true);
  const [warningVisible, setWarningVisible] = useState(false);
  
  const appStateRef = useRef(AppState.currentState);
  const violationCountRef = useRef(0);
  const lastViolationTimeRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const isMonitoringRef = useRef(false);

  // Record a violation
  const recordViolation = useCallback((type, details = {}) => {
    if (!enabled || !isMonitoringRef.current) return;

    const now = Date.now();
    const timeSinceLastViolation = now - lastViolationTimeRef.current;
    
    // Prevent duplicate violations within 2 seconds
    if (timeSinceLastViolation < 2000 && violations.length > 0) {
      return;
    }

    const violation = {
      id: `${now}-${type}`,
      type,
      timestamp: now,
      timeFromStart: Math.floor((now - startTimeRef.current) / 1000),
      platform: Platform.OS,
      ...details,
    };

    violationCountRef.current += 1;
    lastViolationTimeRef.current = now;

    setViolations(prev => [...prev, violation]);
    setWarningVisible(true);

    // Call violation callback
    if (onViolation) {
      onViolation(violation, violationCountRef.current);
    }

    // Check if max violations reached
    if (violationCountRef.current >= maxViolations && onMaxViolations) {
      onMaxViolations(violations.concat(violation));
    }

    console.warn('🚨 Anti-Plagiarism Violation:', type, violation);
  }, [enabled, maxViolations, onViolation, onMaxViolations, violations]);

  // Mobile: AppState monitoring (app minimized/backgrounded)
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasActive = appStateRef.current === 'active';
      const isBecomingInactive = nextAppState === 'background' || nextAppState === 'inactive';

      if (wasActive && isBecomingInactive && isMonitoringRef.current) {
        recordViolation('APP_SWITCH', {
          previousState: appStateRef.current,
          newState: nextAppState,
          description: 'User switched away from the app',
        });
        setIsAppActive(false);
      } else if (!wasActive && nextAppState === 'active') {
        setIsAppActive(true);
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [enabled, recordViolation]);

  // Web: Page Visibility API (tab switching)
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;

    const handleVisibilityChange = () => {
      if (document.hidden && isMonitoringRef.current) {
        recordViolation('TAB_SWITCH', {
          description: 'User switched to another tab or window',
          visibilityState: document.visibilityState,
        });
        setIsAppActive(false);
      } else if (!document.hidden) {
        setIsAppActive(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, recordViolation]);

  // Web: Window blur/focus events (additional layer)
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || !strictMode) return;

    const handleBlur = () => {
      if (isMonitoringRef.current) {
        recordViolation('WINDOW_BLUR', {
          description: 'Browser window lost focus',
        });
      }
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, strictMode, recordViolation]);

  // Web: Right-click prevention (optional strict mode)
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || !strictMode) return;

    const handleContextMenu = (e) => {
      if (isMonitoringRef.current) {
        e.preventDefault();
        recordViolation('RIGHT_CLICK', {
          description: 'User attempted to open context menu',
        });
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, strictMode, recordViolation]);

  // Web: Copy/Paste detection
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;

    const handleCopy = () => {
      if (isMonitoringRef.current) {
        recordViolation('COPY_ATTEMPT', {
          description: 'User attempted to copy text',
        });
      }
    };

    const handlePaste = () => {
      if (isMonitoringRef.current) {
        recordViolation('PASTE_ATTEMPT', {
          description: 'User attempted to paste text',
        });
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, recordViolation]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    isMonitoringRef.current = true;
    startTimeRef.current = Date.now();
    console.log('✅ Anti-Plagiarism monitoring started');
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    console.log('⏹️ Anti-Plagiarism monitoring stopped');
  }, []);

  // Reset violations
  const resetViolations = useCallback(() => {
    setViolations([]);
    violationCountRef.current = 0;
    lastViolationTimeRef.current = 0;
    setWarningVisible(false);
  }, []);

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setWarningVisible(false);
  }, []);

  // Get violation summary
  const getViolationSummary = useCallback(() => {
    const summary = {
      total: violations.length,
      byType: {},
      timestamps: violations.map(v => v.timestamp),
    };

    violations.forEach(v => {
      summary.byType[v.type] = (summary.byType[v.type] || 0) + 1;
    });

    return summary;
  }, [violations]);

  return {
    violations,
    violationCount: violationCountRef.current,
    isAppActive,
    warningVisible,
    isMonitoring: isMonitoringRef.current,
    maxViolations,
    isMaxViolationsReached: violationCountRef.current >= maxViolations,
    startMonitoring,
    stopMonitoring,
    resetViolations,
    dismissWarning,
    recordViolation,
    getViolationSummary,
  };
};

export default useAntiPlagiarism;
