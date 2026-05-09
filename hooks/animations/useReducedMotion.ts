import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Subscribes to the OS-level "Reduce Motion" accessibility preference.
 * Returns `true` when the user has asked the system to minimize animations.
 *
 * Consumers should fall back to opacity-only transitions (or skip motion
 * entirely) when this is `true`. Transform-based animations should be
 * suppressed. Ambient motion (loaders, parallax) should freeze.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReducedMotion(value);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
