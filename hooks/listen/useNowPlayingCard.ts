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

import {
  NOW_PLAYING_CARD_HEIGHT,
  NOW_PLAYING_CARD_SPRING,
  NOW_PLAYING_ENTRANCE_SCALE,
  NOW_PLAYING_EXIT_SPRING,
  NOW_PLAYING_START_SCALE,
  NOW_PLAYING_DISMISS_SCALE,
  TIMING_CONFIG,
  QUICK_ANIMATION_DURATION,
} from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';


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

  const translateY = useSharedValue(NOW_PLAYING_CARD_HEIGHT + 100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(NOW_PLAYING_START_SCALE);
  const {
    animatedStyle: rawButtonAnimatedStyle,
    handlePressIn: handleStopPressIn,
    handlePressOut: handleStopPressOut,
  } = usePressAnimation({ scaleAmount: 0.85 });
  const buttonAnimatedStyle = rawButtonAnimatedStyle as AnimatedStyle<ViewStyle>;

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, NOW_PLAYING_CARD_SPRING);
      opacity.value = withTiming(1, { duration: TIMING_CONFIG.GENTLE.duration });
      scale.value = withSpring(1, NOW_PLAYING_ENTRANCE_SCALE);
    } else {
      scale.value = withTiming(
        NOW_PLAYING_DISMISS_SCALE,
        { duration: QUICK_ANIMATION_DURATION },
        () => {
          translateY.value = withSpring(
            NOW_PLAYING_CARD_HEIGHT + 100,
            NOW_PLAYING_EXIT_SPRING,
          );
        },
      );
      opacity.value = withTiming(0, { duration: TIMING_CONFIG.GENTLE.duration });
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
