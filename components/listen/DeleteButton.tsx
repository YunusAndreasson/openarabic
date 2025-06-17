import { Ionicons } from '@expo/vector-icons';
import { useCallback, type FC, type ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

const DeleteButton: FC<
  Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'>
> = ({ onPress, disabled = false }) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: 0.9,
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
      accessibilityRole="button"
      accessibilityLabel={STRINGS.DELETE_ARTICLE_A11Y_LABEL}
      accessibilityHint={STRINGS.DELETE_ARTICLE_A11Y_HINT}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
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
