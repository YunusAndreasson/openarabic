import { Ionicons } from '@expo/vector-icons';
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
const TOAST_ANIMATION_DURATION = TIMING_CONFIG.SLOW.duration; // 300ms — deliberate enough to notice
const ICON_SIZE = LAYOUT.BUTTON.ICON_SIZE.MEDIUM; // 20

// Toast type configuration — icon + color key in one place
const TOAST_CONFIG = {
  success: { icon: 'checkmark-circle' as const, colorKey: 'success' as const },
  error: { icon: 'alert-circle' as const, colorKey: 'error' as const },
  important: { icon: 'warning' as const, colorKey: 'warning' as const },
  info: { icon: 'information-circle' as const, colorKey: null },
} as const;

const styles = StyleSheet.create({
  icon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    flexDirection: 'row',
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 3 - LAYOUT.SPACING.SMALL, // ~140px
    overflow: 'hidden',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.TINY, // 12px — compact pill
    ...LAYOUT.ELEVATION.LARGE,
  },
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  toastText: {
    flexShrink: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // 13px — lightweight toast text
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
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

  const config = TOAST_CONFIG[type];
  const backgroundColor = config.colorKey
    ? (colors[config.colorKey] as string) || colors.tint
    : colors.card;
  const textColor = config.colorKey ? colors.white : colors.text;

  const maxToastWidth = SCREEN_WIDTH * MAX_TOAST_WIDTH_RATIO;

  // Position: sit close to the nav bar / bottom edge
  const containerStyle = {
    ...styles.toastContainer,
    ...(position === 'bottom'
      ? { bottom: insets.bottom + LAYOUT.SPACING.LARGE }
      : { top: insets.top + LAYOUT.SPACING.SMALL }),
  };

  if (!visible) return null;

  const enterAnimation =
    position === 'bottom'
      ? FadeInUp.duration(TOAST_ANIMATION_DURATION)
      : FadeInDown.duration(TOAST_ANIMATION_DURATION);
  const exitAnimation =
    position === 'bottom'
      ? FadeOutDown.duration(TOAST_ANIMATION_DURATION)
      : FadeOutUp.duration(TOAST_ANIMATION_DURATION);

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
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: isDarkMode ? colors.border : colors.transparent,
          },
        ]}
      >
        <Ionicons
          name={config.icon}
          size={ICON_SIZE}
          color={textColor}
          style={styles.icon}
        />
        <ThemedText
          skipDefaultColor
          ellipsizeMode="tail"
          numberOfLines={2}
          style={[styles.toastText, { color: textColor }]}
        >
          {message}
        </ThemedText>
      </View>
    </Animated.View>
  );
}
