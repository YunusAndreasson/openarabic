import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

// Default spring configuration for consistent feel across the app
export const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

/**
 * Hook for button press animation with scale effect
 * @param scaleAmount - Amount to scale down on press (default 0.97)
 * @returns Animation controls and style for the button
 */
export const useButtonAnimation = (scaleAmount = 0.97) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, scaleAmount], Extrapolate.CLAMP);

    return {
      transform: [{ scale }],
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
    handlePressIn,
    handlePressOut,
  };
};
