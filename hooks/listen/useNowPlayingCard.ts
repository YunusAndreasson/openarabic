import { useCallback, useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  cancelAnimation,
} from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';

import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { LAYOUT } from '@/constants/layout';

const CARD_HEIGHT = 120;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 1,
} as const;

const ENTRANCE_SCALE_CONFIG = {
  damping: 25,
  stiffness: 120,
} as const;

const EXIT_SPRING_CONFIG = {
  damping: 25,
  stiffness: 150,
  mass: 0.8,
} as const;

interface UseNowPlayingCardProps {
  isVisible: boolean;
  progress: number;
  duration: number;
  onStop?: () => void;
  isTimerActive?: boolean;
}

// Simplified time formatter used in progress calculations
const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const useNowPlayingCard = ({
  isVisible,
  progress,
  duration,
  onStop,
  isTimerActive = false,
}: UseNowPlayingCardProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const translateY = useSharedValue(CARD_HEIGHT + 100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const {
    animatedStyle: rawButtonAnimatedStyle,
    handlePressIn: handleStopPressIn,
    handlePressOut: handleStopPressOut,
  } = usePressAnimation({ scaleAmount: 0.85 });
  const buttonAnimatedStyle = rawButtonAnimatedStyle as AnimatedStyle<ViewStyle>;

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, ENTRANCE_SCALE_CONFIG);
    } else {
      scale.value = withTiming(0.92, { duration: 100 }, () => {
        translateY.value = withSpring(CARD_HEIGHT + 100, EXIT_SPRING_CONFIG);
      });
      opacity.value = withTiming(0, { duration: 300 });
    }
    // Only trigger when visibility changes to avoid unnecessary re-runs
  }, [isVisible]);

  const handleStopPress = useCallback(() => {
    onStop?.();
  }, [onStop]);

  useEffect(() => {
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [translateY, opacity, scale]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  }, []);

  const backgroundImageStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(opacity.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
    };
  }, []);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        ...LAYOUT.ELEVATION.SMALL,
        backgroundColor: colors.elevation2,
        borderColor: isDarkMode ? colors.border : colors.cardBorder,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
      },
      stopButton: {
        ...LAYOUT.ELEVATION.SUBTLE,
        backgroundColor: colors.tint,
        shadowColor: colors.tint,
      },
      timerButton: {
        backgroundColor: isTimerActive ? colors.warning + '20' : colors.buttonOverlay,
        borderColor: isTimerActive ? colors.warning : colors.border,
        borderWidth: 1,
      },
    }),
    [colors, isDarkMode, isTimerActive]
  );

  const timeCalculations = useMemo(() => {
    const safeProgress = progress && isFinite(progress) ? progress : 0;
    const safeDuration = duration && isFinite(duration) ? duration : 0;

    const currentSeconds = safeProgress / 1000;
    const totalSeconds = safeDuration / 1000;

    const percentage = safeDuration > 0 ? (safeProgress / safeDuration) * 100 : 0;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    return {
      currentTime: formatTime(currentSeconds),
      totalTime: formatTime(totalSeconds),
      progressPercentage: clampedPercentage,
    };
  }, [progress, duration]);

  return {
    cardAnimatedStyle,
    backgroundImageStyle,
    buttonAnimatedStyle,
    handleStopPressIn,
    handleStopPressOut,
    handleStopPress,
    dynamicStyles,
    timeCalculations,
  } as const;
};

export type UseNowPlayingCardReturn = ReturnType<typeof useNowPlayingCard>;
