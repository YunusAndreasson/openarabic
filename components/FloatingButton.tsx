import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, Pressable, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyleProp } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import type { FloatingButtonProps } from '@/types/ui/button.types';
import { lightFeedback } from '@/utils/haptics';

import { useToast } from './ToastProvider';

const BUTTON_SIZE = LAYOUT.BUTTON.HEIGHT.MEDIUM;
const BUTTON_OPACITY = 0.9; // 90% opacity (E6)

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: BUTTON_SIZE / 2,
    elevation: 5,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {},
    }),
    width: BUTTON_SIZE,
  },
  buttonIcon: {
    alignSelf: 'center',
  },
  container: {
    height: BUTTON_SIZE,
    position: 'absolute',
    width: BUTTON_SIZE,
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
  },
});

const FloatingButton = ({
  position,
  buttonType = 'back',
  top,
  iconName,
  onPress,
  colors,
  isDarkMode,
  isBookmarked,
  animatedStyle,
  style,
}: FloatingButtonProps) => {
  const { showToast } = useToast();

  const {
    animatedStyle: pressAnimatedStyle,
    handlePressIn,
    handlePressOut,
  } = usePressAnimation({
    type: 'button',
    scaleAmount: 0.95,
  });

  const buttonBackgroundColor = useMemo(
    () =>
      isDarkMode
        ? colors.textOverlay
        : `${colors.background}${Math.floor(BUTTON_OPACITY * 255).toString(16)}`,
    [colors.textOverlay, colors.background, isDarkMode]
  );

  const combinedAnimatedStyle = useMemo(
    () => (animatedStyle ? [animatedStyle, pressAnimatedStyle] : pressAnimatedStyle),
    [animatedStyle, pressAnimatedStyle]
  ) as AnimatedStyleProp<ViewStyle>;

  const handlePress = async () => {
    if (!onPress) return;

    if (buttonType !== 'back') {
      lightFeedback();
    }

    await onPress();

    if (buttonType === 'bookmark' && isBookmarked !== undefined) {
      showToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    }
  };

  const containerStyle = useMemo(() => {
    const baseStyle: ViewStyle = {
      ...styles.container,
      top,
    };

    const edgeSpacing = LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY;

    switch (position) {
      case 'top-left':
        baseStyle.left = edgeSpacing;
        break;
      case 'top-right':
        baseStyle.right = edgeSpacing;
        break;
      case 'bottom-left':
        baseStyle.left = edgeSpacing;
        baseStyle.bottom = LAYOUT.SPACING.MEDIUM;
        break;
      case 'bottom-right':
        baseStyle.right = edgeSpacing;
        baseStyle.bottom = LAYOUT.SPACING.MEDIUM;
        break;
    }

    return baseStyle;
  }, [position, top]);

  const iconColor = useMemo(
    () => (isBookmarked ? (isDarkMode ? colors.text : colors.primary) : colors.text),
    [isBookmarked, isDarkMode, colors]
  );

  return (
    <Animated.View style={[containerStyle, combinedAnimatedStyle, style]}>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: buttonBackgroundColor,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={24}
          color={iconColor}
          style={styles.buttonIcon}
        />
      </Pressable>
    </Animated.View>
  );
};

export default FloatingButton;
