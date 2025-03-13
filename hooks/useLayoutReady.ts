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
    let timeoutId: NodeJS.Timeout | undefined;
    let frameId: number | undefined;

    // Check if requestAnimationFrame is available (it's not in some test environments)
    if (typeof requestAnimationFrame === 'function') {
      // Use requestAnimationFrame to ensure layout is calculated
      frameId = requestAnimationFrame(() => {
        if (delay > 0) {
          // Add optional delay if needed
          timeoutId = setTimeout(() => {
            setIsLayoutReady(true);
          }, delay);
        } else {
          setIsLayoutReady(true);
        }
      });
    } else {
      // Fallback for test environments
      if (delay > 0) {
        timeoutId = setTimeout(() => {
          setIsLayoutReady(true);
        }, delay);
      } else {
        setIsLayoutReady(true);
      }
    }

    return () => {
      // Clean up
      if (typeof cancelAnimationFrame === 'function' && frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [delay]);

  return { isLayoutReady, resetLayout };
};
