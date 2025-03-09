import { Easing } from 'react-native-reanimated';

// Create default easing functions that are safe in test environments
const createDefaultEasing = () => {
  try {
    // Try to use Reanimated's Easing if available
    if (Easing && typeof Easing.out === 'function' && typeof Easing.quad === 'function') {
      return {
        quad: Easing.quad,
        cubic: Easing.cubic,
        bezier: Easing.bezier,
        out: Easing.out,
        inOut: Easing.inOut,
        in: Easing.in,
      };
    }
  } catch (e) {
    // Ignore errors
  }

  // Fallback implementation for tests
  const identity = (x: number) => x;
  const composableIdentity = (x: any) => identity;

  return {
    quad: identity,
    cubic: identity,
    bezier: () => identity,
    out: composableIdentity,
    inOut: composableIdentity,
    in: composableIdentity,
  };
};

// Safe easing functions for use in configurations
export const SafeEasing = createDefaultEasing();

/**
 * Standard timing configurations
 */
export const TIMING_CONFIG = {
  FAST: {
    duration: 150,
    easing: SafeEasing.out(SafeEasing.quad),
  },
  MEDIUM: {
    duration: 300,
    easing: SafeEasing.out(SafeEasing.cubic),
  },
  SLOW: {
    duration: 600,
    easing: SafeEasing.bezier(0.25, 0.1, 0.25, 1),
  },
};

/**
 * Standard spring configurations
 */
export const SPRING_CONFIG = {
  BUTTON: {
    damping: 15,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  CARD: {
    damping: 15,
    stiffness: 120,
    mass: 0.8,
    overshootClamping: false,
  },
  TOGGLE: {
    damping: 15,
    stiffness: 120,
    mass: 0.5,
    overshootClamping: false,
  },
  SLIDE: {
    damping: 20,
    stiffness: 100,
    mass: 0.8,
    overshootClamping: false,
  },
};
