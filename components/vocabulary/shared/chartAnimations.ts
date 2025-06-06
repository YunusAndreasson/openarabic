import { useEffect } from 'react';
import { useSharedValue, withTiming, withSpring } from 'react-native-reanimated';

export interface ChartAnimationConfig {
  duration?: number;
  delay?: number;
  staggerDelay?: number;
}

/**
 * Standard animation configuration for vocabulary charts
 */
export const CHART_ANIMATIONS = {
  // Entrance animations
  FADE_IN: {
    duration: 400,
    delay: 0,
  },
  STAGGER_FADE_IN: {
    duration: 400,
    staggerDelay: 100,
  },

  // Interaction animations
  PRESS_SCALE: {
    pressed: 0.96,
    released: 1.0,
    config: { damping: 20, stiffness: 400 },
  },

  // Chart loading states
  CHART_LOAD: {
    duration: 500,
    delay: 300,
  },
} as const;

/**
 * Hook for standardized chart entrance animations
 */
export const useChartAnimation = (hasData: boolean, config: ChartAnimationConfig = {}) => {
  const opacity = useSharedValue(0);

  const animationConfig = {
    duration: config.duration ?? CHART_ANIMATIONS.FADE_IN.duration,
    delay: config.delay ?? CHART_ANIMATIONS.FADE_IN.delay,
  };

  useEffect(() => {
    if (hasData) {
      opacity.value = withTiming(1, {
        duration: animationConfig.duration,
      });
    } else {
      opacity.value = 0;
    }
  }, [hasData, opacity, animationConfig.duration]);

  return opacity;
};

/**
 * Hook for standardized press animations
 */
export const usePressAnimation = () => {
  const scale = useSharedValue(1);

  const pressIn = () => {
    scale.value = withSpring(
      CHART_ANIMATIONS.PRESS_SCALE.pressed,
      CHART_ANIMATIONS.PRESS_SCALE.config
    );
  };

  const pressOut = () => {
    scale.value = withSpring(
      CHART_ANIMATIONS.PRESS_SCALE.released,
      CHART_ANIMATIONS.PRESS_SCALE.config
    );
  };

  return { scale, pressIn, pressOut };
};

/**
 * Standard stagger animation delays for chart elements
 */
export const getStaggerDelay = (
  index: number,
  baseDelay: number = 0,
  staggerAmount: number = 100
) => {
  return baseDelay + index * staggerAmount;
};

/**
 * Animation presets for common chart transitions
 */
export const createFadeInAnimation = (delay: number = 0, duration: number = 400) => ({
  entering: `FadeInUp.delay(${delay}).duration(${duration})`,
});

/**
 * Shared animation values factory for complex charts
 */
export const createChartAnimationValues = () => ({
  opacity: useSharedValue(0),
  scale: useSharedValue(1),
  translateY: useSharedValue(20),
});

/**
 * Standard chart error state animation
 */
export const useErrorAnimation = (hasError: boolean) => {
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (hasError) {
      // Subtle shake animation for error states
      shakeX.value = withSpring(5, { damping: 8, stiffness: 100 });
      setTimeout(() => {
        shakeX.value = withSpring(0, { damping: 8, stiffness: 100 });
      }, 150);
    }
  }, [hasError, shakeX]);

  return shakeX;
};
