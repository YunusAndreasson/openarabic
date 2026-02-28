import type { BlurTint } from 'expo-blur';

import { Theme } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useAppSelector } from '@/store/hooks';

type BlurSurface = 'tabBar' | 'backdrop';

const BLUR_CONFIG: Record<BlurSurface, { intensity: number; tint: Record<Theme, BlurTint> }> = {
  tabBar: {
    intensity: LAYOUT.BLUR.TAB_BAR.intensity,
    tint: LAYOUT.BLUR.TAB_BAR.tint as Record<Theme, BlurTint>,
  },
  backdrop: {
    intensity: LAYOUT.BLUR.BACKDROP.intensity,
    tint: LAYOUT.BLUR.BACKDROP.tint as Record<Theme, BlurTint>,
  },
};

/** Returns theme-aware blur intensity and tint for a given surface */
export function useBlurProps(surface: BlurSurface): { intensity: number; tint: BlurTint } {
  const theme = useAppSelector(state => state.theme.theme || Theme.Dark);
  const config = BLUR_CONFIG[surface];
  return { intensity: config.intensity, tint: config.tint[theme] };
}
