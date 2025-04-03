import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { lightFeedback } from '../utils/haptics';
import { getTouchableProps } from '../utils/accessibility';
import { CloseButtonProps } from '@/types/ui/button.types';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '@/hooks/animations';

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
  hapticFeedback = true,
}) => {
  const colors = useColors();

  const buttonSize = React.useMemo(() => {
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

  const finalIconSize = React.useMemo(() => {
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
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'button',
    scaleAmount: 0.9,
  });

  const handlePress = () => {
    if (hapticFeedback) {
      lightFeedback();
    }

    // Small delay to ensure haptic feedback is felt
    setTimeout(onPress, 50);
  };

  return (
    <Animated.View style={animatedStyle as any}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        {...getTouchableProps('Close', 'large')}
        style={[
          {
            width: buttonSize,
            height: buttonSize,
          },
          styles.buttonContainer,
          style,
        ]}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons name="close-outline" size={finalIconSize} color={color || colors.tint} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default CloseButton;
