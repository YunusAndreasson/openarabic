import { useRef, useEffect } from 'react';

/**
 * Debugging hook to identify components causing render loops.
 * Logs render count and dependency changes.
 */
export function useDebugRenders(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    if (!__DEV__) return;

    renderCount.current += 1;
    console.log(`[Debug] ${componentName} rendered ${renderCount.current} times`);

    if (renderCount.current === 25) {
      console.warn(`[Debug] ⚠️ ${componentName} has rendered 25 times - possible infinite loop`);
    }

    if (renderCount.current >= 50) {
      console.error(
        `[Debug] 🔄 ${componentName} has rendered ${renderCount.current} times - INFINITE LOOP DETECTED`
      );

      // Log the stack trace to help identify the source
      console.error(new Error().stack);
    }
  });
}

/**
 * Debugging function to log the value of a dependency each render
 */
export function logDependency(name: string, value: unknown): void {
  if (!__DEV__) return;

  console.log(`[Debug] Dependency ${name} = `, value);
}
