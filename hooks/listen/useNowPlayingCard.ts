import { useCallback, useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import {
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  NOW_PLAYING_CARD_HEIGHT,
  NOW_PLAYING_CARD_SPRING,
  NOW_PLAYING_DISMISS_SCALE,
  NOW_PLAYING_ENTRANCE_SCALE,
  NOW_PLAYING_EXIT_SPRING,
  NOW_PLAYING_HIDDEN_OFFSET,
  NOW_PLAYING_START_SCALE,
  NOW_PLAYING_STOP_PRESS_SCALE,
  QUICK_ANIMATION_DURATION,
  TIMING_CONFIG,
} from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

interface UseNowPlayingCardProps {
  isVisible: boolean;
  onStop?: () => void;
  isTimerActive?: boolean;
}

export const useNowPlayingCard = ({
  isVisible,
  onStop,
  isTimerActive = false,
}: UseNowPlayingCardProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const translateY = useSharedValue(NOW_PLAYING_CARD_HEIGHT + NOW_PLAYING_HIDDEN_OFFSET);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(NOW_PLAYING_START_SCALE);
  const {
    animatedStyle: rawButtonAnimatedStyle,
    handlePressIn: handleStopPressIn,
    handlePressOut: handleStopPressOut,
  } = usePressAnimation({ scaleAmount: NOW_PLAYING_STOP_PRESS_SCALE });
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
            NOW_PLAYING_CARD_HEIGHT + NOW_PLAYING_HIDDEN_OFFSET,
            NOW_PLAYING_EXIT_SPRING
          );
        }
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

  return {
    cardAnimatedStyle,
    backgroundImageStyle,
    buttonAnimatedStyle,
    handleStopPressIn,
    handleStopPressOut,
    handleStopPress,
    dynamicStyles,
  } as const;
};

export type UseNowPlayingCardReturn = ReturnType<typeof useNowPlayingCard>;
