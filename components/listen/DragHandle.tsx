import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

import { QUICK_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export interface DragHandleProps {
  onLongPress: () => void;
  delayLongPress: number;
  style?: StyleProp<ViewStyle>;
}

const DragHandle: FC<DragHandleProps> = ({
  onLongPress,
  delayLongPress = QUICK_ANIMATION_DURATION,
  style,
}) => {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
    >
      <Ionicons
        name="reorder-three-outline"
        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
        color={colors.secondaryText}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: MIN_TOUCH_TARGET.LARGE,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.LARGE,
  },
});

export default DragHandle;
