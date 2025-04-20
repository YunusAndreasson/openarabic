import React, { useEffect, useMemo, memo } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';

import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';

import { ThemedText } from './ThemedText';

interface ToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
}

const DEFAULT_DURATION = 3500;
const MAX_TOAST_WIDTH_RATIO = 0.9;

const SHADOW_STYLES = Platform.select({
  ios: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  android: {
    elevation: 5,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    borderRadius: 50,
    minWidth: 120,
    overflow: 'hidden',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM + 8,
    paddingVertical: LAYOUT.SPACING.SMALL + 4,
    ...SHADOW_STYLES,
  },
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  toastText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1,
    fontWeight: '600',
    lineHeight: (LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1) * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    textAlign: 'center',
  },
});

export const Toast = memo(
  ({ visible, message, duration = DEFAULT_DURATION, onClose }: ToastProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const insets = useSafeAreaInsets();

    const {
      fadeIn,
      fadeOut,
      animatedStyle: opacityStyle,
    } = useOpacityAnimation({
      initialOpacity: 0,
      duration: 300,
      style: 'standard',
    });

    const {
      startAnimation: startScaleAnimation,
      reverseAnimation: reverseScaleAnimation,
      animatedStyle: scaleStyle,
    } = useTransformAnimation({
      type: 'scale',
      initialValue: 0.9,
      targetValue: 1,
      useSpring: true,
      damping: 12,
      stiffness: 170,
    });

    useEffect(() => {
      if (visible) {
        fadeIn();
        startScaleAnimation();

        const timer = setTimeout(() => {
          fadeOut(() => {
            reverseScaleAnimation();
            onClose();
          });
        }, duration);

        return () => clearTimeout(timer);
      }

      fadeOut();
      reverseScaleAnimation();
      return undefined;
    }, [
      visible,
      fadeIn,
      fadeOut,
      startScaleAnimation,
      reverseScaleAnimation,
      onClose,
      duration,
      message,
    ]);

    const backgroundColor = isDarkMode ? colors.card : colors.tint;
    const textColor = isDarkMode ? colors.text : colors.white;

    const { width: screenWidth } = Dimensions.get('window');
    const maxToastWidth = screenWidth * MAX_TOAST_WIDTH_RATIO;

    const containerStyle = useMemo(
      () => ({
        ...styles.toastContainer,
        bottom: LAYOUT.BOTTOM_BAR.HEIGHT + insets.bottom + LAYOUT.SPACING.SMALL,
      }),
      [insets.bottom]
    );

    const toastContent = useMemo(
      () => (
        <ThemedText
          style={[styles.toastText, { color: textColor }]}
          skipDefaultColor
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {message}
        </ThemedText>
      ),
      [message, textColor]
    );

    const combinedStyle = useMemo(() => {
      return [containerStyle, opacityStyle, scaleStyle] as StyleProp<AnimatedStyle<ViewStyle>>;
    }, [containerStyle, opacityStyle, scaleStyle]);

    if (!visible) return null;

    return (
      <Animated.View style={combinedStyle} pointerEvents="none">
        <View
          style={[
            styles.toast,
            {
              maxWidth: maxToastWidth,
              backgroundColor,
              shadowColor: colors.shadow,
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
