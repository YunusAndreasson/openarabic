import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { withOpacity } from '../../utils/colorUtils';

import { TIMING_CONFIG } from './animationConfigs';
import type { SharedValue } from './types';

export type PulseStyle = 'standard' | 'dramatic' | 'gentle' | 'halo';

export interface PulseAnimationOptions {
  /**
   * Style of pulse animation
   * - 'standard': Simple scale pulse
   * - 'dramatic': More complex pulse with opacity changes
   * - 'gentle': Smoother, more subtle pulse with longer duration
   * - 'halo': Elegant halo effect with subtle glow
   */
  style?: PulseStyle;

  /**
   * Maximum scale during pulse (default 1.1 for standard, 1.25 for dramatic, 1.15 for gentle, 1.18 for halo)
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

  /**
   * Halo color (only used in halo style)
   */
  haloColor?: string;

  /**
   * Halo intensity (0.0-1.0, default 0.5)
   */
  haloIntensity?: number;
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
   * Shared value for halo scale (only used in halo style)
   */
  haloScale: SharedValue<number>;

  /**
   * Shared value for halo opacity (only used in halo style)
   */
  haloOpacity: SharedValue<number>;

  /**
   * Animated style to apply to the component
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;

  /**
   * Animated style to apply to the halo component (only used in halo style)
   */
  haloAnimatedStyle: ReturnType<typeof useAnimatedStyle>;

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
  const colors = useColors();
  const {
    style = 'standard',
    pulseMagnitude,
    autoStart = false,
    haloColor = withOpacity(colors.white, 0.8),
    haloIntensity = 0.5,
  } = options;

  // Set default magnitude based on style
  const defaultMagnitude =
    style === 'dramatic' ? 1.25 : style === 'gentle' ? 1.15 : style === 'halo' ? 1.18 : 1.1;
  const magnitude = pulseMagnitude ?? defaultMagnitude;

  // Initial values based on style
  const initialScale = style === 'dramatic' ? 0.3 : 1;
  const initialOpacity = style === 'dramatic' ? 0.5 : style === 'gentle' ? 0.5 : 1;

  // Animation values - always create all shared values to avoid conditional hook calls
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(initialOpacity);
  const haloScale = useSharedValue(1.3);
  const haloOpacity = useSharedValue(0);

  // Stop the animation - defined first to avoid reference issues
  const stopAnimation = useCallback(() => {
    'worklet';
    // Cancel any ongoing animations
    cancelAnimation(scale);
    cancelAnimation(opacity);
    cancelAnimation(haloScale);
    cancelAnimation(haloOpacity);

    // Reset to initial values
    scale.value = initialScale;
    opacity.value = initialOpacity;

    if (style === 'halo') {
      haloScale.value = 1.3;
      haloOpacity.value = 0;
    }
  }, [scale, opacity, haloScale, haloOpacity, initialScale, initialOpacity, style]);

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

  // Halo pulse function - new elegant halo effect
  const haloPulse = useCallback(() => {
    'worklet';
    const pulseDuration = options.duration || 1400;

    // Main element animation
    scale.value = withSequence(
      withTiming(magnitude, {
        duration: pulseDuration * 0.4,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(1, {
        duration: pulseDuration * 0.6,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Halo animations
    haloScale.value = withSequence(
      withTiming(1.5, {
        duration: pulseDuration * 0.5,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(1.3, {
        duration: pulseDuration * 0.5,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    haloOpacity.value = withSequence(
      withTiming(haloIntensity, {
        duration: pulseDuration * 0.3,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(0.1, {
        duration: pulseDuration * 0.7,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [scale, haloScale, haloOpacity, magnitude, haloIntensity, options.duration]);

  // Unified pulse function that calls the appropriate style
  const pulse = useCallback(() => {
    'worklet';
    if (style === 'dramatic') {
      dramaticPulse();
    } else if (style === 'gentle') {
      gentlePulse();
    } else if (style === 'halo') {
      haloPulse();
    } else {
      standardPulse();
    }
  }, [style, dramaticPulse, gentlePulse, haloPulse, standardPulse]);

  // Calculate animation cycle duration for each style

  // Start the pulse animation
  const startAnimation = useCallback(() => {
    'worklet';
    // Cancel any running animations first
    stopAnimation();

    // Different animation based on selected style
    if (style === 'standard') {
      // Standard pulse: Simple scale pulsing
      scale.value = withRepeat(
        withSequence(
          withTiming(magnitude, {
            duration: 700,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(1, {
            duration: 700,
            easing: Easing.in(Easing.ease),
          })
        ),
        -1,
        false // don't reverse the animation
      );
    } else if (style === 'dramatic') {
      // Dramatic pulse: More noticeable with opacity changes
      scale.value = withSequence(
        withTiming(0.3, {
          duration: 100,
          easing: Easing.out(Easing.ease),
        }),
        withTiming(magnitude, {
          duration: 200,
          easing: Easing.bounce,
        }),
        withRepeat(
          withSequence(
            withTiming(magnitude * 0.9, {
              duration: 600,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(magnitude, {
              duration: 600,
              easing: Easing.in(Easing.ease),
            })
          ),
          -1,
          false
        )
      );

      opacity.value = withSequence(
        withTiming(0.5, {
          duration: 100,
        }),
        withTiming(1, {
          duration: 200,
        })
      );
    } else if (style === 'gentle') {
      // Gentle pulse: Smoother and more subtle
      scale.value = withRepeat(
        withSequence(
          withTiming(magnitude, {
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(1, {
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ),
        -1,
        false
      );

      opacity.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(0.7, {
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ),
        -1,
        false
      );
    } else if (style === 'halo') {
      // Halo effect: Main element scales slightly while halo expands and fades
      scale.value = withRepeat(
        withSequence(
          withTiming(magnitude, {
            duration: 1000,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(1, {
            duration: 1000,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ),
        -1,
        false
      );

      // Halo animation
      haloScale.value = withRepeat(
        withSequence(
          withTiming(1.3, {
            duration: 200,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(1.7, {
            duration: 1800,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ),
        -1,
        false
      );

      haloOpacity.value = withRepeat(
        withSequence(
          withTiming(haloIntensity, {
            duration: 200,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(0, {
            duration: 1800,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ),
        -1,
        false
      );
    }
  }, [style, magnitude, stopAnimation, scale, opacity, haloScale, haloOpacity, haloIntensity]);

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

  // Halo-specific animated style
  const haloAnimatedStyle = useAnimatedStyle(() => {
    if (style === 'halo') {
      return {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: LAYOUT.BORDER_RADIUS.PILL, // Large value ensures circular shape
        transform: [{ scale: haloScale.value }],
        opacity: haloOpacity.value,
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadowColor: haloColor,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 15,
        shadowOpacity: haloOpacity.value,
        elevation: 6,
      };
    }

    return {};
  });

  return {
    scale,
    opacity,
    haloScale,
    haloOpacity,
    animatedStyle,
    haloAnimatedStyle,
    pulse,
    startAnimation,
    stopAnimation,
  };
};
