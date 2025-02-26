import { useState, useEffect } from 'react';

/**
 * Hook for managing component animation states with delayed readiness
 * @param delay - Delay in ms before component is considered ready
 * @returns Component state information
 */
export function useComponentAnimation(delay = 300) {
  const [isReady, setIsReady] = useState(false);

  // Set component as ready after a delay to ensure smooth rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return {
    isReady,
  };
}
