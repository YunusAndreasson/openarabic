import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface DragHandleProps {
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: any;
}

const DragHandle: React.FC<DragHandleProps> = ({ onLongPress, delayLongPress = 100, style }) => {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      activeOpacity={0.6}
    >
      <Ionicons name="reorder-three-outline" size={22} color={colors.secondaryText} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: MIN_TOUCH_TARGET.SIZE,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.SIZE,
  },
});

export default DragHandle;
