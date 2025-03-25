import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ELEMENT_SIZES } from '../constants/ui';
import { lightFeedback } from '../utils/haptics';
import { getTouchableProps } from '../utils/accessibility';
import { CloseButtonProps } from '@/types/ui/button.types';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '@/hooks/animations';

/**
 * A reusable close button component with proper styling and haptic feedback
 */
export const CloseButton: React.FC<CloseButtonProps> = ({
  onPress,
  size = ELEMENT_SIZES.ICON.LARGE,
  iconSize = ELEMENT_SIZES.ICON.SMALL,
  color,
  style,
  hapticFeedback = true,
}) => {
  const colors = useColors();

  const buttonSize =
    typeof size === 'string'
      ? size === 'large'
        ? ELEMENT_SIZES.ICON.LARGE
        : ELEMENT_SIZES.ICON.SMALL
      : size;

  const finalIconSize =
    typeof iconSize === 'string'
      ? iconSize === 'large'
        ? ELEMENT_SIZES.ICON.LARGE
        : ELEMENT_SIZES.ICON.SMALL
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
            justifyContent: 'center',
            alignItems: 'center',
            ...LAYOUT.SHADOW.SMALL,
            shadowColor: colors.shadow,
          },
          style,
        ]}
      >
        <Ionicons name="close" size={finalIconSize} color={color || colors.tabIconDefault} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default CloseButton;
