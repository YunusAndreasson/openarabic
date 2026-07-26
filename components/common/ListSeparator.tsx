import { View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ListSeparatorProps {
  height?: number;
  /**
   * Paints the separator instead of leaving empty space. Pair with
   * `height={StyleSheet.hairlineWidth}` and a theme border color for a rule;
   * omit it for a plain gap between cards.
   */
  color?: string;
}

export function ListSeparator({ height = LAYOUT.SPACING.MEDIUM, color }: ListSeparatorProps) {
  const separatorStyle = { height, backgroundColor: color };
  return <View style={separatorStyle} />;
}
