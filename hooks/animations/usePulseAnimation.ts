import { useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { TIMING_CONFIG } from './animationConfigs';
import { SharedValue } from './types';

export type PulseStyle = 'standard' | 'dramatic';

export interface PulseAnimationOptions {
  /**
   * Style of pulse animation
   * - 'standard': Simple scale pulse
   * - 'dramatic': More complex pulse with opacity changes
   */
  style?: PulseStyle;

  /**
   * Maximum scale during pulse (default 1.1 for standard, 1.25 for dramatic)
   */
  pulseMagnitude?: number;

  /**
   * Whether to automatically start the animation on mount
   */
  autoStart?: boolean;
}

export interface PulseAnimationResult {
  /**
   * Shared value for scale animation
   */
  scale: SharedValue<number>;

  /**
   * Shared value for opacity animation (only used in dramatic style)
   */
  opacity: SharedValue<number>;

  /**
   * Animated style to apply to the component
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;

  /**
   * Function to trigger a single pulse
   */
  pulse: () => void;

  /**
   * Function to start continuous pulse animation
   */
  startAnimation: (repetitions?: number) => void;

  /**
   * Function to stop the animation
   */
  stopAnimation: () => void;
}

/**
 * Hook for creating pulse animation effects with different styles
 * @param options - Configuration options for the pulse animation
 * @returns Animation controls and style
 */
export const usePulseAnimation = (options: PulseAnimationOptions = {}): PulseAnimationResult => {
  const { style = 'standard', pulseMagnitude, autoStart = false } = options;

  // Set default magnitude based on style
  const defaultMagnitude = style === 'dramatic' ? 1.25 : 1.1;
  const magnitude = pulseMagnitude ?? defaultMagnitude;

  // Initial values based on style
  const initialScale = style === 'dramatic' ? 0.3 : 1;
  const initialOpacity = style === 'dramatic' ? 0.5 : 1;

  // Animation values - always create both shared values to avoid conditional hook calls
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(initialOpacity);

  // Interval ref to track animation loop for dramatic style
  const intervalRef = useRef<NodeJS.Timeout>();

  // Standard pulse function
  const standardPulse = useCallback(() => {
    'worklet';
    // Reset to initial state
    scale.value = 1;

    // Use withSequence for smoother animation
    scale.value = withSequence(
      // Grow to magnitude
      withTiming(magnitude, {
        duration: TIMING_CONFIG.FAST.duration,
        easing: TIMING_CONFIG.FAST.easing,
      }),
      // Shrink back to normal
      withTiming(1, {
        duration: TIMING_CONFIG.FAST.duration,
        easing: TIMING_CONFIG.FAST.easing,
      })
    );
  }, [scale, magnitude]);

  // Dramatic pulse function
  const dramaticPulse = useCallback(() => {
    'worklet';

    // Animate scale with dramatic zoom effect
    scale.value = withSequence(
      withTiming(0.7, {
        duration: 200,
        easing: TIMING_CONFIG.FAST.easing,
      }),
      withTiming(magnitude, {
        duration: 300,
        easing: TIMING_CONFIG.MEDIUM.easing,
      }),
      withDelay(
        150,
        withTiming(initialScale, {
          duration: 500,
          easing: TIMING_CONFIG.MEDIUM.easing,
        })
      ),
      withDelay(200, withTiming(initialScale, { duration: 0 }))
    );

    // Animate opacity in sync with scale
    opacity.value = withSequence(
      withTiming(0.8, {
        duration: 200,
        easing: TIMING_CONFIG.FAST.easing,
      }),
      withTiming(1, {
        duration: 300,
        easing: TIMING_CONFIG.MEDIUM.easing,
      }),
      withDelay(
        150,
        withTiming(initialOpacity, {
          duration: 500,
          easing: TIMING_CONFIG.MEDIUM.easing,
        })
      ),
      withDelay(200, withTiming(initialOpacity, { duration: 0 }))
    );
  }, [scale, opacity, magnitude, initialScale, initialOpacity]);

  // Unified pulse function that calls the appropriate style
  const pulse = useCallback(() => {
    'worklet';
    if (style === 'dramatic') {
      dramaticPulse();
    } else {
      standardPulse();
    }
  }, [style, dramaticPulse, standardPulse]);

  // Start continuous animation
  const startAnimation = useCallback(
    (repetitions?: number) => {
      if (style === 'dramatic') {
        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Start the animation immediately
        dramaticPulse();

        // Set up the interval for continuous animation
        intervalRef.current = setInterval(dramaticPulse, 1350);
      } else {
        // For standard style, use withRepeat
        scale.value = 1;
        scale.value = withRepeat(
          withSequence(
            withTiming(magnitude, {
              duration: TIMING_CONFIG.FAST.duration,
              easing: TIMING_CONFIG.FAST.easing,
            }),
            withTiming(1, {
              duration: TIMING_CONFIG.FAST.duration,
              easing: TIMING_CONFIG.FAST.easing,
            })
          ),
          repetitions ?? -1, // -1 means infinite repetitions
          false // Don't reverse the animation
        );
      }
    },
    [style, scale, magnitude, dramaticPulse]
  );

  // Stop the animation
  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    // Cancel any ongoing animations
    cancelAnimation(scale);
    cancelAnimation(opacity);

    // Reset to initial values
    scale.value = initialScale;
    opacity.value = initialOpacity;
  }, [scale, opacity, initialScale, initialOpacity]);

  // Clean up on unmount
  useEffect(() => {
    // Auto-start if enabled
    if (autoStart) {
      startAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [autoStart, startAnimation, stopAnimation]);

  // Dynamic styles based on animation style
  const animatedStyle = useAnimatedStyle(() => {
    if (style === 'dramatic') {
      const scaleProgress = (scale.value - initialScale) / (magnitude - initialScale);

      return {
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
        borderWidth: 4 * (0.6 + scaleProgress * 0.8),
        shadowRadius: 4 + scaleProgress * 15,
        shadowOpacity: 0.2 + scaleProgress * 0.5,
        elevation: Math.round(4 + scaleProgress * 15),
      };
    }

    return {
      transform: [{ scale: scale.value }],
    };
  });

  return {
    scale,
    opacity,
    animatedStyle,
    pulse,
    startAnimation,
    stopAnimation,
  };
};
