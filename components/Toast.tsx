import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_TOAST_DURATION, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { ToastType } from '@/types/enums';

interface ToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
  type?: ToastType;
}

const DEFAULT_DURATION = DEFAULT_TOAST_DURATION;
const MAX_TOAST_WIDTH_RATIO = 0.9;

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
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textAlign: 'center',
  },
});

export const Toast = memo(
  ({
    visible,
    message,
    duration = DEFAULT_DURATION,
    onClose,
    type = ToastType.INFO,
  }: ToastProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const insets = useSafeAreaInsets();

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (visible) {
        timerRef.current = setTimeout(() => {
          onClose();
        }, duration);
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [visible, duration, onClose]);

    // Consolidated color scheme memoization for better performance
    const toastColors = useMemo(() => {
      let backgroundColor: string;
      let textColor: string;

      switch (type) {
        case 'success':
          backgroundColor = colors.success || colors.tint;
          textColor = colors.white;
          break;
        case 'error':
          backgroundColor = colors.error;
          textColor = colors.white;
          break;
        case 'important':
          backgroundColor = colors.warning || colors.tint;
          textColor = colors.white;
          break;
        default:
          backgroundColor = colors.elevation2; // Darker, more visible toast in dark mode
          textColor = colors.text;
      }

      return { backgroundColor, textColor };
    }, [type, colors]);

    // For mobile-only apps, use constant screen width
    const screenWidth = SCREEN_WIDTH;
    const maxToastWidth = screenWidth * MAX_TOAST_WIDTH_RATIO;

    // Position higher on screen for better visibility
    const containerStyle = useMemo(
      () => ({
        ...styles.toastContainer,
        top: insets.top + LAYOUT.SPACING.XLARGE * 2, // Position at top for prominence
      }),
      [insets.top]
    );

    const toastContent = useMemo(
      () => (
        <ThemedText
          skipDefaultColor
          ellipsizeMode="tail"
          numberOfLines={3} // Allow more lines for longer messages
          style={[styles.toastText, { color: toastColors.textColor }]}
        >
          {message}
        </ThemedText>
      ),
      [message, toastColors.textColor]
    );

    if (!visible) return null;

    return (
      <Animated.View
        pointerEvents="none"
        entering={FadeInUp.duration(TIMING_CONFIG.FAST.duration)}
        exiting={FadeOutUp.duration(TIMING_CONFIG.FAST.duration)}
        style={containerStyle}
      >
        <View
          style={[
            styles.toast,
            {
              maxWidth: maxToastWidth,
              backgroundColor: toastColors.backgroundColor,
              shadowColor: colors.shadow,
              // Add subtle border for definition
              borderWidth: isDarkMode ? 1 : 0,
              borderColor: isDarkMode ? colors.border : colors.transparent,
            },
          ]}
        >
          {toastContent}
        </View>
      </Animated.View>
    );
  }
);

Toast.displayName = 'Toast';
