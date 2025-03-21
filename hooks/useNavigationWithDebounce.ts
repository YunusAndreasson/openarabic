import { useState, useCallback, useRef, useEffect } from 'react';
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

type NavigationRoute = string | { pathname: string; params?: Record<string, string | number> };

interface NavigationWithDebounceReturn {
  isNavigating: boolean;
  navigateTo: (
    route: NavigationRoute,
    callback?: () => void,
    navigateOptions?: NavigateToOptions
  ) => void;
}

/**
 * Hook to handle navigation with debounce protection
 * Prevents multiple rapid navigation attempts
 */
export const useNavigationWithDebounce = (
  options: NavigationOptions = {}
): NavigationWithDebounceReturn => {
  const { debounceDuration = 300 } = options;
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Navigate to a route with debounce protection
   * @param route - Route pathname or configuration object
   * @param callback - Optional callback to run before navigation
   * @param navigateOptions - Additional navigation options
   */
  const navigateTo = useCallback(
    (route: NavigationRoute, callback?: () => void, navigateOptions?: NavigateToOptions) => {
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
          router.replace(route as any);
        } else {
          router.push(route as any);
        }
      } catch (error) {
        // Reset navigation state if an error occurs
        setIsNavigating(false);
        console.error('Navigation error:', error);
      }

      // Reset navigation state after debounce duration
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, debounceDuration);
    },
    [isNavigating, debounceDuration]
  );

  return {
    isNavigating,
    navigateTo,
  };
};
