import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

// Default animation duration if config isn't available
const DEFAULT_FADE_IN_DURATION = 300; // 300ms

/**
 * Hook to handle screen animations
 * @param dataReady - Whether data is ready to be shown
 * @param isLoading - Whether the screen is still loading
 * @param onFadeInComplete - Optional callback when fade in animation completes
 * @param initialOpacity - Initial opacity value
 * @param fadeInDuration - Duration of fade in animation
 * @returns Object with animation styles and state
 */
export function useScreenAnimation(
  dataReady = false,
  isLoading = false,
  onFadeInComplete?: () => void,
  initialOpacity = 0,
  fadeInDuration = DEFAULT_FADE_IN_DURATION
): { fadeInStyle: { opacity: SharedValue<number> } } {
  // Add render counter
  const opacity = useSharedValue(initialOpacity);

  // Track previous values for change detection
  const prevValues = useRef({ dataReady, isLoading });

  // Animation effect
  useEffect(() => {
    // Update previous values
    prevValues.current = { dataReady, isLoading };

    // If data is ready and not loading, fade in
    if (dataReady && !isLoading) {
      opacity.value = withTiming(
        1,
        {
          duration: fadeInDuration,
          easing: Easing.out(Easing.cubic),
        },
        finished => {
          if (finished && onFadeInComplete) {
            runOnJS(onFadeInComplete)();
          }
        }
      );
    }
  }, [dataReady, isLoading, fadeInDuration, opacity, onFadeInComplete]);

  // Return animation styles
  return {
    fadeInStyle: { opacity },
  };
}
