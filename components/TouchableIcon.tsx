import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback } from '@/utils/haptics';

interface TouchableIconProps {
  /** Icon name from Ionicons */
  name: React.ComponentProps<typeof Ionicons>['name'];
  /** Icon size in pixels */
  size?: number;
  /** Icon color */
  color?: string;
  /** Press handler */
  onPress: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Size variant for the touch target */
  touchSize?: 'large' | 'medium' | 'small';
  /** Whether to use haptic feedback */
  hapticFeedback?: boolean;
  /** Hit slop override */
  hitSlop?: { top: number; right: number; bottom: number; left: number };
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const getTouchTargetSize = (size: 'large' | 'medium' | 'small'): number => {
  switch (size) {
    case 'small':
      return MIN_TOUCH_TARGET.SMALL;
    case 'large':
      return MIN_TOUCH_TARGET.LARGE;
    case 'medium':
    default:
      return MIN_TOUCH_TARGET.MEDIUM;
  }
};

const TouchableIcon: React.FC<TouchableIconProps> = memo(
  ({
    name,
    size = 24,
    color,
    onPress,
    disabled = false,
    style,
    touchSize = 'medium',
    hapticFeedback = true,
    hitSlop,
  }) => {
    const colors = useColors();
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

    const handlePress = React.useCallback(() => {
      if (hapticFeedback) {
        lightFeedback();
      }
      onPress();
    }, [hapticFeedback, onPress]);

    const touchTargetSize = getTouchTargetSize(touchSize);

    const defaultHitSlop = (() => {
      const padding = LAYOUT.TOUCH_TARGET.ENHANCE_PADDING(size);
      return {
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
      };
    })();

    return (
      <AnimatedTouchable
        activeOpacity={LAYOUT.OPACITY.PRESSED}
        disabled={disabled}
        hitSlop={hitSlop || defaultHitSlop}
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
        <Ionicons color={color || colors.secondaryText} name={name} size={size} />
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
