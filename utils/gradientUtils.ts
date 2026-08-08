import { GOLDEN_RATIO, SCREEN_WIDTH } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

// Extract constants outside component to prevent recreation
const BASE_HEADER_HEIGHT = Math.round(SCREEN_WIDTH / GOLDEN_RATIO);

/**
 * Calculate header height including safe area for proper image display
 */
export function calculateHeaderHeight(safeAreaTop: number): number {
  return BASE_HEADER_HEIGHT + safeAreaTop;
}

/**
 * Create image gradient colors for text visibility.
 * Uses colors.gradientOverlay which is theme-aware:
 * - Dark mode: black overlay for light text visibility
 * - Light/sepia: background-tinted overlay for dark text visibility
 */
export function createImageGradientColors(
  colors: ThemeColors,
): readonly [string, string, string, string, string, string, string] {
  const overlay = colors.gradientOverlay;
  return [
    'transparent',
    'transparent',
    withOpacity(overlay, 0.03),
    withOpacity(overlay, 0.08),
    withOpacity(overlay, 0.15),
    withOpacity(overlay, 0.25),
    withOpacity(overlay, 0.4),
  ] as const;
}

/**
 * Create background gradient colors for smooth transition to content.
 * Uses colors.gradientOverlay which adapts per theme.
 */
export function createBackgroundGradientColors(
  colors: ThemeColors,
): readonly [string, string, string, string, string, string, string, string, string, string] {
  const overlay = colors.gradientOverlay;
  return [
    'transparent',
    'transparent',
    'transparent',
    withOpacity(overlay, 0.05),
    withOpacity(overlay, 0.15),
    withOpacity(overlay, 0.3),
    withOpacity(overlay, 0.5),
    withOpacity(overlay, 0.7),
    withOpacity(overlay, 0.85),
    colors.background,
  ] as const;
}
