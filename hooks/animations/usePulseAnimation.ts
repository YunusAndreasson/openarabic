import { useCallback, useEffect } from 'react';
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

export type PulseStyle = 'standard' | 'dramatic' | 'gentle';

export interface PulseAnimationOptions {
  /**
   * Style of pulse animation
   * - 'standard': Simple scale pulse
   * - 'dramatic': More complex pulse with opacity changes
   * - 'gentle': Smoother, more subtle pulse with longer duration
   */
  style?: PulseStyle;

  /**
   * Maximum scale during pulse (default 1.1 for standard, 1.25 for dramatic, 1.15 for gentle)
   */
  pulseMagnitude?: number;

  /**
   * Whether to automatically start the animation on mount
   */
  autoStart?: boolean;

  /**
   * Animation duration in milliseconds (default depends on style)
   */
  duration?: number;

  /**
   * Minimum opacity for pulse animation (default depends on style)
   */
  minOpacity?: number;
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
  const defaultMagnitude = style === 'dramatic' ? 1.25 : style === 'gentle' ? 1.15 : 1.1;
  const magnitude = pulseMagnitude ?? defaultMagnitude;

  // Initial values based on style
  const initialScale = style === 'dramatic' ? 0.3 : style === 'gentle' ? 1 : 1;
  const initialOpacity = style === 'dramatic' ? 0.5 : style === 'gentle' ? 0.5 : 1;

  // Animation values - always create both shared values to avoid conditional hook calls
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(initialOpacity);

  // Stop the animation - defined first to avoid reference issues
  const stopAnimation = useCallback(() => {
    // Cancel any ongoing animations
    cancelAnimation(scale);
    cancelAnimation(opacity);

    // Reset to initial values
    scale.value = initialScale;
    opacity.value = initialOpacity;
  }, [scale, opacity, initialScale, initialOpacity]);

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
      )
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
      )
    );
  }, [scale, opacity, magnitude, initialScale, initialOpacity]);

  // Gentle pulse function - new smoother animation option
  const gentlePulse = useCallback(() => {
    'worklet';
    const pulseDuration = options.duration || 1200;
    const minOpacity = options.minOpacity || 0.4;

    // Animate scale with gentle, smooth effect
    scale.value = withSequence(
      withTiming(magnitude, {
        duration: pulseDuration * 0.5,
        easing: TIMING_CONFIG.GENTLE.easing,
      }),
      withTiming(1, {
        duration: pulseDuration * 0.5,
        easing: TIMING_CONFIG.GENTLE.easing,
      })
    );

    // Animate opacity in sync with scale - subtle changes
    opacity.value = withSequence(
      withTiming(minOpacity, {
        duration: pulseDuration * 0.4,
        easing: TIMING_CONFIG.GENTLE.easing,
      }),
      withTiming(1, {
        duration: pulseDuration * 0.6,
        easing: TIMING_CONFIG.GENTLE.easing,
      })
    );
  }, [scale, opacity, magnitude, options.duration, options.minOpacity]);

  // Unified pulse function that calls the appropriate style
  const pulse = useCallback(() => {
    'worklet';
    if (style === 'dramatic') {
      dramaticPulse();
    } else if (style === 'gentle') {
      gentlePulse();
    } else {
      standardPulse();
    }
  }, [style, dramaticPulse, gentlePulse, standardPulse]);

  // Calculate animation cycle duration for each style
  const getDurationForStyle = useCallback(() => {
    if (style === 'dramatic') {
      return 1350; // Total duration of dramatic animation cycle
    } else if (style === 'gentle') {
      return options.duration || 1200;
    } else {
      return TIMING_CONFIG.FAST.duration * 2; // Standard pulse (grow + shrink)
    }
  }, [style, options.duration]);

  // Start continuous animation
  const startAnimation = useCallback(
    (repetitions?: number) => {
      // Stop any existing animations first
      stopAnimation();

      if (style === 'dramatic') {
        // Get the full sequence for dramatic style
        const fullDramaticSequence = () => {
          'worklet';
          // Scale animation
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
            // Small delay between repetitions
            withDelay(200, withTiming(initialScale, { duration: 0 }))
          );

          // Opacity animation
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
            // Small delay between repetitions
            withDelay(200, withTiming(initialOpacity, { duration: 0 }))
          );
        };

        // Execute once immediately
        fullDramaticSequence();

        // If repetitions is specified (including infinite), set up repeating animation
        if (repetitions !== 1) {
          const cycleTime = getDurationForStyle();
          const repeatDelay = cycleTime;

          // Delayed recursive call with repetitions handling
          const setupNextAnimation = (remainingReps?: number) => {
            if (remainingReps === undefined || remainingReps > 1 || remainingReps === -1) {
              const nextReps =
                remainingReps === undefined || remainingReps === -1 ? -1 : remainingReps - 1;

              scale.value = withDelay(
                repeatDelay,
                withTiming(initialScale, { duration: 0 }, finished => {
                  if (finished) {
                    fullDramaticSequence();
                    setupNextAnimation(nextReps);
                  }
                })
              );
            }
          };

          setupNextAnimation(repetitions);
        }
      } else if (style === 'gentle') {
        const pulseDuration = options.duration || 1200;
        const minOpacity = options.minOpacity || 0.4;

        // Create full sequence for gentle style
        const scaleSequence = withSequence(
          withTiming(magnitude, {
            duration: pulseDuration * 0.5,
            easing: TIMING_CONFIG.GENTLE.easing,
          }),
          withTiming(1, {
            duration: pulseDuration * 0.5,
            easing: TIMING_CONFIG.GENTLE.easing,
          })
        );

        const opacitySequence = withSequence(
          withTiming(minOpacity, {
            duration: pulseDuration * 0.4,
            easing: TIMING_CONFIG.GENTLE.easing,
          }),
          withTiming(1, {
            duration: pulseDuration * 0.6,
            easing: TIMING_CONFIG.GENTLE.easing,
          })
        );

        // Apply repeating animations
        scale.value = withRepeat(scaleSequence, repetitions ?? -1, false);

        opacity.value = withRepeat(opacitySequence, repetitions ?? -1, false);
      } else {
        // Standard style - already using withRepeat
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
    [
      style,
      scale,
      opacity,
      magnitude,
      initialScale,
      initialOpacity,
      getDurationForStyle,
      options.duration,
      options.minOpacity,
      stopAnimation,
    ]
  );

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
      opacity: style === 'gentle' ? opacity.value : undefined,
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
