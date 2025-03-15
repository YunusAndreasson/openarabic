import { Text, type TextProps, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import React, { useMemo } from 'react';
import { ThemedTextProps } from '@/types/ui.types';

function ThemedTextComponent({
  style,
  type = 'default',
  skipDefaultColor = false,
  arabicFontSize = LAYOUT.TYPOGRAPHY.SCALE.LARGE,
  ...rest
}: ThemedTextProps) {
  const colors = useColors();

  // Memoize the style array to prevent new object creation on each render
  const textStyle = useMemo(
    () => [
      type === 'default' ? styles.default : undefined,
      type === 'title' ? styles.title : undefined,
      type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
      type === 'subtitle' ? styles.subtitle : undefined,
      type === 'link' ? [styles.link, { color: colors.link }] : undefined,
      type === 'arabic' ? getArabicTextStyle(arabicFontSize) : undefined,
      !skipDefaultColor ? { color: colors.text } : undefined,
      style,
    ],
    [colors, skipDefaultColor, style, type, arabicFontSize]
  );

  return <Text style={textStyle} {...rest} />;
}

// Memoize the component to prevent unnecessary rerenders
export const ThemedText = React.memo(ThemedTextComponent);

const styles = StyleSheet.create({
  default: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  defaultSemiBold: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '600',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: 'bold',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
  },
});
