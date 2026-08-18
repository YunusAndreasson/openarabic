import { Ionicons } from '@/components/ui/Icon';
import { useEffect, useEffectEvent, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/primitives/ThemedText';
import { DEFAULT_TOAST_DURATION, TIMING_CONFIG } from '@/constants/animation';
import { FONTS } from '@/constants/fonts';
import { getElevation } from '@/constants/elevation';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, SCREEN_WIDTH } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
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
    fontFamily: FONTS.ENGLISH,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
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
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeToast = useEffectEvent(onClose);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (visible) {
      // No auto-haptic here: toasts almost always follow a user action that
      // already fired its own haptic. Callers that need a haptic for unsolicited
      // toasts (e.g. background errors) should trigger it explicitly.
      timerRef.current = setTimeout(() => {
        closeToast();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, duration, type]);

  const config = TOAST_CONFIG[type];
  const backgroundColor = config.colorKey
    ? colors[config.colorKey] || colors.tint
    : colors.elevation2; // Use elevated surface so info toast doesn't blend with screen background
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
          getElevation(colors, 'MODAL'),
          {
            maxWidth: maxToastWidth,
            backgroundColor,
            borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
            borderColor: colors.toastBorder,
          },
        ]}
      >
        <Ionicons name={config.icon} size={ICON_SIZE} color={textColor} style={styles.icon} />
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
