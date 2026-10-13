import { Ionicons } from '@/components/ui';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createAndroidRipple } from '@/utils/layoutUtils';

export interface DragHandleProps {
  onLongPress: () => void;
  delayLongPress: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const DragHandle = ({
  onLongPress,
  delayLongPress = TIMING_CONFIG.FAST.duration,
  style,
  testID,
  accessibilityLabel = STRINGS.PLAYLIST_A11Y_REORDER,
}: DragHandleProps) => {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={STRINGS.PLAYLIST_A11Y_REORDER_HINT}
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
