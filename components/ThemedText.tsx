import { memo, useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import {
  FONTS,
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
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
  skipDefaultColor?: boolean
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

/**
 * Base style lookup map for text types
 * Extracted to constant for performance optimization
 */
const BASE_STYLE_MAP: Record<string, any> = {
  body: null as any, // Will be assigned after styles object is created
  bodyBold: null as any,
  caption: null as any,
  heading1: null as any,
  heading2: null as any,
  heading3: null as any,
  label: null as any,
  link: null as any,
  overline: null as any,
};

/**
 * Get base style for text type
 * Uses pre-computed lookup map for O(1) access
 */
const getBaseStyle = (type: ThemedTextProps['type']) => {
  return BASE_STYLE_MAP[type as keyof typeof BASE_STYLE_MAP] || BASE_STYLE_MAP['body'];
};

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
function ThemedTextComponent({
  style,
  type = 'body', // Most common value - hardcoded
  variant,
  weight,
  align,
  colorName,
  skipDefaultColor = false, // Always false when not specified
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

  // Consolidated style computation with enhanced opacity handling
  const { finalStyle } = useMemo(() => {
    const textColor = getTextColor(colors, variant, colorName, skipDefaultColor);

    if (type === 'arabic') {
      // Use debounced font size for smooth updates, fallback to prop, then default
      const fontSize = debouncedArabicFontSize || arabicFontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE;

      return {
        finalStyle: [
          getArabicTextStyle(fontSize, {}, selectedArabicFont),
          textColor && { color: textColor },
          weight && { fontWeight: weight },
          align && { textAlign: align },
          style,
        ].filter(Boolean) as StyleProp<TextStyle>,
      };
    }

    const baseStyle = getBaseStyle(type);

    // Apply enhanced opacity for better contrast
    let enhancedStyle: TextStyle = {};
    if (baseStyle && 'opacity' in baseStyle && typeof baseStyle.opacity === 'number') {
      enhancedStyle.opacity = getEnhancedOpacity(baseStyle.opacity, isDarkMode);
    }

    const computedStyle = [
      baseStyle,
      enhancedStyle,
      textColor && { color: textColor },
      weight && { fontWeight: weight },
      align && { textAlign: align },
      style,
    ].filter(Boolean) as StyleProp<TextStyle>;

    return { finalStyle: computedStyle };
  }, [
    type,
    variant,
    colorName,
    skipDefaultColor,
    colors,
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

export const ThemedText = memo(ThemedTextComponent);

// Enhanced typography styles with micro-adjustments and semantic relationships
const styles = StyleSheet.create({
  // Base text styles with enhanced micro-typography
  body: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
  },
  bodyBold: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
  },
  caption: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY,
  },
  heading1: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.TIGHT,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
  },
  heading2: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    letterSpacing:
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.letterSpacing,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
  },
  heading3: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.LARGE *
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.lineHeightMultiplier,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
  },
  label: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY,
  },
  link: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.ACCENT,
    textDecorationLine: 'underline',
  },
  overline: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY,
    textTransform: 'uppercase',
  },
});

// Populate BASE_STYLE_MAP after styles are created
BASE_STYLE_MAP['body'] = styles.body;
BASE_STYLE_MAP['bodyBold'] = styles.bodyBold;
BASE_STYLE_MAP['caption'] = styles.caption;
BASE_STYLE_MAP['heading1'] = styles.heading1;
BASE_STYLE_MAP['heading2'] = styles.heading2;
BASE_STYLE_MAP['heading3'] = styles.heading3;
BASE_STYLE_MAP['label'] = styles.label;
BASE_STYLE_MAP['link'] = styles.link;
BASE_STYLE_MAP['overline'] = styles.overline;
