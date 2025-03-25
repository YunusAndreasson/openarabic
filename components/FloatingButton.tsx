import React, { useMemo } from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '@/constants/layout';
import { FloatingButtonProps } from '@/types/ui/button.types';
import { usePressAnimation } from '@/hooks/animations';
import { lightFeedback } from '@/utils/haptics';
import { useToast } from './ToastProvider';

const BUTTON_SIZE = LAYOUT.BUTTON.HEIGHT.MEDIUM;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIcon: {
    alignSelf: 'center',
  },
});

const FloatingButton: React.FC<FloatingButtonProps> = ({
  position,
  buttonType = 'back',
  top,
  iconName,
  accessibilityLabel,
  onPress,
  colors,
  isDarkMode,
  isBookmarked,
  animatedStyle,
  style,
}) => {
  const { showToast } = useToast();

  // Use standardized press animation
  const {
    animatedStyle: pressAnimatedStyle,
    handlePressIn,
    handlePressOut,
  } = usePressAnimation({
    type: 'button',
    scaleAmount: 0.95,
  });

  // Memoize background color to prevent recalculation
  const buttonBackgroundColor = useMemo(
    () => (isDarkMode ? colors.textOverlay : `${colors.background}E6`), // E6 = 90% opacity
    [colors.textOverlay, colors.background, isDarkMode]
  );

  // Combine external animation style with press animation style
  const combinedAnimatedStyle = useMemo(() => {
    if (animatedStyle) {
      return [animatedStyle, pressAnimatedStyle];
    }
    return pressAnimatedStyle;
  }, [animatedStyle, pressAnimatedStyle]);

  // Simple handler for button press with haptic feedback only for non-back buttons
  const handlePress = async () => {
    if (onPress) {
      // Only provide haptic feedback for non-back buttons
      if (buttonType !== 'back') {
        lightFeedback();
      }

      // Execute the press action
      await onPress();

      // Only show toast for bookmark actions
      if (buttonType === 'bookmark' && isBookmarked !== undefined) {
        showToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
      }
    }
  };

  const containerStyle = useMemo(() => {
    const baseStyle: ViewStyle = {
      ...styles.container,
      top,
    };

    switch (position) {
      case 'top-left':
        baseStyle.left = LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY;
        break;
      case 'top-right':
        baseStyle.right = LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY;
        break;
      case 'bottom-left':
        baseStyle.left = LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY;
        baseStyle.bottom = LAYOUT.SPACING.MEDIUM;
        break;
      case 'bottom-right':
        baseStyle.right = LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY;
        baseStyle.bottom = LAYOUT.SPACING.MEDIUM;
        break;
    }

    return baseStyle;
  }, [position, top]);

  // Determine icon color based on button type and state
  const iconColor = useMemo(() => {
    if (isBookmarked) {
      return isDarkMode ? colors.text : colors.primary;
    }
    return colors.text;
  }, [isBookmarked, isDarkMode, colors]);

  return (
    <Animated.View style={[containerStyle, combinedAnimatedStyle as any, style]}>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: buttonBackgroundColor,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <Ionicons name={iconName as any} size={24} color={iconColor} style={styles.buttonIcon} />
      </Pressable>
    </Animated.View>
  );
};

export default FloatingButton;
