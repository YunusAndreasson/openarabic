import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to ensure layout calculations are complete before rendering content
 * Helps prevent layout jumps and flickering during initial render
 *
 * @param delay - Optional delay in ms before marking layout as ready (default: 0)
 * @returns Object with isLayoutReady state and reset function
 */
export const useLayoutReady = (
  delay = 0
): {
  isLayoutReady: boolean;
  resetLayout: () => void;
} => {
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Reset layout ready state
  const resetLayout = useCallback(() => {
    setIsLayoutReady(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let frameId: number | undefined;

    const cleanup = () => {
      mounted = false;
      if (typeof cancelAnimationFrame === 'function' && frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // Function to set layout ready if component is still mounted
    const setLayoutReadyIfMounted = () => {
      if (mounted) {
        setIsLayoutReady(true);
      }
    };

    // Check if requestAnimationFrame is available (it's not in some test environments)
    if (typeof requestAnimationFrame === 'function') {
      // Use requestAnimationFrame to ensure layout is calculated
      frameId = requestAnimationFrame(() => {
        if (!mounted) return;

        if (delay > 0) {
          // Add optional delay if needed
          timeoutId = setTimeout(setLayoutReadyIfMounted, delay);
        } else {
          setLayoutReadyIfMounted();
        }
      });
    } else {
      // Fallback for test environments
      if (delay > 0) {
        timeoutId = setTimeout(setLayoutReadyIfMounted, delay);
      } else {
        setLayoutReadyIfMounted();
      }
    }

    return cleanup;
  }, [delay]);

  return { isLayoutReady, resetLayout };
};
