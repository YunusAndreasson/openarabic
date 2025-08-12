import { SCREEN_WIDTH } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

// Extract constants outside component to prevent recreation
const GOLDEN_RATIO = 1.618; // True golden ratio for optimal header proportions
const BASE_HEADER_HEIGHT = Math.round(SCREEN_WIDTH / GOLDEN_RATIO); // Base height based on golden ratio

/**
 * Calculate header height including safe area for proper image display
 */
export function calculateHeaderHeight(safeAreaTop: number): number {
  return BASE_HEADER_HEIGHT + safeAreaTop;
}

/**
 * Create image gradient colors for text visibility based on theme
 */
export function createImageGradientColors(
  colors: ThemeColors,
  isDarkMode: boolean
): readonly [string, string, string, string, string, string, string] {
  if (isDarkMode) {
    // Dark mode - use dark overlay for light text visibility
    return [
      colors.transparent,
      colors.transparent,
      withOpacity(colors.black, 0.03),
      withOpacity(colors.black, 0.08),
      withOpacity(colors.black, 0.15),
      withOpacity(colors.black, 0.25),
      withOpacity(colors.black, 0.4), // Dark overlay for light text visibility
    ] as const;
  } else {
    // Light/sepia mode - use background color overlay to provide contrast for dark text
    // This ensures sepia mode uses warm sepia tones instead of pure white
    return [
      colors.transparent,
      colors.transparent,
      withOpacity(colors.background, 0.03),
      withOpacity(colors.background, 0.08),
      withOpacity(colors.background, 0.15),
      withOpacity(colors.background, 0.25),
      withOpacity(colors.background, 0.4), // Background overlay for dark text visibility
    ] as const;
  }
}

/**
 * Create background gradient colors for smooth transition to content
 */
export function createBackgroundGradientColors(
  colors: ThemeColors,
  isDarkMode: boolean
): readonly [string, string, string, string, string, string, string, string, string, string] {
  const bgColor = colors.background;

  // Use appropriate overlay color based on theme
  // For sepia mode, use background color instead of white to maintain warm tones
  const overlayColor = isDarkMode ? colors.black : colors.background;

  return [
    colors.transparent,
    colors.transparent,
    colors.transparent,
    withOpacity(overlayColor, 0.05),
    withOpacity(overlayColor, 0.15),
    withOpacity(overlayColor, 0.3),
    withOpacity(overlayColor, 0.5),
    withOpacity(overlayColor, 0.7),
    withOpacity(overlayColor, 0.85),
    bgColor,
  ] as const;
}

/**
 * Create strong dark overlay gradient for excellent text contrast (used in IslamicCalendarHeader)
 */
export function createStrongDarkOverlayGradient(
  baseColor = '#000000'
): readonly [string, string, string, string, string, string, string] {
  return [
    colors.transparent,
    withOpacity(baseColor, 0.1),
    withOpacity(baseColor, 0.3),
    withOpacity(baseColor, 0.5),
    withOpacity(baseColor, 0.7),
    withOpacity(baseColor, 0.85),
    withOpacity(baseColor, 0.95),
  ] as const;
}

/**
 * Create theme-aware background gradient with hex opacity values (used in IslamicCalendarHeader)
 */
export function createThemeBackgroundGradient(
  backgroundColor: string
): readonly [string, string, string, string, string, string, string, string, string, string] {
  return [
    colors.transparent,
    colors.transparent,
    colors.transparent,
    `${backgroundColor}15`, // 15% opacity
    `${backgroundColor}40`, // 40% opacity
    `${backgroundColor}66`, // 66% opacity
    `${backgroundColor}99`, // 99% opacity
    `${backgroundColor}CC`, // CC% opacity
    `${backgroundColor}F2`, // F2% opacity
    backgroundColor,
  ] as const;
}

/**
 * Create simple overlay gradient for audio player (used in NowPlaying)
 */
export function createAudioOverlayGradient(shadowColor: string): readonly [string, string, string] {
  return [
    withOpacity(shadowColor, 0.3), // Lighter at top
    withOpacity(shadowColor, 0.5), // Medium in middle
    withOpacity(shadowColor, 0.7), // Darker at bottom for text readability
  ] as const;
}

/**
 * Create overlay colors for audio player controls
 */
export function createAudioOverlayColors(colors: ThemeColors): {
  controlBackground: string;
  progressBackground: string;
  dragIndicator: string;
  timerActive: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
} {
  return {
    controlBackground: withOpacity(colors.white, 0.28), // Using opacity.selection for interactive elements
    progressBackground: withOpacity(colors.white, 0.15), // Using opacity.border for tracks
    dragIndicator: withOpacity(colors.white, 0.68), // Using opacity.backdrop for visibility
    timerActive: withOpacity(colors.warning, 0.92), // Using opacity.modal for strong states
    textPrimary: colors.white, // Use theme-aware white for text
    textSecondary: withOpacity(colors.white, 0.85), // Secondary text
    textTertiary: withOpacity(colors.white, 0.75), // Tertiary text
  };
}
