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
    // Log error but continue with fallbacks
    console.warn('Failed to load Reanimated easing functions, using fallbacks:', e);
  }

  console.info('Using fallback animation easings - animations may not be smooth');

  // Fallback implementation for tests
  // These properly type and implement easing functions that return proper easing functions
  const identity = (x: number) => x;

  // Correctly typed composable functions that return an easing function
  const composableOut = (easingFn: (t: number) => number) => (t: number) => {
    return 1 - easingFn(1 - t);
  };

  const composableIn = (easingFn: (t: number) => number) => (t: number) => {
    return easingFn(t);
  };

  const composableInOut = (easingFn: (t: number) => number) => (t: number) => {
    return t < 0.5 ? easingFn(t * 2) / 2 : 1 - easingFn((1 - t) * 2) / 2;
  };

  const quadFallback = (t: number) => t * t;
  const cubicFallback = (t: number) => t * t * t;
  const bezierFallback = (x1: number, y1: number, x2: number, y2: number) => {
    return (t: number) => {
      // Very basic bezier implementation, not accurate but safe for testing
      return t;
    };
  };

  return {
    quad: quadFallback,
    cubic: cubicFallback,
    bezier: bezierFallback,
    out: composableOut,
    inOut: composableInOut,
    in: composableIn,
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
