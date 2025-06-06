import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
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
  touchSize?: 'small' | 'medium' | 'large';
  /** Whether to use haptic feedback */
  hapticFeedback?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Hit slop override */
  hitSlop?: { top: number; right: number; bottom: number; left: number };
}

/* eslint-disable react/prop-types */
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
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.container,
          {
            width: touchTargetSize,
            height: touchTargetSize,
            opacity: disabled ? LAYOUT.OPACITY.DISABLED : 1,
          },
          style,
        ]}
        activeOpacity={LAYOUT.OPACITY.PRESSED}
        hitSlop={hitSlop || defaultHitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        <Ionicons name={name} size={size} color={color || colors.textSecondary} />
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
