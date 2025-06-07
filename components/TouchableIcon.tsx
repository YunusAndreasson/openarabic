import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { TouchableOpacity, StyleSheet } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
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
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Hit slop override */
  hitSlop?: { top: number; right: number; bottom: number; left: number };
}

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
    accessibilityLabel,
    hitSlop,
  }) => {
    const colors = useColors();

    const handlePress = () => {
      if (hapticFeedback) {
        lightFeedback();
      }
      onPress();
    };

    const touchTargetSize = (() => {
      switch (touchSize) {
        case 'small':
          return MIN_TOUCH_TARGET.SMALL;
        case 'large':
          return MIN_TOUCH_TARGET.SIZE;
        default:
          return MIN_TOUCH_TARGET.MEDIUM;
      }
    })();

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
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
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
        ]}
        onPress={handlePress}
      >
        <Ionicons color={color || colors.textSecondary} name={name} size={size} />
      </TouchableOpacity>
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
