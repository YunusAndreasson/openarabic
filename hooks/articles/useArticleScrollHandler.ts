import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

interface UseArticleScrollHandlerResult {
  scrollY: ReturnType<typeof useSharedValue<number>>;
  onScrollAnimated: ReturnType<typeof useAnimatedScrollHandler>;
}

/**
 * High-performance scroll handler for article content
 * Runs entirely on UI thread to eliminate cross-thread communication overhead
 *
 * Performance optimization: No scheduleOnRN calls during scroll
 * - Previous: Cross-thread call every 8px (causes Android issues)
 * - Now: Pure UI-thread shared values (smooth on all platforms)
 */
export function useArticleScrollHandler(): UseArticleScrollHandlerResult {
  // Shared scroll value for parallax header and other UI-thread animations
  const scrollY = useSharedValue(0);

  // UI-thread scroll handler - no cross-thread communication
  const onScrollAnimated = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.set(event.contentOffset.y);
    },
  });

  return {
    scrollY,
    onScrollAnimated,
  };
}
