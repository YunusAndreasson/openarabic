import { GOLDEN_RATIO } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

/**
 * Calculate header height including safe area for proper image display: the
 * image is the window's width over the golden ratio. Takes the live window
 * width, because an Android 16 tablet or foldable resizes under a running app.
 */
export function calculateHeaderHeight(safeAreaTop: number, windowWidth: number): number {
  return Math.round(windowWidth / GOLDEN_RATIO) + safeAreaTop;
}

/**
 * Create image gradient colors for text visibility.
 * Uses colors.gradientOverlay which is theme-aware:
 * - Dark mode: black overlay for light text visibility
 * - Light/sepia: background-tinted overlay for dark text visibility
 *
 * The clear stops are the overlay at zero opacity, never `transparent`. That
 * keyword is rgba(0,0,0,0), so a light theme's ramp would pass through grey on
 * its way in: React Native only rewrites a transparent stop on iOS, and Skia,
 * which drew these before, read it as black.
 */
export function createImageGradientColors(
  colors: ThemeColors,
): readonly [string, string, string, string, string, string, string] {
  const overlay = colors.gradientOverlay;
  const clear = withOpacity(overlay, 0);
  return [
    clear,
    clear,
    withOpacity(overlay, 0.03),
    withOpacity(overlay, 0.08),
    withOpacity(overlay, 0.15),
    withOpacity(overlay, 0.25),
    withOpacity(overlay, 0.4),
  ] as const;
}

/**
 * Create background gradient colors for smooth transition to content.
 * Uses colors.gradientOverlay which adapts per theme. Clear stops as above.
 */
export function createBackgroundGradientColors(
  colors: ThemeColors,
): readonly [string, string, string, string, string, string, string, string, string, string] {
  const overlay = colors.gradientOverlay;
  const clear = withOpacity(overlay, 0);
  return [
    clear,
    clear,
    clear,
    withOpacity(overlay, 0.05),
    withOpacity(overlay, 0.15),
    withOpacity(overlay, 0.3),
    withOpacity(overlay, 0.5),
    withOpacity(overlay, 0.7),
    withOpacity(overlay, 0.85),
    colors.background,
  ] as const;
}
