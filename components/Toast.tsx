import React, { useEffect, useMemo, memo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';

import { Colors } from '../constants/Colors';
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

const DEFAULT_DURATION = 2500;

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL + 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
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
    fontWeight: '500',
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
      } else {
        fadeOut();
        reverseScaleAnimation();
        return () => undefined;
      }
    }, [visible, fadeIn, fadeOut, startScaleAnimation, reverseScaleAnimation, onClose, duration]);

    // In dark mode: light background with dark text
    // In light mode: dark background with light text
    const lightColors = Colors.light;
    const backgroundColor = isDarkMode ? lightColors.cardBackground : colors.black;
    const textColor = isDarkMode ? colors.black : colors.white;
    const borderColor = isDarkMode ? colors.cardBorder : colors.borderOverlay;
    const shadowColor = colors.shadow;

    const { width: screenWidth } = Dimensions.get('window');
    const MAX_TOAST_WIDTH = screenWidth * 0.9;

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

    if (!visible) return null;

    return (
      <Animated.View
        style={[containerStyle, opacityStyle as AnimatedStyleProp<ViewStyle>, scaleStyle]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.toast,
            {
              maxWidth: MAX_TOAST_WIDTH,
              backgroundColor,
              borderColor,
              shadowColor,
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
