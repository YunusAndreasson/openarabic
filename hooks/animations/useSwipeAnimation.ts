import { useCallback, useEffect, useState, useRef } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SlideInRight,
  SlideInLeft,
  SlideOutRight,
  SlideOutLeft,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { SPRING_CONFIG, TIMING_CONFIG } from './animationConfigs';

interface SwipeConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
  /**
   * Specific damping for right swipe (for faster "fling" effect)
   * @default 12
   */
  rightSwipeDamping?: number;
  /**
   * Specific stiffness for right swipe (for faster movement)
   * @default 250
   */
  rightSwipeStiffness?: number;
  /**
   * Specific damping for left swipe
   * @default Same as CARD damping
   */
  leftSwipeDamping?: number;
  /**
   * Specific stiffness for left swipe
   * @default Same as CARD stiffness
   */
  leftSwipeStiffness?: number;
}

/**
 * Hook to create swipe animations for cards
 * @param initialX - Initial X position
 * @param threshold - Threshold to trigger swipe action (percentage of screen width)
 * @param config - Spring animation configuration
 * @param screenWidthOverride - Optional manual override for screen width (useful for testing or custom layouts)
 * @returns Object with animated style and functions to control the swipe
 */
export const useSwipeAnimation = (
  initialX = 0,
  threshold = 0.05,
  config: SwipeConfig = {},
  screenWidthOverride?: number
) => {
  const isMountedRef = useRef(true);

  // Validate input parameters
  const safeThreshold = Math.max(0, Math.min(1, threshold)); // Ensure threshold is between 0 and 1
  const safeScreenWidthOverride =
    screenWidthOverride && screenWidthOverride > 0 ? screenWidthOverride : undefined;

  // Get current screen dimensions as a fallback
  const getCurrentWidth = () => {
    try {
      return Dimensions.get('window').width || 375; // Fallback to standard width if something fails
    } catch (e) {
      return 375; // Safe fallback for tests or unusual environments
    }
  };

  // Get screen dimensions dynamically and update on orientation changes
  const [screenWidth, setScreenWidth] = useState(safeScreenWidthOverride ?? getCurrentWidth());

  // Ensure we have valid non-zero dimensions
  const safeWidth = screenWidth > 0 ? screenWidth : 375;

  // Update dimensions when the screen size changes (e.g., rotation)
  useEffect(() => {
    isMountedRef.current = true;

    if (safeScreenWidthOverride) {
      setScreenWidth(safeScreenWidthOverride);
      return;
    }

    // Set initial dimensions
    setScreenWidth(getCurrentWidth());

    const dimensionsHandler = Dimensions.addEventListener('change', ({ window }) => {
      if (isMountedRef.current && window?.width && window.width > 0) {
        setScreenWidth(window.width);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (dimensionsHandler?.remove) {
        dimensionsHandler.remove();
      }
    };
  }, [safeScreenWidthOverride]);

  const translateX = useSharedValue(initialX);
  const opacity = useSharedValue(1);

  // Cleanup shared animation values on unmount
  useEffect(() => {
    return () => {
      try {
        // Cancel any pending animations immediately
        translateX.value = initialX;
        opacity.value = 1;
      } catch (error) {
        // Handle potential errors during cleanup silently
      }
    };
  }, [translateX, opacity, initialX]);

  const swipeThreshold = safeWidth * safeThreshold;

  // Safe callback runner that checks if component is still mounted
  const safeRunCallback = useCallback((callback?: () => void) => {
    if (callback && isMountedRef.current) {
      callback();
    }
  }, []);

  // Create optimized entering and exiting animations using Reanimated 3 built-ins
  const enteringRight = SlideInRight.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const enteringLeft = SlideInLeft.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const exitingRight = SlideOutRight.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const exitingLeft = SlideOutLeft.springify()
    .damping(config.damping || SPRING_CONFIG.CARD.damping)
    .stiffness(config.stiffness || SPRING_CONFIG.CARD.stiffness)
    .mass(config.mass || SPRING_CONFIG.CARD.mass);

  const fadeInAnim = FadeIn.duration(Math.max(1, TIMING_CONFIG.MEDIUM.duration));
  const fadeOutAnim = FadeOut.duration(Math.max(1, TIMING_CONFIG.MEDIUM.duration));

  const swipeRight = useCallback(
    (onComplete?: () => void) => {
      try {
        translateX.value = withSpring(
          safeWidth,
          {
            ...SPRING_CONFIG.CARD,
            damping: config.rightSwipeDamping ?? 12, // Slightly lower damping for more "fling" effect
            stiffness: config.rightSwipeStiffness ?? 250, // Higher stiffness for faster movement
            ...config,
          },
          finished => {
            if (finished && onComplete && runOnJS) {
              runOnJS(safeRunCallback)(onComplete);
            }
          }
        );
      } catch (error) {
        console.error('Swipe right animation error:', error);
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [translateX, config, safeWidth, safeRunCallback]
  );

  const swipeLeft = useCallback(
    (onComplete?: () => void) => {
      try {
        translateX.value = withSpring(
          -safeWidth,
          {
            ...SPRING_CONFIG.CARD,
            damping: config.leftSwipeDamping ?? SPRING_CONFIG.CARD.damping,
            stiffness: config.leftSwipeStiffness ?? SPRING_CONFIG.CARD.stiffness,
            ...config,
          },
          finished => {
            if (finished && onComplete && runOnJS) {
              runOnJS(safeRunCallback)(onComplete);
            }
          }
        );
      } catch (error) {
        console.error('Swipe left animation error:', error);
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [translateX, config, safeWidth, safeRunCallback]
  );

  const resetPosition = useCallback(
    (onComplete?: () => void) => {
      try {
        translateX.value = withSpring(
          0,
          {
            ...SPRING_CONFIG.CARD,
            ...config,
          },
          finished => {
            if (finished && onComplete && runOnJS) {
              runOnJS(safeRunCallback)(onComplete);
            }
          }
        );
      } catch (error) {
        console.error('Reset position error:', error);
        // Fallback to immediate reset on error
        translateX.value = 0;
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [translateX, config, safeRunCallback]
  );

  const fadeIn = useCallback(
    (rawDuration = TIMING_CONFIG.MEDIUM.duration, onComplete?: () => void) => {
      // Ensure valid duration
      const duration = Math.max(0, rawDuration);

      try {
        opacity.value = withTiming(1, { duration }, finished => {
          if (finished && onComplete && runOnJS) {
            runOnJS(safeRunCallback)(onComplete);
          }
        });
      } catch (error) {
        console.error('Fade in animation error:', error);
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [opacity, safeRunCallback]
  );

  const fadeOut = useCallback(
    (rawDuration = TIMING_CONFIG.MEDIUM.duration, onComplete?: () => void) => {
      // Ensure valid duration
      const duration = Math.max(0, rawDuration);

      try {
        opacity.value = withTiming(0, { duration }, finished => {
          if (finished && onComplete && runOnJS) {
            runOnJS(safeRunCallback)(onComplete);
          }
        });
      } catch (error) {
        console.error('Fade out animation error:', error);
        if (onComplete && runOnJS) {
          runOnJS(safeRunCallback)(onComplete);
        }
      }
    },
    [opacity, safeRunCallback]
  );

  // Create animatedStyle with proper memoization
  const animatedStyle = useAnimatedStyle(
    () => {
      return {
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
      };
    },
    // Dependencies array for useAnimatedStyle - improving performance
    [translateX, opacity]
  );

  return {
    animatedStyle,
    translateX,
    opacity,
    swipeRight,
    swipeLeft,
    resetPosition,
    fadeIn,
    fadeOut,
    swipeThreshold,
    // Additional screen dimensions info
    screenWidth: safeWidth,
    // Export the built-in animations for direct use with Animated.View
    enteringRight,
    enteringLeft,
    exitingRight,
    exitingLeft,
    fadeInAnim,
    fadeOutAnim,
  };
};
