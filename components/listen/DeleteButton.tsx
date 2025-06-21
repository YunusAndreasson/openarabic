import { Ionicons } from '@expo/vector-icons';
import { useCallback, type ComponentProps, type FC } from 'react';
import { StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ICON_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

const DeleteButton: FC<
  Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'>
> = ({ onPress, disabled = false }) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: ICON_BUTTON_PRESS_SCALE,
  });

  const handlePress = useCallback(() => {
    if (disabled) return;

    selectionFeedback();
    onPress();
  }, [disabled, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={LAYOUT.OPACITY.HOVER}
      style={styles.touchable}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle as ViewStyle,
          {
            backgroundColor: colors.error, // Using error color from Colors.ts
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name="trash"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          color={colors.white} // Using white color from Colors.ts
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    ...LAYOUT.ELEVATION.SMALL,
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2, // Circular
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
});

export default DeleteButton;
