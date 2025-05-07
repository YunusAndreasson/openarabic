/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, memo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text, StyleSheet } from 'react-native';

import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { ThemedTextProps } from '@/types/ui/text.types';

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
  const isDarkMode = useIsDarkMode();

  // Get text color based on props
  const getTextColor = (
    colors: ReturnType<typeof useColors>,
    variant?: ThemedTextProps['variant'],
    colorName?: ThemedTextProps['colorName'],
    skipDefaultColor?: boolean,
    isDarkMode?: boolean
  ) => {
    if (colorName) return colors[colorName];
    if (variant) {
      const variantColorMap = {
        error: colors.error,
        warning: colors.warning,
        success: colors.success,
        info: colors.info,
        primary: colors.text,
        secondary: isDarkMode ? colors.secondaryText : colors.authorText,
        subtle: isDarkMode ? colors.secondaryText : colors.authorText,
        disabled: colors.tabIconDefault,
      } as const;
      return variantColorMap[variant];
    }
    return !skipDefaultColor ? colors.text : undefined;
  };

  // Get base style for text type
  const getBaseStyle = (type: ThemedTextProps['type']) => {
    if (type === 'body') return styles.body;
    if (type === 'heading1') return styles.heading1;
    if (type === 'heading2') return styles.heading2;
    return styles[type as keyof typeof styles] || styles.body;
  };

  // Consolidated style computation
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
    const computedStyle = [
      baseStyle,
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
      style={finalStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      {...rest}
    />
  );
}

// Memoize the component to prevent unnecessary rerenders
export const ThemedText = memo(ThemedTextComponent);

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
  caption: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
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
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  link: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textDecorationLine: 'underline',
  },
  overline: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
    letterSpacing: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textTransform: 'uppercase',
  },
});
