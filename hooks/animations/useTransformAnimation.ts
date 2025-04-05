import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import type {
  AnimatedStyleProp,
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

import { handleError } from '@/utils/errorHandling';

import { SCREEN_WIDTH } from '../../constants/layout';

import { TIMING_CONFIG } from './animationConfigs';
import type { SharedValue } from './types';

export type TransformType = 'scale' | 'slide' | 'translateY' | 'translateX' | 'rotate';
export type SlideDirection = 'right' | 'left';

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

  // For slide animations, calculate the start position based on direction
  const startPosition =
    type === 'slide' ? (direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH) : initialValue;

  // Initialize the shared value
  const value = useSharedValue(startPosition);

  // Create optimized entering and exiting animations based on transform type
  let entering: BaseAnimationBuilder;
  let exiting: BaseAnimationBuilder;

  if (type === 'scale') {
    entering = ZoomIn.duration(duration).delay(delay).springify();
    exiting = ZoomOut.duration(duration).springify();
  } else {
    entering =
      direction === 'right'
        ? SlideInRight.duration(duration).delay(delay).springify()
        : SlideInLeft.duration(duration).delay(delay).springify();

    exiting =
      direction === 'right'
        ? SlideOutRight.duration(duration).springify()
        : SlideOutLeft.duration(duration).springify();
  }

  // Function to start the animation
  const startAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      try {
        // First cancel any running animations
        cancelAnimation(value);

        // Different animation based on type
        if (useSpring) {
          // Use spring animation
          const springConfig = {
            damping: damping ?? 15,
            stiffness: stiffness ?? 120,
          };

          value.value = withSpring(targetValue, springConfig, finished => {
            if (finished && onComplete) {
              runOnJS(onComplete)();
            }
          });
        } else {
          // Use timing animation
          value.value = withDelay(
            delay,
            withTiming(
              targetValue,
              {
                duration,
                easing: TIMING_CONFIG.MEDIUM.easing,
              },
              finished => {
                if (finished && onComplete) {
                  runOnJS(onComplete)();
                }
              }
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
    [value, targetValue, duration, delay, useSpring, damping, stiffness]
  );

  // Function to reverse the animation
  const reverseAnimation = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      try {
        // First cancel any running animations
        cancelAnimation(value);

        if (useSpring) {
          // Use spring animation
          const springConfig = {
            damping: damping ?? 15,
            stiffness: stiffness ?? 120,
          };

          value.value = withSpring(
            type === 'slide' ? startPosition : initialValue,
            springConfig,
            finished => {
              if (finished && onComplete) {
                runOnJS(onComplete)();
              }
            }
          );
        } else {
          // Use timing animation
          value.value = withTiming(
            type === 'slide' ? startPosition : initialValue,
            {
              duration,
              easing: TIMING_CONFIG.MEDIUM.easing,
            },
            finished => {
              if (finished && onComplete) {
                runOnJS(onComplete)();
              }
            }
          );
        }
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    },
    [value, initialValue, startPosition, duration, type, useSpring, damping, stiffness]
  );

  // Reset function
  const reset = useCallback(() => {
    'worklet';
    value.value = startPosition;
  }, [value, startPosition]);

  // Create the appropriate animated style based on transform type
  const animatedStyle = useAnimatedStyle(() => {
    if (type === 'scale') {
      return {
        transform: [{ scale: value.value }],
      };
    } else {
      return {
        transform: [{ translateX: value.value }],
      };
    }
  });

  return {
    value,
    animatedStyle,
    startAnimation,
    reverseAnimation,
    reset,
    entering,
    exiting,
    transformType: type,
  };
};
