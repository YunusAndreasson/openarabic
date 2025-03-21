import { useState } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
  useWorkletCallback,
} from 'react-native-reanimated';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

/**
 * Interface for the return value of useScrollVisibility
 */
export interface ScrollVisibilityResult {
  /**
   * Whether the UI elements are currently visible
   */
  isVisible: boolean;

  /**
   * Scroll handler function to be passed to FlatList/ScrollView onScroll prop
   */
  scrollHandler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Hook that manages UI element visibility based on scroll position
 * Runs scroll calculations on the UI thread for better performance
 *
 * @param initialVisibility - Whether the elements should be initially visible (default: true)
 * @returns An object with isVisible state and a scrollHandler for the FlatList/ScrollView
 */
export const useScrollVisibility = (initialVisibility = true): ScrollVisibilityResult => {
  const [isVisible, setIsVisible] = useState(initialVisibility);
  const scrollY = useSharedValue(0);

  // Create a simpler animated scroll handler function that works with FlatList
  const scrollHandler = useAnimatedScrollHandler(event => {
    const currentScrollY = event.contentOffset.y;

    // Determine visibility on UI thread
    const isScrollingUp = currentScrollY < scrollY.value;
    const isAtTop = currentScrollY <= 0;
    const shouldBeVisible = isScrollingUp || isAtTop;

    // Only dispatch to JS thread if visibility should change
    if (shouldBeVisible !== isVisible) {
      runOnJS(setIsVisible)(shouldBeVisible);
    }

    // Update shared value for next comparison
    scrollY.value = currentScrollY;
  });

  return {
    isVisible,
    scrollHandler,
  };
};
