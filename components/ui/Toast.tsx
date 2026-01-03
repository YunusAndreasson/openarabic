import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_TOAST_DURATION, TIMING_CONFIG } from '@/constants/animation';
import { FONT_WEIGHTS, LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { ToastType } from '@/types/enums';

interface ToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
  type?: ToastType;
  position?: 'top' | 'bottom';
}

const DEFAULT_DURATION = DEFAULT_TOAST_DURATION;
const MAX_TOAST_WIDTH_RATIO = 0.9;

// Static color lookup - avoids switch statement per render
const TOAST_COLOR_MAP = {
  success: 'success',
  error: 'error',
  important: 'warning',
  info: null, // Uses elevation2 for info
} as const;

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // More rounded for modern look
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 3 - LAYOUT.SPACING.SMALL, // ~140px
    overflow: 'hidden',
    paddingHorizontal: LAYOUT.SPACING.LARGE, // More generous padding
    paddingVertical: LAYOUT.SPACING.MEDIUM, // Taller for more presence
    ...LAYOUT.ELEVATION.LARGE,
  },
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.POPUP, // Use design system z-index for proper layering
  },
  toastText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // Larger text
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textAlign: 'center',
  },
});

export function Toast({
  visible,
  message,
  duration = DEFAULT_DURATION,
  onClose,
  type = ToastType.INFO,
  position = 'top',
}: ToastProps) {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);

  // Update the ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (visible) {
      timerRef.current = setTimeout(() => {
        onCloseRef.current();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, duration]);

  // Determine toast colors based on type
  const colorKey = TOAST_COLOR_MAP[type];
  const backgroundColor = colorKey
    ? (colors[colorKey] as string) || colors.tint
    : colors.elevation2;
  const textColor = colorKey ? colors.white : colors.text;

  // For mobile-only apps, use constant screen width
  const screenWidth = SCREEN_WIDTH;
  const maxToastWidth = screenWidth * MAX_TOAST_WIDTH_RATIO;

  // Position based on position prop
  const containerStyle = {
    ...styles.toastContainer,
    ...(position === 'bottom'
      ? { bottom: insets.bottom + LAYOUT.SPACING.LARGE } // Position at bottom
      : { top: insets.top + LAYOUT.SPACING.XLARGE * 2 }), // Position at top for prominence
  };

  if (!visible) return null;

  // Use different animations based on position
  const enterAnimation =
    position === 'bottom'
      ? FadeInUp.duration(TIMING_CONFIG.FAST.duration)
      : FadeInDown.duration(TIMING_CONFIG.FAST.duration);
  const exitAnimation =
    position === 'bottom'
      ? FadeOutDown.duration(TIMING_CONFIG.FAST.duration)
      : FadeOutUp.duration(TIMING_CONFIG.FAST.duration);

  return (
    <Animated.View
      pointerEvents="none"
      entering={enterAnimation}
      exiting={exitAnimation}
      style={containerStyle}
    >
      <View
        style={[
          styles.toast,
          {
            maxWidth: maxToastWidth,
            backgroundColor,
            shadowColor: colors.shadow,
            // Add subtle border for definition
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: isDarkMode ? colors.border : colors.transparent,
          },
        ]}
      >
        <ThemedText
          skipDefaultColor
          ellipsizeMode="tail"
          numberOfLines={3} // Allow more lines for longer messages
          style={[styles.toastText, { color: textColor }]}
        >
          {message}
        </ThemedText>
      </View>
    </Animated.View>
  );
}
