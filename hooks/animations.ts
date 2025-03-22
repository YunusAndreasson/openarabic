import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

interface TransformAnimationOptions {
  type?: 'slide' | 'scale';
  initialValue?: number;
  useSpring?: boolean;
}

interface OpacityAnimationOptions {
  initialOpacity?: number;
  duration?: number;
  delay?: number;
}

// Animation configuration
const SPRING_CONFIG = {
  damping: 20,
  mass: 1,
  stiffness: 200,
};

const TIMING_CONFIG = {
  FAST: {
    duration: 150,
    easing: (x: number) => x,
  },
  MEDIUM: {
    duration: 300,
    easing: (x: number) => x,
  },
};

export function useTransformAnimation({
  type = 'slide',
  initialValue = 0,
  useSpring = false,
}: TransformAnimationOptions) {
  console.log('[Animation Hook] Initializing transform animation', {
    type,
    initialValue,
    useSpring,
  });

  const value = useSharedValue(initialValue);

  const animatedStyle = useAnimatedStyle(() => {
    const transform = [];
    if (type === 'slide') {
      transform.push({ translateX: value.value });
    } else if (type === 'scale') {
      transform.push({ scale: value.value });
    }
    return { transform };
  }, [type]);

  const reset = useCallback(() => {
    console.log('[Animation Hook] Resetting transform', {
      type,
      initialValue,
    });
    if (useSpring) {
      value.value = withSpring(initialValue, SPRING_CONFIG);
    } else {
      value.value = withTiming(initialValue, TIMING_CONFIG.FAST);
    }
  }, [value, initialValue, useSpring]);

  return { value, animatedStyle, reset };
}

export function useOpacityAnimation({
  initialOpacity = 1,
  duration = TIMING_CONFIG.FAST.duration,
  delay = 0,
}: OpacityAnimationOptions) {
  console.log('[Animation Hook] Initializing opacity animation', {
    initialOpacity,
    duration,
    delay,
  });

  const opacity = useSharedValue(initialOpacity);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  }, []);

  const setOpacity = useCallback(
    (value: number) => {
      console.log('[Animation Hook] Setting opacity', {
        currentValue: opacity.value,
        newValue: value,
        duration,
        delay,
      });
      opacity.value = withTiming(value, {
        duration,
        easing: TIMING_CONFIG.MEDIUM.easing,
      });
    },
    [opacity, duration]
  );

  const startAnimation = useCallback(() => {
    console.log('[Animation Hook] Starting opacity animation');
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: TIMING_CONFIG.MEDIUM.easing,
      })
    );
  }, [opacity, duration, delay]);

  const reverseAnimation = useCallback(() => {
    console.log('[Animation Hook] Reversing opacity animation');
    opacity.value = withDelay(
      delay,
      withTiming(0, {
        duration,
        easing: TIMING_CONFIG.MEDIUM.easing,
      })
    );
  }, [opacity, duration, delay]);

  return {
    opacity,
    animatedStyle,
    setOpacity,
    startAnimation,
    reverseAnimation,
  };
}
