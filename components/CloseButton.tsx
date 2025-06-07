import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';

import { usePressAnimation } from '@/hooks/animations';
import type { CloseButtonProps } from '@/types/ui/button.types';

import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/theme/useColors';
import { lightFeedback } from '../utils/haptics';

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
});

/**
 * A reusable close button component with proper styling and haptic feedback
 */
export const CloseButton: React.FC<CloseButtonProps> = ({
  onPress,
  size = LAYOUT.BUTTON.HEIGHT.MEDIUM,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  color,
  style,
  hapticFeedback = false,
  accessibilityLabel = 'Close',
  accessibilityHint,
}) => {
  const colors = useColors();
  const pressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buttonSize = useMemo(() => {
    if (typeof size === 'number') return size;

    switch (size) {
      case 'large':
        return LAYOUT.BUTTON.HEIGHT.LARGE;
      case 'medium':
        return LAYOUT.BUTTON.HEIGHT.MEDIUM;
      case 'small':
      default:
        return LAYOUT.BUTTON.HEIGHT.SMALL;
    }
  }, [size]);

  const finalIconSize = useMemo(() => {
    if (typeof iconSize === 'number') return iconSize;

    switch (iconSize) {
      case 'large':
        return LAYOUT.BUTTON.ICON_SIZE.LARGE;
      case 'medium':
        return LAYOUT.BUTTON.ICON_SIZE.MEDIUM;
      case 'small':
      default:
        return LAYOUT.BUTTON.ICON_SIZE.SMALL;
    }
  }, [iconSize]);

  // Use the standardized press animation hook for consistent animation
  const { handlePressIn, handlePressOut } = usePressAnimation({
    type: 'button',
    scaleAmount: 0.9,
  });

  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
        pressTimeoutRef.current = null;
      }
    };
  }, []);

  const handlePress = () => {
    if (hapticFeedback) {
      lightFeedback();
    }

    // Small delay to ensure haptic feedback is felt
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }
    pressTimeoutRef.current = setTimeout(onPress, 50);
  };

  return (
    <TouchableOpacity
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.7}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      style={[
        {
          width: buttonSize,
          height: buttonSize,
        },
        styles.buttonContainer,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Ionicons color={color || colors.interactiveSecondary} name="close" size={finalIconSize} />
    </TouchableOpacity>
  );
};

export default CloseButton;
