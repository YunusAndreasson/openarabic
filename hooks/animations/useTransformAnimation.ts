import { useCallback, useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import type {
  WithTimingConfig,
  WithSpringConfig,
  BaseAnimationBuilder,
} from 'react-native-reanimated';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  ZoomIn,
  ZoomOut,
  SlideInRight,
  SlideInLeft,
  SlideOutRight,
  SlideOutLeft,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';

import { useScreenWidth } from '@/constants/layout';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import { handleError } from '@/utils/errorHandling';


import { TIMING_CONFIG } from './animationConfigs';
import type { SharedValue } from 'react-native-reanimated';

export type TransformType = 'rotate' | 'scale' | 'slide' | 'translateX' | 'translateY';
export type SlideDirection = 'left' | 'right';

export interface TransformAnimationOptions {
  /**
   * Type of transform animation
   * @default 'scale'
   */
  type?: TransformType;

  /**
   * Initial value for the animation
   * For scale: initial scale value (e.g., 0.95)
   * For slide: ignored (calculated based on direction)
   * @default 0.95 for scale
   */
  initialValue?: number;

  /**
   * Target value for the animation
   * For scale: target scale value (e.g., 1)
   * For slide: target position (usually 0)
   * @default 1 for scale, 0 for slide
   */
  targetValue?: number;

  /**
   * Duration of animation in ms
   * @default TIMING_CONFIG.MEDIUM.duration
   */
  duration?: number;

  /**
   * Delay before animation starts in ms
   * @default 0
   */
  delay?: number;

  /**
   * Direction to slide from (only for slide type)
   * @default 'right'
   */
  direction?: SlideDirection;

  /**
   * Whether to use spring animation instead of timing
   * @default false for scale, true for slide
   */
  useSpring?: boolean;

  /**
   * Spring configuration overrides
   */
  damping?: number;
  stiffness?: number;

  /**
   * Spring configuration for withSpring
   */
  springConfig?: WithSpringConfig;

  /**
   * Timing configuration for withTiming
   */
  timingConfig?: WithTimingConfig;
}

interface TransformAnimationResult {
  /**
   * The shared value controlling the animation
   */
  value: SharedValue<number>;

  /**
   * Animated style to apply to the component
   */
  animatedStyle: AnimatedStyleProp<ViewStyle>;

  /**
   * Function to start the animation
   * @param onComplete - Optional callback when animation completes
   */
  startAnimation: (onComplete?: () => void) => void;

  /**
   * Function to reverse the animation
   * @param onComplete - Optional callback when animation completes
   */
  reverseAnimation: (onComplete?: () => void) => void;

  /**
   * Function to set the shared value directly with animation
   */
  setValue: (newValue: number, onComplete?: () => void) => void;

  /**
   * Function to reset to initial value
   */
  reset: () => void;

  /**
   * Built-in entering animation for Reanimated 3
   */
  entering: BaseAnimationBuilder;

  /**
   * Built-in exiting animation for Reanimated 3
   */
  exiting: BaseAnimationBuilder;

  /**
   * The transform property directly exposed for custom animations
   */
  transformType: TransformType;
}

/**
 * Unified hook for transform animations (scale, slide, etc.)
 * Combines functionality from useScaleAnimation and useSlideAnimation
 */
export const useTransformAnimation = (
  options: TransformAnimationOptions = {}
): TransformAnimationResult => {
  const {
    type = 'scale',
    initialValue = type === 'scale' ? 0.95 : 0,
    targetValue = type === 'scale' ? 1 : 0,
    duration = TIMING_CONFIG.MEDIUM.duration,
    delay = 0,
    direction = 'right',
    useSpring = type === 'slide',
    damping,
    stiffness,
  } = options;

  const screenWidth = useScreenWidth();

  // For slide animations, calculate the start position based on direction
  const startPosition = useMemo(
    () =>
      type === 'slide' ? (direction === 'right' ? screenWidth : -screenWidth) : initialValue,
    [type, direction, initialValue, screenWidth]
  );

  // Initialize the shared value
  const value = useSharedValue(startPosition);

  // Memoize animation configurations
  const springConfig = useMemo(
    () => ({
      damping: damping ?? 15,
      stiffness: stiffness ?? 120,
    }),
    [damping, stiffness]
  );

  const timingConfig = useMemo(
    () => ({
      duration,
      easing: TIMING_CONFIG.MEDIUM.easing,
    }),
    [duration]
  );

  // Create optimized entering and exiting animations based on transform type
  const { entering, exiting } = useMemo(() => {
    if (type === 'scale') {
      return {
        entering: ZoomIn.duration(duration).delay(delay).springify(),
        exiting: ZoomOut.duration(duration).springify(),
      };
    }
    return {
      entering:
        direction === 'right'
          ? SlideInRight.duration(duration).delay(delay).springify()
          : SlideInLeft.duration(duration).delay(delay).springify(),
      exiting:
        direction === 'right'
          ? SlideOutRight.duration(duration).springify()
          : SlideOutLeft.duration(duration).springify(),
    };
  }, [type, direction, duration, delay]);

  // Memoized animation completion handler
  const handleAnimationComplete = useCallback(
    (finished: boolean | undefined, onComplete?: () => void) => {
      'worklet';
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    },
    []
  );

  // Function to start the animation
  const startAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      try {
        // First cancel any running animations
        cancelAnimation(value);

        // Different animation based on type
        if (useSpring) {
          value.value = withSpring(targetValue, springConfig, finished =>
            handleAnimationComplete(finished, onComplete)
          );
        } else {
          value.value = withDelay(
            delay,
            withTiming(targetValue, timingConfig, finished =>
              handleAnimationComplete(finished, onComplete)
            )
          );
        }
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [value, targetValue, delay, useSpring, springConfig, timingConfig, handleAnimationComplete]
  );

  // Function to reverse the animation
  const reverseAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      try {
        // First cancel any running animations
        cancelAnimation(value);

        const reverseTarget = type === 'slide' ? startPosition : initialValue;

        if (useSpring) {
          value.value = withSpring(reverseTarget, springConfig, finished =>
            handleAnimationComplete(finished, onComplete)
          );
        } else {
          value.value = withTiming(reverseTarget, timingConfig, finished =>
            handleAnimationComplete(finished, onComplete)
          );
        }
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [
      value,
      initialValue,
      startPosition,
      type,
      useSpring,
      springConfig,
      timingConfig,
      handleAnimationComplete,
    ]
  );

  // Directly set the value with animation
  const setValue = useCallback(
    (newValue: number, onComplete?: () => void) => {
      'worklet';
      try {
        cancelAnimation(value);
        if (useSpring) {
          value.value = withSpring(newValue, springConfig, finished =>
            handleAnimationComplete(finished, onComplete)
          );
        } else {
          value.value = withTiming(newValue, timingConfig, finished =>
            handleAnimationComplete(finished, onComplete)
          );
        }
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [value, useSpring, springConfig, timingConfig, handleAnimationComplete]
  );

  // Reset function
  const reset = useCallback(() => {
    'worklet';
    cancelAnimation(value);
    value.value = startPosition;
  }, [value, startPosition]);

  // Create the appropriate animated style based on transform type
  const animatedStyle = useAnimatedStyle(() => {
    switch (type) {
      case 'scale':
        return { transform: [{ scale: value.value }] };
      case 'slide':
      case 'translateX':
        return { transform: [{ translateX: value.value }] };
      case 'translateY':
        return { transform: [{ translateY: value.value }] };
      case 'rotate':
        return { transform: [{ rotate: `${value.value}deg` }] };
      default:
        return { transform: [{ scale: value.value }] };
    }
  }, [type, value]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(value);
    };
  }, [value]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      value,
      animatedStyle,
      startAnimation,
      reverseAnimation,
      setValue,
      reset,
      entering,
      exiting,
      transformType: type,
    }),
    [value, animatedStyle, startAnimation, reverseAnimation, setValue, reset, entering, exiting, type]
  );
};
