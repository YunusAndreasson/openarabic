/* eslint-disable react-native/no-unused-styles */
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import React, { useMemo } from 'react';
import { ThemedTextProps } from '@/types/ui/text.types';

/**
 * ThemedText component provides consistent typography across the app
 * with automatic theming support and various text styles.
 *
 * @example
 * // Default body text with theme colors
 * <ThemedText>Regular text</ThemedText>
 *
 * // Title text
 * <ThemedText type="heading1">Title</ThemedText>
 *
 * // Semantic variants
 * <ThemedText variant="error">Error message</ThemedText>
 *
 * // Custom color from theme
 * <ThemedText colorName="link">Link text</ThemedText>
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

  // Consolidated style computation - combines both type mapping and style generation
  const { finalStyle } = useMemo(() => {
    // Get color based on variant or colorName
    let textColor;
    // colorName takes precedence
    if (colorName) {
      textColor = colors[colorName];
    }
    // Then check for variant
    else if (variant) {
      const variantColorMap = {
        error: colors.error,
        warning: colors.warning,
        success: colors.success,
        info: colors.info,
        primary: colors.text,
        secondary: colors.authorText,
        subtle: colors.authorText,
        disabled: colors.tabIconDefault,
      };
      textColor = variantColorMap[variant];
    }
    // Default text color if not skipped
    else if (!skipDefaultColor) {
      textColor = colors.text;
    }

    // Style generation
    let computedStyle;
    // Special handling for arabic type
    if (type === 'arabic') {
      // Filter out undefined values to reduce style array size
      computedStyle = [
        getArabicTextStyle(arabicFontSize),
        textColor && { color: textColor },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ].filter(Boolean) as StyleProp<TextStyle>;
    } else {
      // Get base style from styles object, safely handle type
      // Fast-path for common types to avoid switch overhead
      const baseStyle =
        type === 'body'
          ? styles.body
          : type === 'heading1'
            ? styles.heading1
            : type === 'heading2'
              ? styles.heading2
              : styles[type as keyof typeof styles] || styles.body;

      // Special handling for link type (includes color)
      if (type === 'link' && !textColor) {
        // Filter out undefined values
        computedStyle = [
          baseStyle,
          { color: colors.link },
          weight && { fontWeight: weight },
          align && { textAlign: align },
          style,
        ].filter(Boolean) as StyleProp<TextStyle>;
      } else {
        // Standard case - filter out undefined values
        computedStyle = [
          baseStyle,
          textColor && { color: textColor },
          weight && { fontWeight: weight },
          align && { textAlign: align },
          style,
        ].filter(Boolean) as StyleProp<TextStyle>;
      }
    }

    return { finalStyle: computedStyle };
  }, [type, variant, colorName, skipDefaultColor, colors, arabicFontSize, weight, align, style]);

  return (
    <Text
      style={finalStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      {...rest}
    />
  );
}

// Memoize the component to prevent unnecessary rerenders
export const ThemedText = React.memo(ThemedTextComponent);

// Typography styles object using consistent line height calculations
const styles = StyleSheet.create({
  // Base text styles with consistent line height patterns
  body: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  bodyBold: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: 'bold',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  // Heading styles with consistent weight and line height
  heading1: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: 'bold',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  heading2: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: 'bold',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  heading3: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  caption: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  overline: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
    letterSpacing: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textDecorationLine: 'underline',
  },
});
