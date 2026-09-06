import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Whether the user has asked iOS to reduce transparency (Settings → Accessibility
 * → Display & Text Size → Reduce Transparency).
 *
 * Needed because `isLiquidGlassAvailable()` does NOT answer this. It reports that
 * the liquid-glass *components* exist in the build, and expo-glass-effect's own
 * documentation says the value stays `true` for a user who has turned the effect
 * down — pointing at this API as the way to find out. A control that branches on
 * availability alone therefore takes its glass path for exactly the users who
 * asked not to have glass.
 *
 * Reduce Transparency is to blur what Reduce Motion is to animation. Always
 * `false` off iOS, where the setting does not exist.
 */
export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(enabled => {
      if (active) setReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduced,
    );

    return () => {
      active = false;
      // jest-expo's AccessibilityInfo shim can return undefined even though the
      // native type promises a subscription — the same tolerance the tab
      // BackHandler cleanup keeps.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      subscription?.remove();
    };
  }, []);

  return reduced;
}
