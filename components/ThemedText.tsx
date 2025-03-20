import { Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import React, { useMemo } from 'react';
import { ThemedTextProps } from '@/types/ui.types';

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

  // Map legacy types to new types for backward compatibility
  const actualType = useMemo(() => {
    // Use a mapping object to simplify legacy type conversion
    const legacyTypeMap: Record<string, string> = {
      default: 'body',
      title: 'heading1',
      subtitle: 'heading2',
      defaultSemiBold: 'bodyBold',
    };
    // @ts-ignore - The string comparison will work even though TypeScript doesn't recognize these types anymore
    return legacyTypeMap[type] || type;
  }, [type]);

  // Get color based on variant or colorName
  const textColor = useMemo(() => {
    // colorName takes precedence
    if (colorName) return colors[colorName];

    // Then check for variant
    if (variant) {
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
      return variantColorMap[variant];
    }

    // Default text color if not skipped
    if (!skipDefaultColor) return colors.text;

    return undefined;
  }, [variant, colorName, colors, skipDefaultColor]);

  // Consolidated style generation
  const textStyle = useMemo(() => {
    // Special handling for arabic type
    if (actualType === 'arabic') {
      // Filter out undefined values to reduce style array size
      return [
        getArabicTextStyle(arabicFontSize),
        textColor && { color: textColor },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ].filter(Boolean);
    }

    // Get base style from styles object, safely handle type
    // Fast-path for common types to avoid switch overhead
    const baseStyle =
      actualType === 'body'
        ? styles.body
        : actualType === 'heading1'
          ? styles.heading1
          : actualType === 'heading2'
            ? styles.heading2
            : styles[actualType as keyof typeof styles] || styles.body;

    // Special handling for link type (includes color)
    if (actualType === 'link' && !textColor) {
      // Filter out undefined values
      return [
        baseStyle,
        { color: colors.link },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ].filter(Boolean);
    }

    // Standard case - filter out undefined values
    return [
      baseStyle,
      textColor && { color: textColor },
      weight && { fontWeight: weight },
      align && { textAlign: align },
      style,
    ].filter(Boolean);
  }, [actualType, arabicFontSize, textColor, weight, align, style, colors.link]);

  return (
    <Text style={textStyle} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} {...rest} />
  );
}

// Memoize the component to prevent unnecessary rerenders
export const ThemedText = React.memo(ThemedTextComponent);

// Typography styles object using consistent line height calculations
const styles = StyleSheet.create({
  // Base text styles with consistent line height patterns
  body: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  bodyBold: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '600',
  },
  // Heading styles with consistent weight and line height
  heading1: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
    fontWeight: 'bold',
  },
  heading2: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
    fontWeight: 'bold',
  },
  heading3: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
    fontWeight: '600',
  },
  // Small text styles
  caption: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '500',
  },
  // Special text styles
  overline: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE,
  },
});
