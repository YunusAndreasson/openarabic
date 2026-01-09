import { memo, type FC } from 'react';
import { View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ColorDotProps {
  color: string;
}

/**
 * A simple colored dot indicator.
 * Used for memory strength indicators and status dots.
 * Size: 8px (LAYOUT.SPACING.SMALL)
 */
export const ColorDot: FC<ColorDotProps> = memo(({ color }) => {
  return (
    <View
      style={{
        width: LAYOUT.SPACING.SMALL,
        height: LAYOUT.SPACING.SMALL,
        borderRadius: LAYOUT.SPACING.SMALL / 2,
        backgroundColor: color,
      }}
    />
  );
});

ColorDot.displayName = 'ColorDot';
