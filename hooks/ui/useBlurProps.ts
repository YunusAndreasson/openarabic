import type { BlurTint } from 'expo-blur';

import { Theme } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useAppSelector } from '@/store/hooks';

type BlurSurface = 'tabBar' | 'backdrop';

/**
 * No `as Record<Theme, BlurTint>` on the tint tables: asserted, a theme missing
 * from `LAYOUT.BLUR.*.tint` compiled fine and then read `undefined` at runtime —
 * a blur with no tint, which on the dark theme is a visibly wrong tab bar rather
 * than an error. The annotation on this constant checks them instead, so the
 * omission fails the build at the table that is short a theme.
 */
const BLUR_CONFIG: Record<BlurSurface, { intensity: number; tint: Record<Theme, BlurTint> }> = {
  tabBar: {
    intensity: LAYOUT.BLUR.TAB_BAR.intensity,
    tint: LAYOUT.BLUR.TAB_BAR.tint,
  },
  backdrop: {
    intensity: LAYOUT.BLUR.BACKDROP.intensity,
    tint: LAYOUT.BLUR.BACKDROP.tint,
  },
};

/** Returns theme-aware blur intensity and tint for a given surface */
export function useBlurProps(surface: BlurSurface): { intensity: number; tint: BlurTint } {
  const theme = useAppSelector(state => state.theme.theme || Theme.Dark);
  const config = BLUR_CONFIG[surface];
  return { intensity: config.intensity, tint: config.tint[theme] };
}
