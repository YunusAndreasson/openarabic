import { useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import {
  FONTS,
  FONT_WEIGHTS,
  LAYOUT,
  LETTER_SPACING,
  LINE_HEIGHT_MULTIPLIERS,
  TEXT_OPACITY,
  TEXT_STYLES,
  getArabicTextStyle,
  getEnhancedOpacity,
} from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useAppSelector } from '@/store/hooks';
import type { ThemedTextProps } from '@/types/ui/text.types';
import type { ThemeColors } from '@/types/ui/theme.types';

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
      warning: colors.warning,
      success: colors.success,
      info: colors.info,
      primary: colors.text,
      secondary: colors.secondaryText,
      subtle: colors.textTertiary,
      disabled: colors.disabled,
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
    fontWeight: FONT_WEIGHTS.REGULAR,
    letterSpacing: LETTER_SPACING.NORMAL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  bodyBold: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  caption: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    letterSpacing: LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.LOOSE,
    opacity: TEXT_OPACITY.TERTIARY,
  },
  heading1: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LINE_HEIGHT_MULTIPLIERS.TIGHT,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  heading2: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: TEXT_STYLES.SECTION_HEADER.letterSpacing,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * TEXT_STYLES.SECTION_HEADER.lineHeightMultiplier,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  heading3: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * TEXT_STYLES.CARD_TITLE.lineHeightMultiplier,
    opacity: TEXT_OPACITY.PRIMARY,
  },
  label: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    letterSpacing: LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.SECONDARY,
  },
  link: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    letterSpacing: LETTER_SPACING.NORMAL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.ACCENT,
    textDecorationLine: 'underline',
  },
  overline: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    letterSpacing: LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TEXT_OPACITY.TERTIARY,
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
  link: styles.link,
  overline: styles.overline,
} as const;

type TextTypeName = keyof typeof BASE_STYLE_MAP;

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
  arabicFontSize,
  ...rest
}: ThemedTextProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const selectedArabicFont = useAppSelector(state => state.settings.arabicFont);
  // Only use debounced font size for Arabic text to prevent flickering during slider changes
  const debouncedArabicFontSize = useDebouncedArabicFontSize(type === 'arabic' ? 100 : 0);

  // Memoize style computation to prevent unnecessary recalculations
  const finalStyle = useMemo((): StyleProp<TextStyle> => {
    const textColor = getTextColor(colors, variant, colorName, skipDefaultColor);

    if (type === 'arabic') {
      const fontSize = debouncedArabicFontSize || arabicFontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE;
      return [
        getArabicTextStyle(fontSize, {}, selectedArabicFont),
        textColor && { color: textColor },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ].filter(Boolean) as StyleProp<TextStyle>;
    }

    const baseStyle = BASE_STYLE_MAP[type as TextTypeName] || BASE_STYLE_MAP.body;
    const enhancedOpacity =
      baseStyle && 'opacity' in baseStyle && typeof baseStyle.opacity === 'number'
        ? getEnhancedOpacity(baseStyle.opacity, isDarkMode)
        : undefined;

    return [
      baseStyle,
      enhancedOpacity !== undefined && { opacity: enhancedOpacity },
      textColor && { color: textColor },
      weight && { fontWeight: weight },
      align && { textAlign: align },
      style,
    ].filter(Boolean) as StyleProp<TextStyle>;
  }, [
    colors,
    variant,
    colorName,
    skipDefaultColor,
    type,
    debouncedArabicFontSize,
    arabicFontSize,
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
