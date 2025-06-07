import React, { useEffect, useMemo, memo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/theme/useColors';
import { useIsDarkMode } from '../hooks/theme/useThemeDetection';

import { ThemedText } from './ThemedText';

export type ToastType = 'error' | 'important' | 'info' | 'success';

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
const SHADOW_STYLES = Platform.select({
  ios: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  android: {
    elevation: 12,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE, // More rounded for modern look
    minWidth: 140, // Slightly larger minimum width
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
    zIndex: LAYOUT.Z_INDEX.POPUP + 1, // Higher z-index for prominence
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
        initialScale: type === 'important' ? 0.2 : 0.3,
        targetOvershoot: type === 'important' ? 1.15 : 1.1,
        springConfig:
          type === 'important'
            ? { damping: 6, stiffness: 250, mass: 0.4 }
            : { damping: 8, stiffness: 200, mass: 0.5 },
      }),
      [type]
    );

    // Enhanced animations using Reanimated 3
    const opacity = useSharedValue(0);
    const scale = useSharedValue(animationConfig.initialScale);
    const translateY = useSharedValue(50); // Start from below

    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
      };
    }, []);

    useEffect(() => {
      if (visible) {
        // Dramatic entrance with staggered animations
        opacity.value = withTiming(1, { duration: 200 });

        // Bouncy scale animation - starts small, overshoots, then settles
        scale.value = withSequence(
          withSpring(animationConfig.targetOvershoot, animationConfig.springConfig),
          withSpring(1, {
            damping: 12,
            stiffness: 180,
            mass: 0.8,
          })
        );

        // Slide up animation
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 200,
          mass: 0.8,
        });

        const timer = setTimeout(() => {
          // Gentle exit animation
          opacity.value = withTiming(0, { duration: 300 });
          scale.value = withTiming(0.95, { duration: 300 });
          translateY.value = withTiming(-20, { duration: 300 });

          setTimeout(() => {
            onClose();
          }, 300);
        }, duration);

        return () => clearTimeout(timer);
      } else {
        // Reset values for next show
        opacity.value = 0;
        scale.value = animationConfig.initialScale;
        translateY.value = 50;
      }

      return undefined;
    }, [visible, duration, onClose, opacity, scale, translateY, animationConfig]);

    // Enhanced color scheme based on toast type
    const backgroundColor = useMemo(() => {
      switch (type) {
        case 'success':
          return colors.success || colors.tint;
        case 'error':
          return colors.error;
        case 'important':
          return colors.warning || colors.accent || colors.tint;
        default:
          return isDarkMode ? colors.card : colors.tint || colors.primary;
      }
    }, [type, isDarkMode, colors]);

    const textColor = useMemo(() => {
      // For important and error, use white text for better contrast
      if (type === 'important' || type === 'error') {
        return colors.white;
      }
      return isDarkMode ? colors.text : colors.white;
    }, [type, isDarkMode, colors.text, colors.white]);

    const { width: screenWidth } = Dimensions.get('window');
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
      <Animated.View pointerEvents="none" style={[containerStyle, animatedStyle]}>
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
