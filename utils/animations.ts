import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  WithSpringConfig,
  WithTimingConfig,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LAYOUT } from '../constants/layout';

// Default spring configuration for consistent feel across the app
export const springConfig: WithSpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

// Default timing configuration for consistent feel across the app
export const timingConfig: WithTimingConfig = {
  duration: LAYOUT.ANIMATION.DURATION.NORMAL,
};

// Button press animation
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
    pressed,
    handlePressIn,
    handlePressOut,
  };
};

// Card press animation
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

// Staggered fade-in animation for lists
export const useStaggeredFadeIn = (itemCount: number, initialDelay = 0) => {
  return Array.from({ length: itemCount }).map((_, index) => {
    const animationDelay = initialDelay + index * 50; // 50ms staggered delay

    return {
      from: {
        opacity: 0,
        transform: [{ translateY: 20 }],
      },
      to: {
        opacity: 1,
        transform: [{ translateY: 0 }],
      },
      transition: {
        opacity: { delay: animationDelay, duration: 300 },
        transform: { delay: animationDelay, duration: 350 },
      },
    };
  });
};

// Fade-in animation for individual components
export const useFadeInAnimation = (delay = 0, duration = 300) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const startAnimation = () => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));

    translateY.value = withDelay(delay, withTiming(0, { duration: duration + 50 }));
  };

  return {
    animatedStyle,
    startAnimation,
    opacity,
    translateY,
  };
};

// Pulse animation (useful for notifications or highlights)
export const usePulseAnimation = (pulseMagnitude = 1.1) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const pulse = () => {
    scale.value = 1;
    scale.value = withTiming(pulseMagnitude, { duration: 150 }, () => {
      scale.value = withTiming(1, { duration: 150 });
    });
  };

  return {
    animatedStyle,
    pulse,
    scale,
  };
};
