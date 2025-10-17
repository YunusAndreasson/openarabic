import { View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ListSeparatorProps {
  height?: number;
}

function ListSeparator({ height = LAYOUT.SPACING.MEDIUM }: ListSeparatorProps) {
  const separatorStyle = { height };
  return <View style={separatorStyle} />;
}

export default ListSeparator;
