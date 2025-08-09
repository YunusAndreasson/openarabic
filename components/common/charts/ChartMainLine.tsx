import { Path } from '@shopify/react-native-skia';
import { memo } from 'react';

import { CHART_VISUAL } from '@charts/constants';

import { useColors } from '@/hooks/theme/useColors';

interface ChartMainLineProps {
  path: string;
}

/**
 * Shared main line component for all vocabulary charts
 * Renders the consistent tint-colored main line with rounded caps
 */
export const ChartMainLine = memo<ChartMainLineProps>(({ path }) => {
  const colors = useColors();

  if (!path) return null;

  return (
    <Path
      color={colors.tint}
      path={path}
      strokeCap="round"
      strokeJoin="round"
      strokeWidth={CHART_VISUAL.LINE_WIDTH}
      style="stroke"
    />
  );
});

ChartMainLine.displayName = 'ChartMainLine';
