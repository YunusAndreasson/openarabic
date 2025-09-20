import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, type ComponentProps, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET, enhanceTouchPadding } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

interface TouchableIconProps extends Omit<BaseIconButtonProps, 'icon'> {
  /** Icon name from Ionicons */
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Whether to use haptic feedback */
  hapticFeedback?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Auto-calculate optimal touch target size based on icon size
const getOptimalTouchTarget = (iconSize: number): number => {
  if (iconSize <= 16) return MIN_TOUCH_TARGET.MEDIUM;
  if (iconSize <= 24) return MIN_TOUCH_TARGET.MEDIUM;
  return MIN_TOUCH_TARGET.LARGE;
};

const TouchableIcon: FC<TouchableIconProps> = memo(
  ({ icon, size = 24, color, onPress, disabled = false, style, hapticFeedback = true }) => {
    const colors = useColors();
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
    });

    const handlePress = useCallback(() => {
      if (hapticFeedback) {
        selectionFeedback();
      }
      onPress();
    }, [hapticFeedback, onPress]);

    const touchTargetSize = getOptimalTouchTarget(size);

    const hitSlop = (() => {
      const padding = enhanceTouchPadding(size);
      return {
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
      };
    })();

    return (
      <AnimatedTouchable
        disabled={disabled}
        hitSlop={hitSlop}
        style={[
          styles.container,
          {
            width: touchTargetSize,
            height: touchTargetSize,
            opacity: disabled ? LAYOUT.OPACITY.MEDIUM : 1,
          },
          style,
          animatedStyle as ViewStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Ionicons color={color || colors.secondaryText} name={icon} size={size} />
      </AnimatedTouchable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
  },
});

TouchableIcon.displayName = 'TouchableIcon';

export default TouchableIcon;
