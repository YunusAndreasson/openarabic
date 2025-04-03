import { useState, useCallback, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { handleError } from '@/utils/errorHandling';
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
  const { debounceDuration = 100 } = options;
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

      // Clear any existing timeout first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }

      // Set navigating state to prevent multiple clicks
      setIsNavigating(true);

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
        handleError(error instanceof Error ? error : String(error));
        setIsNavigating(false);
        return;
      }

      // Reset navigation state after debounce duration
      const timeoutId = setTimeout(() => {
        setIsNavigating(false);
        timeoutRef.current = undefined;
      }, debounceDuration);

      timeoutRef.current = timeoutId;
    },
    [isNavigating, debounceDuration]
  );

  return {
    isNavigating,
    navigateTo,
  };
};
