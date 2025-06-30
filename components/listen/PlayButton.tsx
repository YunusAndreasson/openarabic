import { Ionicons } from '@expo/vector-icons';
import { useCallback, type ComponentProps, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ICON_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

interface PlayButtonProps
  extends Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'> {
  isPlaying?: boolean;
  iconColor?: string;
}

function getIconName(isPlaying: boolean) {
  return isPlaying ? 'pause' : 'play';
}

const PlayButton: FC<PlayButtonProps> = ({
  onPress,
  isPlaying = false,
  disabled = false,
  iconColor,
}) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    scaleAmount: ICON_BUTTON_PRESS_SCALE,
  });

  const handlePress = useCallback(() => {
    if (disabled) return;
    selectionFeedback();
    onPress();
  }, [disabled, onPress]);

  const backgroundColor = colors.tint;
  const resolvedIconColor = iconColor || colors.text;

  return (
    <TouchableOpacity
      activeOpacity={LAYOUT.OPACITY.HIGH}
      style={[styles.button, { backgroundColor: colors.tint }]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
    >
      <Animated.View
        style={[
          styles.button,
          animatedStyle as ViewStyle,
          {
            backgroundColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name={getIconName(isPlaying)}
          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
          color={resolvedIconColor}
          style={styles.icon}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    ...LAYOUT.ELEVATION.SUBTLE,
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
  icon: {
    marginLeft: LAYOUT.SPACING.MICRO,
  },
});

export default PlayButton;
