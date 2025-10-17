import { View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ListSeparatorProps {
  height?: number;
}

export function ListSeparator({ height = LAYOUT.SPACING.MEDIUM }: ListSeparatorProps) {
  const separatorStyle = { height };
  return <View style={separatorStyle} />;
}

