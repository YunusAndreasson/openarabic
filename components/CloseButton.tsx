import React from 'react';
import { TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import * as Haptics from 'expo-haptics';

interface CloseButtonProps {
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  style?: ViewStyle;
  hapticFeedback?: boolean;
}

/**
 * A reusable close button component with proper styling and haptic feedback
 */
export const CloseButton: React.FC<CloseButtonProps> = ({
  onPress,
  size = 32,
  iconSize = 20,
  color,
  style,
  hapticFeedback = true,
}) => {
  const colors = useColors();

  const handlePress = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Small delay to ensure haptic feedback is felt
    setTimeout(onPress, 50);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.cardBackground,
          justifyContent: 'center',
          alignItems: 'center',
          ...LAYOUT.SHADOW.SMALL,
        },
        style,
      ]}
    >
      <Ionicons name="close" size={iconSize} color={color || colors.tabIconDefault} />
    </TouchableOpacity>
  );
};

export default CloseButton;
