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
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * A reusable close button component with proper styling and haptic feedback
 */
export const CloseButton: React.FC<CloseButtonProps> = ({
  onPress,
  size = LAYOUT.BUTTON.HEIGHT.LARGE,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.SMALL,
  color,
  style,
  hapticFeedback = true,
}) => {
  const colors = useColors();

  const buttonSize =
    typeof size === 'string'
      ? size === 'large'
        ? LAYOUT.BUTTON.HEIGHT.LARGE
        : LAYOUT.BUTTON.HEIGHT.SMALL
      : size;

  const finalIconSize =
    typeof iconSize === 'string'
      ? iconSize === 'large'
        ? LAYOUT.BUTTON.ICON_SIZE.LARGE
        : LAYOUT.BUTTON.ICON_SIZE.SMALL
      : iconSize;

  // Use the standardized press animation hook for consistent animation
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'button',
    scaleAmount: 0.95,
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
        activeOpacity={1}
        {...getTouchableProps('Close', 'large')}
        style={[
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: colors.cardBackground,
            ...LAYOUT.SHADOW.SMALL,
            shadowColor: colors.shadow,
          },
          styles.buttonContainer,
          style,
        ]}
      >
        <Ionicons name="close" size={finalIconSize} color={color || colors.tabIconDefault} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default CloseButton;
