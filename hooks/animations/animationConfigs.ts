import { handleError } from '@/utils/errorHandling';
import { Easing } from 'react-native-reanimated';

// Create easing functions with fallbacks for environments without Reanimated
const createDefaultEasing = () => {
  try {
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
    handleError(e instanceof Error ? e : String(e));
    // Use fallback implementations
  }

  // Fallback implementations
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
  const bezierFallback = (_x1: number, _y1: number, _x2: number, _y2: number) => {
    return (t: number) => t;
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
    duration: 50,
    easing: SafeEasing.out(SafeEasing.quad),
  },
  MEDIUM: {
    duration: 80,
    easing: SafeEasing.out(SafeEasing.cubic),
  },
  SLOW: {
    duration: 120,
    easing: SafeEasing.bezier(0.25, 0.1, 0.25, 1),
  },
  GENTLE: {
    duration: 300,
    easing: SafeEasing.bezier(0.4, 0.0, 0.2, 1),
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
