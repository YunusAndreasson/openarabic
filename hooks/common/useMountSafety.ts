import { useEffect, useRef } from 'react';

/**
 * Hook for tracking component mount status
 * Provides a ref that's true when mounted, false when unmounted
 * Used to prevent state updates on unmounted components
 *
 * @returns Ref that tracks whether the component is currently mounted
 *
 * @example
 * ```typescript
 * const Component = () => {
 *   const isMountedRef = useMountSafety();
 *
 *   const asyncOperation = async () => {
 *     const result = await fetchData();
 *     if (isMountedRef.current) {
 *       setState(result);
 *     }
 *   };
 * };
 * ```
 */
export function useMountSafety() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}
