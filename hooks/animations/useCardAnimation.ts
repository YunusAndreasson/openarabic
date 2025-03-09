import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { springConfig } from './useButtonAnimation';

/**
 * Hook for card press animation with scale and opacity effect
 * @param scaleAmount - Amount to scale down on press (default 0.985)
 * @param opacityAmount - Amount to reduce opacity on press (default 0.97)
 * @returns Animation controls and style for the card
 */
export const useCardAnimation = (scaleAmount = 0.985, opacityAmount = 0.97) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, scaleAmount], Extrapolate.CLAMP);
    const opacity = interpolate(pressed.value, [0, 1], [1, opacityAmount], Extrapolate.CLAMP);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const handlePressIn = () => {
    pressed.value = withSpring(1, springConfig);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, springConfig);
  };

  return {
    animatedStyle,
    pressed,
    handlePressIn,
    handlePressOut,
  };
};
