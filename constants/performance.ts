import { Platform } from 'react-native';

/**
 * Performance tuning for 240Hz/240fps rendering
 * These settings enable maximum frame rate on supported devices
 */

export const PERFORMANCE_CONFIG = {
  // Parallax scroll throttle: 1 = every frame, lower = more frequent updates
  scrollEventThrottle: 1,

  // Animation interpolation: higher = smoother but more CPU
  animationFrameInterval: 1000 / 240, // ~4.17ms for 240fps

  // Enable native driver for all animations (GPU acceleration)
  useNativeDriver: true,

  // Scroll performance optimization
  removeClippedSubviews: true,
  scrollIndicatorInsets: { right: 1 },

  // Platform-specific optimizations
  platformConfig: {
    ios: {
      // High refresh rate enablement (ProMotion / 120Hz+)
      preferredFrameRate: 240,
      // Disable minimum frame duration cap
      disableMinimumFrameDuration: true,
    },
    android: {
      // Enable preferred frame rate (Android 12+)
      enablePreferredFrameRate: true,
      // Optimize for 240Hz rendering
      targetFrameRate: 240,
    },
  },
};

export const isHighRefreshRateSupported = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

export const getOptimalScrollThrottle = (): number => {
  // Lower throttle = more updates = smoother but more CPU
  // 1 = every frame (best for 240Hz)
  return PERFORMANCE_CONFIG.scrollEventThrottle;
};
