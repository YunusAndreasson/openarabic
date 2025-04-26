import { Easing } from 'react-native-reanimated';

/**
 * Standard timing configurations
 */
export const TIMING_CONFIG = {
  FAST: {
    duration: 50,
    easing: Easing.out(Easing.quad),
  },
  MEDIUM: {
    duration: 80,
    easing: Easing.out(Easing.cubic),
  },
  SLOW: {
    duration: 120,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  GENTLE: {
    duration: 300,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
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
