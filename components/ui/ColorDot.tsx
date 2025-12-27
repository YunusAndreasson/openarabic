import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ColorDotProps {
  color: string;
  size?: 'small' | 'medium';
}

/**
 * A simple colored dot indicator.
 * Used for memory strength indicators and status dots.
 *
 * Sizes:
 * - small: 8px (default) - used in card indicators
 * - medium: 12px - used in larger contexts
 */
export const ColorDot: FC<ColorDotProps> = memo(({ color, size = 'small' }) => {
  const dotSize = size === 'small' ? LAYOUT.SPACING.SMALL : LAYOUT.SPACING.MEDIUM;
  return (
    <View
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
});

ColorDot.displayName = 'ColorDot';

const styles = StyleSheet.create({
  dot: {},
});
