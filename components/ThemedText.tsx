import React, { useMemo, memo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text, StyleSheet } from 'react-native';

import {
  LAYOUT,
  getArabicTextStyle,
  FONTS,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
} from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { ThemedTextProps } from '@/types/ui/text.types';

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
  type = 'body',
  variant,
  weight,
  align,
  colorName,
  skipDefaultColor = false,
  numberOfLines,
  ellipsizeMode,
  arabicFontSize = LAYOUT.TYPOGRAPHY.SCALE.LARGE,
  ...rest
}: ThemedTextProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Enhanced text color function with semantic color support
  const getTextColor = (
    colors: ReturnType<typeof useColors>,
    variant?: ThemedTextProps['variant'],
    colorName?: ThemedTextProps['colorName'],
    skipDefaultColor?: boolean
  ) => {
    if (colorName) return colors[colorName];
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

  // Enhanced base style function with micro-typography optimizations
  const getBaseStyle = (type: ThemedTextProps['type']) => {
    const baseStyles = {
      body: styles.body,
      bodyBold: styles.bodyBold,
      caption: styles.caption,
      heading1: styles.heading1,
      heading2: styles.heading2,
      heading3: styles.heading3,
      label: styles.label,
      link: styles.link,
      overline: styles.overline,
    };

    return baseStyles[type as keyof typeof baseStyles] || styles.body;
  };

  // Consolidated style computation with enhanced opacity handling
  const { finalStyle } = useMemo(() => {
    const textColor = getTextColor(colors, variant, colorName, skipDefaultColor, isDarkMode);

    if (type === 'arabic') {
      return {
        finalStyle: [
          getArabicTextStyle(arabicFontSize),
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
    arabicFontSize,
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

// Memoize the component to prevent unnecessary rerenders
export const ThemedText = memo(ThemedTextComponent);

// Enhanced typography styles with micro-adjustments and semantic relationships
const styles = StyleSheet.create({
  // Base text styles with enhanced micro-typography
  body: {
    fontFamily: FONTS.ENGLISH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    letterSpacing:
      TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL +
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.RENDERING.SPACING_BOOST,
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
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_TIGHT,
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
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_LOOSE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    opacity: TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY,
    textTransform: 'uppercase',
  },
});
