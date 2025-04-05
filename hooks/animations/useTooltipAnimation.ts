import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';

interface TooltipAnimationResult {
  /**
   * Combined animated style for the tooltip with scale and opacity effects
   */
  animatedStyle: AnimatedStyleProp<ViewStyle>;

  /**
   * Function to show the tooltip with spring animation
   * @param onComplete - Optional callback when animation completes
   */
  showTooltip: (onComplete?: () => void) => void;

  /**
   * Function to hide the tooltip with timing animation
   * @param onComplete - Optional callback when animation completes
   */
  hideTooltip: (onComplete?: () => void) => void;

  /**
   * Whether the tooltip animation is active
   */
  isAnimating: () => boolean;
}

interface TooltipAnimationOptions {
  /**
   * Initial scale value
   * @default 0.8
   */
  initialScale?: number;

  /**
   * Target scale value
   * @default 1
   */
  targetScale?: number;

  /**
   * Duration for fade animations in ms
   * @default 200
   */
  fadeDuration?: number;

  /**
   * Custom spring configuration
   * @default SPRING_CONFIG.CARD with customized damping and mass
   */
  springConfig?: typeof SPRING_CONFIG.CARD;
}

/**
 * Hook for tooltip animations that combines scale spring effect with opacity animations
 * Creates a natural feeling popup effect for tooltips
 *
 * @example
 * const { animatedStyle, showTooltip, hideTooltip } = useTooltipAnimation();
 *
 * // Later in component
 * useEffect(() => {
 *   if (isVisible) {
 *     showTooltip();
 *   } else {
 *     hideTooltip();
 *   }
 * }, [isVisible, showTooltip, hideTooltip]);
 *
 * // In render
 * return (
 *   <Animated.View style={[styles.tooltip, animatedStyle]}>
 *     {children}
 *   </Animated.View>
 * );
 */
export const useTooltipAnimation = (
  options: TooltipAnimationOptions = {}
): TooltipAnimationResult => {
  const {
    initialScale = 0.8,
    targetScale = 1,
    fadeDuration = 200,
    springConfig = {
      ...SPRING_CONFIG.CARD,
      damping: 12, // Slightly bouncier for tooltip pop effect
      mass: 0.6, // Lighter mass for quicker movement
    },
  } = options;

  // Animation values
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(0);

  // Animation state tracking (to prevent multiple animations)
  const animationActive = useSharedValue(false);

  // Combined animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Function to show tooltip with spring animation
  const showTooltip = useCallback(
    (onComplete?: () => void) => {
      // Cancel any ongoing animations
      cancelAnimation(scale);
      cancelAnimation(opacity);

      // Mark animation as active
      animationActive.value = true;

      // Animate scale with spring for natural motion
      scale.value = withSpring(targetScale, springConfig, finished => {
        'worklet';
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      });

      // Animate opacity with timing for clean fade-in
      opacity.value = withTiming(1, {
        duration: fadeDuration,
        easing: TIMING_CONFIG.MEDIUM.easing,
      });
    },
    [scale, opacity, animationActive, targetScale, springConfig, fadeDuration]
  );

  // Function to hide tooltip with timing animation
  const hideTooltip = useCallback(
    (onComplete?: () => void) => {
      // Cancel any ongoing animations
      cancelAnimation(scale);
      cancelAnimation(opacity);

      // Mark animation as active
      animationActive.value = true;

      // Animate opacity out first
      opacity.value = withTiming(
        0,
        {
          duration: fadeDuration,
          easing: TIMING_CONFIG.MEDIUM.easing,
        },
        finished => {
          'worklet';
          if (finished) {
            // Reset scale after opacity reaches 0
            scale.value = initialScale;

            // Mark animation as complete
            animationActive.value = false;

            // Call completion callback
            if (onComplete) {
              runOnJS(onComplete)();
            }
          }
        }
      );
    },
    [scale, opacity, animationActive, initialScale, fadeDuration]
  );

  // Function to check if animation is currently active
  const isAnimating = useCallback(() => {
    'worklet';
    return animationActive.value;
  }, [animationActive]);

  return {
    animatedStyle,
    showTooltip,
    hideTooltip,
    isAnimating,
  };
};
