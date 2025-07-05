import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, type FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

interface InfoIconProps {
  onPress: () => void;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SIZES = {
  small: {
    iconSize: LAYOUT.BUTTON.ICON_SIZE.SMALL,
    containerSize: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
    padding: LAYOUT.SPACING.SMALL,
  },
  medium: {
    iconSize: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    containerSize: LAYOUT.BUTTON.ICON_SIZE.MEDIUM + LAYOUT.SPACING.MEDIUM * 2,
    padding: LAYOUT.SPACING.MEDIUM,
  },
} as const;

export const InfoIcon: FC<InfoIconProps> = ({ onPress, size = 'small', style }) => {
  const colors = useColors();
  const scale = useSharedValue(1);
  const sizeConfig = SIZES[size];

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    selectionFeedback();
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = useMemo(
    () => ({
      backgroundColor: colors.tintBackground,
      borderColor: colors.borderOverlay,
      width: sizeConfig.containerSize,
      height: sizeConfig.containerSize,
      borderRadius: sizeConfig.containerSize / 2, // Perfect circle
      padding: sizeConfig.padding,
    }),
    [colors, sizeConfig]
  );

  return (
    <AnimatedTouchableOpacity
      style={[styles.container, containerStyle, animatedStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
      hitSlop={{
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      }}
    >
      <Ionicons name="information-outline" size={sizeConfig.iconSize} color={colors.tint} />
    </AnimatedTouchableOpacity>
  );
};

InfoIcon.displayName = 'InfoIcon';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    justifyContent: 'center',
  },
});

export default memo(InfoIcon);
