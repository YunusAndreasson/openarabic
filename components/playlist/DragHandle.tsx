import { Ionicons } from '@/components/ui';
import type { FC } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { createAndroidRipple } from '@/utils/layoutUtils';

export interface DragHandleProps {
  onLongPress: () => void;
  delayLongPress: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const DragHandle: FC<DragHandleProps> = ({
  onLongPress,
  delayLongPress = TIMING_CONFIG.FAST.duration,
  style,
  testID,
}) => {
  const colors = useColors();

  return (
    <Pressable
      style={[styles.container, style]}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      android_ripple={createAndroidRipple(colors)}
      testID={testID}
    >
      <Ionicons
        name="reorder-three"
        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
        color={colors.secondaryText}
      />
    </Pressable>
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
