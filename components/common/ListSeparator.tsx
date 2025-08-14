import { memo } from 'react';
import { View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ListSeparatorProps {
  height?: number;
}

const ListSeparator = memo(({ height = LAYOUT.SPACING.MEDIUM }: ListSeparatorProps) => {
  const separatorStyle = { height };
  return <View style={separatorStyle} />;
});

ListSeparator.displayName = 'ListSeparator';

export default ListSeparator;
