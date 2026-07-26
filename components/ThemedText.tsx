import { useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { FONTS } from '@/constants/fonts';
import {
  LAYOUT,
  LETTER_SPACING,
  LINE_HEIGHT_MULTIPLIERS,
  TEXT_OPACITY,
  TEXT_STYLES,
  getArabicTextStyle,
  getCompactArabicTextStyle,
  getEnhancedOpacity,
} from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store/store';
import type { ThemedTextProps } from '@/types/ui/text.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Extract selector outside component to avoid recreation on every render
const selectArabicFont = (state: RootState) => state.settings.arabicFont;

/**
 * Enhanced text color function with semantic color support
 * Extracted to module level for performance optimization
 */
const getTextColor = (
  colors: ThemeColors,
  variant?: ThemedTextProps['variant'],
  colorName?: ThemedTextProps['colorName'],
  skipDefaultColor?: boolean,
): string | undefined => {
  if (colorName) {
    const color = colors[colorName];
    // ThemedText only uses string colors, not gradient arrays
    return typeof color === 'string' ? color : undefined;
  }
  if (variant) {
    const variantColorMap = {
      error: colors.error,
      primary: colors.text,
      secondary: colors.secondaryText,
    } as const;
    return variantColorMap[variant];
  }
  return !skipDefaultColor ? colors.text : undefined;
};

// Enhanced typography styles with micro-adjustments and semantic relationships
const styles = StyleSheet.create({
  body: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    letterSpacing: LETTER_SPACING.SLIGHT_POSITIVE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  bodyBold: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    letterSpacing: LETTER_SPACING.TIGHT,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  caption: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: LETTER_SPACING.SLIGHT_POSITIVE, // 0.1 - MD3 body-small standard for mixed-case
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.LOOSE,
    opacity: LAYOUT.OPACITY.HIGH, // Secondary text best practice (~70%)
  },
  heading1: {
    fontFamily: FONTS.ENGLISH_BOLD,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    letterSpacing: LETTER_SPACING.TIGHT,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LINE_HEIGHT_MULTIPLIERS.TIGHT,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  heading2: {
    fontFamily: FONTS.ENGLISH_BOLD,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    letterSpacing: TEXT_STYLES.SECTION_HEADER.letterSpacing,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * TEXT_STYLES.SECTION_HEADER.lineHeightMultiplier,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  heading3: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * TEXT_STYLES.CARD_TITLE.lineHeightMultiplier,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  label: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.SECONDARY,
  },
  overline: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: LETTER_SPACING.ULTRA_WIDE * 2, // ~9% of font size - within 5-12% best practice for all-caps
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: LAYOUT.OPACITY.HOVER, // Auxiliary labels - visible but not competing with primary content
    textTransform: 'uppercase',
  },
});

/** Immutable style lookup map - created once after styles */
const BASE_STYLE_MAP = {
  body: styles.body,
  bodyBold: styles.bodyBold,
  caption: styles.caption,
  heading1: styles.heading1,
  heading2: styles.heading2,
  heading3: styles.heading3,
  label: styles.label,
  overline: styles.overline,
} as const;

/** Maps semantic weight names to Source Sans 3 font families */
const WEIGHT_FONT_MAP = {
  bold: FONTS.ENGLISH_BOLD,
  medium: FONTS.ENGLISH,
  normal: FONTS.ENGLISH,
  semibold: FONTS.ENGLISH_SEMIBOLD,
} as const satisfies Record<NonNullable<ThemedTextProps['weight']>, string>;

/**
 * ThemedText component provides consistent typography across the app
 * with automatic theming support and various text styles.
 * Enhanced with sophisticated color relationships and micro-typography optimizations.
 *
 * @example
 * // Default body text with theme colors
 * <ThemedText>Regular text</ThemedText>
 *
 * // Title text with enhanced typography
 * <ThemedText type="heading1">Title</ThemedText>
 *
 * // Semantic variants with optimized colors
 * <ThemedText variant="error">Error message</ThemedText>
 *
 * // Custom semantic color from enhanced system
 * <ThemedText colorName="authorText">Author byline</ThemedText>
 */
export function ThemedText({
  style,
  type = 'body',
  variant,
  weight,
  align,
  colorName,
  skipDefaultColor = false,
  numberOfLines,
  ellipsizeMode,
  ...rest
}: ThemedTextProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const selectedArabicFont = useAppSelector(selectArabicFont);
  const isArabic = type === 'arabic' || type === 'arabicCompact';
  // Only use debounced font size for Arabic text to prevent flickering during slider changes
  const debouncedArabicFontSize = useDebouncedArabicFontSize(isArabic ? 100 : 0);

  // Memoize style computation to prevent unnecessary recalculations
  const finalStyle = useMemo((): StyleProp<TextStyle> => {
    const textColor = getTextColor(colors, variant, colorName, skipDefaultColor);

    if (isArabic) {
      const fontSize = debouncedArabicFontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE;
      // `weight` is deliberately ignored here: WEIGHT_FONT_MAP names Inter
      // families, which carry no Arabic glyphs, so applying it silently
      // discarded the user's chosen Arabic font for an OS fallback face.
      // Emphasize Arabic with size or color instead.
      return [
        type === 'arabicCompact'
          ? getCompactArabicTextStyle(fontSize, selectedArabicFont)
          : getArabicTextStyle(fontSize, {}, selectedArabicFont),
        textColor && { color: textColor },
        align && { textAlign: align },
        style,
      ].filter(Boolean);
    }

    const baseStyle = BASE_STYLE_MAP[type] || BASE_STYLE_MAP.body;

    // When an explicit color is provided (colorName or variant), the semantic color
    // already encodes the hierarchy — skip the type's built-in opacity to avoid double-dimming.
    // Opacity-based hierarchy only applies to default-colored text.
    const baseOpacity = colorName || variant ? TEXT_OPACITY.PRIMARY : baseStyle.opacity;

    return [
      baseStyle,
      { opacity: getEnhancedOpacity(baseOpacity, isDarkMode) },
      textColor && { color: textColor },
      weight && { fontFamily: WEIGHT_FONT_MAP[weight] },
      align && { textAlign: align },
      style,
    ].filter(Boolean);
  }, [
    colors,
    variant,
    colorName,
    skipDefaultColor,
    type,
    isArabic,
    debouncedArabicFontSize,
    selectedArabicFont,
    weight,
    align,
    style,
    isDarkMode,
  ]);

  return (
    <Text
      ellipsizeMode={ellipsizeMode}
      numberOfLines={numberOfLines}
      style={finalStyle}
      {...rest}
    />
  );
}

ThemedText.displayName = 'ThemedText';
