import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { useColors } from '../hooks/useColors';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
}

const DEFAULT_DURATION = 2500;

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.POPUP,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  toast: {
    paddingVertical: LAYOUT.SPACING.SMALL + 2,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    alignSelf: 'center',
    overflow: 'hidden',
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
  toastText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: (LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1) * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
});

export const Toast = React.memo(
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
      initialValue: 0.7,
      targetValue: 1,
      useSpring: true,
      damping: 10,
      stiffness: 200,
    });

    const {
      startAnimation: startSlideAnimation,
      reverseAnimation: reverseSlideAnimation,
      animatedStyle: slideStyle,
    } = useTransformAnimation({
      type: 'slide',
      initialValue: 30,
      targetValue: 0,
      useSpring: true,
      damping: 12,
      stiffness: 170,
    });

    useEffect(() => {
      if (visible) {
        fadeIn();
        startScaleAnimation();
        startSlideAnimation();

        const timer = setTimeout(() => {
          fadeOut(() => {
            reverseScaleAnimation();
            reverseSlideAnimation();
            onClose();
          });
        }, duration);

        return () => clearTimeout(timer);
      } else {
        fadeOut();
        reverseScaleAnimation();
        reverseSlideAnimation();
      }
    }, [
      visible,
      fadeIn,
      fadeOut,
      startScaleAnimation,
      reverseScaleAnimation,
      startSlideAnimation,
      reverseSlideAnimation,
      onClose,
      duration,
    ]);

    const backgroundColor = isDarkMode ? colors.white : colors.black;
    const textColor = isDarkMode ? colors.black : colors.white;
    const borderColor = isDarkMode ? colors.cardBorder : colors.cardBorder;
    const shadowColor = isDarkMode ? colors.cardShadow : colors.shadow;

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
        style={[containerStyle, opacityStyle as any, scaleStyle as any, slideStyle as any]}
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
