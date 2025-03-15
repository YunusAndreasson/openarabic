import { useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';
import { SCREEN_WIDTH } from '../../constants/layout';

export type ReviewAnimationType = 'card' | 'screen';

export interface ReviewAnimationOptions {
  /**
   * Type of review animation
   * - 'card': Card-based review with spring animations
   * - 'screen': Screen-based review with timing animations
   * @default 'card'
   */
  type?: ReviewAnimationType;

  /**
   * Whether to track when opacity reaches zero
   * @default false
   */
  trackOpacityZero?: boolean;

  /**
   * Custom swipe distance for screen type
   * @default 500
   */
  swipeDistance?: number;

  /**
   * Custom animation duration for screen type
   * @default 300
   */
  animationDuration?: number;
}

export interface ReviewAnimationResult {
  /**
   * The translateX value for the current item
   */
  translateX: SharedValue<number>;

  /**
   * The opacity value for the current item
   */
  opacity: SharedValue<number>;

  /**
   * Animated style to apply to the component
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;

  /**
   * Function to reset the position of the item
   */
  resetPosition: () => void;

  /**
   * Function to swipe the item left (failure)
   */
  swipeLeft: (onComplete?: () => void) => void;

  /**
   * Function to swipe the item right (success)
   */
  swipeRight: (onComplete?: () => void) => void;

  /**
   * Function to fade out the item
   */
  fadeOut: (onComplete?: () => void) => void;

  /**
   * Function to fade in the item
   */
  fadeIn: (onComplete?: () => void) => void;

  /**
   * Function to set a callback for when opacity reaches zero
   * Only available when trackOpacityZero is true
   */
  setOpacityZeroCallback?: (callback: () => void) => void;

  /**
   * Function to handle word update with animation
   * Only available for screen type
   */
  handleWordUpdate?: (
    success: boolean,
    updateWord: () => Promise<void>,
    onComplete: () => void,
    onError: (error: any) => void
  ) => void;
}

/**
 * Unified hook for review animations
 * Combines functionality from useReviewCardAnimation and useReviewScreenAnimation
 *
 * @param options - Configuration options for the review animation
 * @returns Animation controls and style for the review component
 */
export const useReviewAnimation = (options: ReviewAnimationOptions = {}): ReviewAnimationResult => {
  const {
    type = 'card',
    trackOpacityZero = false,
    swipeDistance = 500,
    animationDuration = 300,
  } = options;

  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Callback ref for opacity zero
  const opacityZeroCallbackRef = useRef<(() => void) | null>(null);

  // Constants for the animation
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.05;

  // Animation configurations based on type
  const animationConfig =
    type === 'card'
      ? {
          // Use faster spring animation for card swipes
          swipeConfig: {
            ...SPRING_CONFIG.CARD,
            stiffness: 250, // Higher stiffness for faster movement
            damping: 20, // Higher damping for less bounce
          },
          swipeDistance: SCREEN_WIDTH * 1.5,
          useSpring: true,
        }
      : {
          // Use timing animation for screen swipes
          swipeConfig: {
            duration: animationDuration,
            easing: TIMING_CONFIG.MEDIUM.easing,
          },
          swipeDistance,
          useSpring: false,
        };

  // Fast animation config for quick transitions
  const FADE_ANIMATION_CONFIG = {
    duration: 80,
    easing: TIMING_CONFIG.FAST.easing,
  };

  // Set up the animation reaction for opacity zero tracking
  useAnimatedReaction(
    () => opacity.value,
    (currentOpacity, previousOpacity) => {
      // When opacity reaches zero, trigger the callback
      if (
        trackOpacityZero &&
        previousOpacity !== 0 &&
        currentOpacity === 0 &&
        opacityZeroCallbackRef.current
      ) {
        runOnJS(opacityZeroCallbackRef.current)();
      }
    },
    [trackOpacityZero] // Dependencies array for the reaction
  );

  // Function to set the opacity zero callback
  const setOpacityZeroCallback = useCallback((callback: () => void) => {
    opacityZeroCallbackRef.current = callback;
  }, []);

  // Reset position function
  const resetPosition = useCallback(() => {
    'worklet';
    if (animationConfig.useSpring) {
      translateX.value = withSpring(0, animationConfig.swipeConfig);
    } else {
      translateX.value = withTiming(0, animationConfig.swipeConfig);
    }
  }, [translateX, animationConfig]);

  // Swipe left function (failure)
  const swipeLeft = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      const targetValue = -animationConfig.swipeDistance;

      if (animationConfig.useSpring) {
        translateX.value = withSpring(targetValue, animationConfig.swipeConfig, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      } else {
        translateX.value = withTiming(targetValue, animationConfig.swipeConfig, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      }
    },
    [translateX, animationConfig]
  );

  // Swipe right function (success)
  const swipeRight = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      const targetValue = animationConfig.swipeDistance;

      if (animationConfig.useSpring) {
        translateX.value = withSpring(targetValue, animationConfig.swipeConfig, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      } else {
        translateX.value = withTiming(targetValue, animationConfig.swipeConfig, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      }
    },
    [translateX, animationConfig]
  );

  // Fade out function
  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(0, FADE_ANIMATION_CONFIG, () => {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      });
    },
    [opacity]
  );

  // Fade in function
  const fadeIn = useCallback(
    (onComplete?: () => void) => {
      'worklet';
      opacity.value = withTiming(1, FADE_ANIMATION_CONFIG, () => {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      });
    },
    [opacity]
  );

  // Handle word update with animation (only for screen type)
  const handleWordUpdate = useCallback(
    (
      success: boolean,
      updateWord: () => Promise<void>,
      onComplete: () => void,
      onError: (error: any) => void
    ) => {
      try {
        // First update the word in the database
        updateWord()
          .then(() => {
            // Reset position immediately
            translateX.value = 0;

            // Ensure opacity is exactly 0 before proceeding
            opacity.value = 0;

            // Add a tiny delay before showing the next word
            setTimeout(() => {
              // Use withTiming for fade-in
              opacity.value = withTiming(1, FADE_ANIMATION_CONFIG, () => {
                runOnJS(onComplete)();
              });
            }, 16); // One frame delay at 60fps to ensure clean transition
          })
          .catch(onError);
      } catch (error) {
        onError(error);
      }
    },
    [opacity, translateX]
  );

  // Create animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Return appropriate functions based on type
  const result: ReviewAnimationResult = {
    translateX,
    opacity,
    animatedStyle,
    resetPosition,
    swipeLeft,
    swipeRight,
    fadeOut,
    fadeIn,
  };

  // Add type-specific functions
  if (trackOpacityZero) {
    result.setOpacityZeroCallback = setOpacityZeroCallback;
  }

  if (type === 'screen') {
    result.handleWordUpdate = handleWordUpdate;
  }

  return result;
};
