import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DEFAULT_ANIMATION_DURATION,
  TOAST_INITIAL_TRANSLATE_Y,
  TOAST_SCALE_CONFIG,
  TOAST_SCALE_SPRING,
  TOAST_SPRING,
} from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ToastType } from '@/types/ui/toast.types';

import { ThemedText } from './ThemedText';

interface ToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
  type?: ToastType;
}

const DEFAULT_DURATION = 3500;
const MAX_TOAST_WIDTH_RATIO = 0.9;

// Enhanced shadow styles for more prominence
const SHADOW_STYLES = {
  ...LAYOUT.ELEVATION.LARGE,
  shadowOffset: { width: 0, height: 6 },
};

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // More rounded for modern look
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 3 - LAYOUT.SPACING.SMALL, // ~140px
    overflow: 'hidden',
    paddingHorizontal: LAYOUT.SPACING.LARGE, // More generous padding
    paddingVertical: LAYOUT.SPACING.MEDIUM, // Taller for more presence
    ...SHADOW_STYLES,
  },
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
    width: '100%',
    zIndex: 999999, // Maximum z-index to appear above modals
  },
  toastText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // Larger text
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textAlign: 'center',
  },
});

export const Toast = memo(
  ({ visible, message, duration = DEFAULT_DURATION, onClose, type = 'info' }: ToastProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // Memoize animation config to prevent unnecessary re-creation
    const animationConfig = useMemo(
      () => ({
        initialScale:
          TOAST_SCALE_CONFIG[type === 'important' ? 'IMPORTANT' : 'DEFAULT'].initialScale,
        targetOvershoot:
          TOAST_SCALE_CONFIG[type === 'important' ? 'IMPORTANT' : 'DEFAULT'].overshoot,
        springConfig: TOAST_SCALE_SPRING[type === 'important' ? 'IMPORTANT' : 'DEFAULT'],
      }),
      [type]
    );

    // Reusable animation hooks
    const {
      animatedStyle: opacityStyle,
      startAnimation: fadeIn,
      reverseAnimation: fadeOut,
      reset: resetOpacity,
    } = useOpacityAnimation({
      initialOpacity: 0,
      duration: DEFAULT_ANIMATION_DURATION,
    });

    const {
      animatedStyle: scaleStyle,
      startAnimation: startScale,
      reverseAnimation: reverseScale,
      reset: resetScale,
    } = useTransformAnimation({
      type: 'scale',
      initialValue: animationConfig.initialScale,
      targetValue: 1,
      useSpring: true,
      damping: animationConfig.springConfig.damping,
      stiffness: animationConfig.springConfig.stiffness,
    });

    const {
      animatedStyle: translateYStyle,
      startAnimation: startTranslate,
      reverseAnimation: reverseTranslate,
      reset: resetTranslate,
    } = useTransformAnimation({
      type: 'translateY',
      initialValue: TOAST_INITIAL_TRANSLATE_Y,
      targetValue: 0,
      useSpring: true,
      damping: TOAST_SPRING.damping,
      stiffness: TOAST_SPRING.stiffness,
    });

    const animatedStyle = [opacityStyle, scaleStyle, translateYStyle];

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (visible) {
        fadeIn();
        startScale();
        startTranslate();

        timerRef.current = setTimeout(() => {
          fadeOut();
          reverseScale();
          reverseTranslate();

          setTimeout(() => {
            onClose();
            resetOpacity();
            resetScale();
            resetTranslate();
          }, DEFAULT_ANIMATION_DURATION);
        }, duration);
      } else {
        resetOpacity();
        resetScale();
        resetTranslate();
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [
      visible,
      duration,
      onClose,
      fadeIn,
      fadeOut,
      startScale,
      reverseScale,
      startTranslate,
      reverseTranslate,
      resetOpacity,
      resetScale,
      resetTranslate,
    ]);

    // Enhanced color scheme based on toast type - use elevation3 for floating elements
    const backgroundColor = useMemo(() => {
      switch (type) {
        case 'success':
          return colors.success || colors.tint;
        case 'error':
          return colors.error;
        case 'important':
          return colors.warning || colors.tint;
        default:
          return colors.elevation3; // Use elevation3 for floating toast messages
      }
    }, [type, colors]);

    const textColor = useMemo(() => {
      // For important and error, use white text for better contrast
      if (type === 'important' || type === 'error') {
        return colors.white;
      }
      return isDarkMode ? colors.text : colors.white;
    }, [type, isDarkMode, colors.text, colors.white]);

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
          style={[styles.toastText, { color: textColor }]}
        >
          {message}
        </ThemedText>
      ),
      [message, textColor]
    );

    if (!visible) return null;

    return (
      <Animated.View pointerEvents="none" style={[containerStyle, ...animatedStyle]}>
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
          {toastContent}
        </View>
      </Animated.View>
    );
  }
);

Toast.displayName = 'Toast';
