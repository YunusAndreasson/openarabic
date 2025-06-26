import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import React, { useMemo } from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import Animated, { Extrapolate, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useColors } from '@/hooks/theme/useColors';

interface ThemedBackdropProps extends BottomSheetBackdropProps {
  onPress?: () => void;
}

/**
 * Custom backdrop component that integrates with our theme colors
 * Fixes the brightness issue where default backdrop makes background appear brighter
 */
export const ThemedBackdrop: React.FC<ThemedBackdropProps> = ({
  animatedIndex,
  style,
  onPress,
  ...props
}) => {
  const colors = useColors();

  // Create animated style that interpolates backdrop opacity
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolate.CLAMP),
  }));

  // Combine styles with our theme colors
  const containerStyle = useMemo(
    () => [
      style,
      {
        backgroundColor: colors.backdropOverlay, // Use our theme's backdrop color
      },
      containerAnimatedStyle,
    ],
    [style, colors.backdropOverlay, containerAnimatedStyle]
  );

  if (onPress) {
    return (
      <TouchableWithoutFeedback onPress={onPress}>
        <Animated.View style={containerStyle} {...props} />
      </TouchableWithoutFeedback>
    );
  }

  return <Animated.View style={containerStyle} {...props} />;
};
