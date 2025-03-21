import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ELEMENT_SIZES } from '../constants/ui';
import { mediumFeedback } from '../utils/haptics';
import { getTouchableProps } from '../utils/accessibility';
import { CloseButtonProps } from '@/types/ui.types';

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

  const handlePress = () => {
    if (hapticFeedback) {
      mediumFeedback();
    }

    // Small delay to ensure haptic feedback is felt
    setTimeout(onPress, 50);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      {...getTouchableProps('Close', 'large')}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.cardBackground,
          justifyContent: 'center',
          alignItems: 'center',
          ...LAYOUT.SHADOW.SMALL,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      <Ionicons name="close" size={iconSize} color={color || colors.tabIconDefault} />
    </TouchableOpacity>
  );
};

export default CloseButton;
