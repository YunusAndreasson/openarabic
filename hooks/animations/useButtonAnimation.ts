import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SPRING_CONFIG } from './animationConfigs';

/**
 * Hook for button press animation with scale effect
 * @param scaleAmount - Amount to scale down on press (default 0.97)
 * @returns Animation controls and style for the button
 */
export const useButtonAnimation = (scaleAmount = 0.97) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, scaleAmount], Extrapolation.CLAMP);

    return {
      transform: [{ scale }],
    };
  });

  const handlePressIn = () => {
    'worklet';
    pressed.value = withSpring(1, SPRING_CONFIG.BUTTON);
  };

  const handlePressOut = () => {
    'worklet';
    pressed.value = withSpring(0, SPRING_CONFIG.BUTTON);
  };

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
    pressed,
  };
};
