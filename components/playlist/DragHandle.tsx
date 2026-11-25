import { Icon } from '@/components/ui';
import { Alert, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createAndroidRipple } from '@/utils/layoutUtils';

export interface DragHandleProps {
  onLongPress: () => void;
  moveEarlier?: () => void;
  moveLater?: () => void;
  delayLongPress: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const DragHandle = ({
  onLongPress,
  moveEarlier,
  moveLater,
  delayLongPress = TIMING_CONFIG.FAST.duration,
  style,
  testID,
  accessibilityLabel = STRINGS.PLAYLIST_A11Y_REORDER,
}: DragHandleProps) => {
  const colors = useColors();

  function showReorderActions() {
    Alert.alert(accessibilityLabel, undefined, [
      { text: STRINGS.CANCEL, style: 'cancel' },
      ...(moveEarlier ? [{ text: STRINGS.PLAYLIST_MOVE_EARLIER, onPress: moveEarlier }] : []),
      ...(moveLater ? [{ text: STRINGS.PLAYLIST_MOVE_LATER, onPress: moveLater }] : []),
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(moveEarlier || moveLater)}
      accessibilityActions={[
        ...(moveEarlier ? [{ name: 'earlier', label: STRINGS.PLAYLIST_MOVE_EARLIER }] : []),
        ...(moveLater ? [{ name: 'later', label: STRINGS.PLAYLIST_MOVE_LATER }] : []),
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'earlier') moveEarlier?.();
        if (nativeEvent.actionName === 'later') moveLater?.();
      }}
      style={[styles.container, style]}
      onPress={moveEarlier || moveLater ? showReorderActions : undefined}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      android_ripple={createAndroidRipple(colors)}
      testID={testID}
    >
      <Icon
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
