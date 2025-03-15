import { useState, useCallback, useRef } from 'react';
import { router } from 'expo-router';

interface NavigationOptions {
  /**
   * Debounce duration in milliseconds
   */
  debounceDuration?: number;
}

interface NavigateToOptions {
  /**
   * Whether to replace the current route instead of pushing a new one
   */
  replace?: boolean;
}

/**
 * Hook to handle navigation with debounce protection
 * Prevents multiple rapid navigation attempts
 */
export const useNavigationWithDebounce = (options: NavigationOptions = {}) => {
  const { debounceDuration = 300 } = options;
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Navigate to a route with debounce protection
   * @param route - Route pathname or configuration object
   * @param callback - Optional callback to run before navigation
   * @param navigateOptions - Additional navigation options
   */
  const navigateTo = useCallback(
    (
      route: string | { pathname: string; params?: Record<string, string | number> },
      callback?: () => void,
      navigateOptions?: NavigateToOptions
    ) => {
      if (isNavigating) return;

      // Set navigating state to prevent multiple clicks
      setIsNavigating(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Run callback if provided
      if (callback) {
        callback();
      }

      // Navigate immediately
      try {
        if (navigateOptions?.replace) {
          // @ts-ignore - Using router.replace with type safety is complex due to route typing
          router.replace(route);
        } else {
          // @ts-ignore - Using router.push with type safety is complex due to route typing
          router.push(route);
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }

      // Reset navigation state after debounce duration
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, debounceDuration);
    },
    [isNavigating, debounceDuration]
  );

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    isNavigating,
    navigateTo,
    cleanup,
  };
};
