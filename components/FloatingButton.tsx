import React, { useMemo } from 'react';
import { StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '@/constants/layout';
import { FloatingButtonProps } from '@/types/ui.types';
import { usePressAnimation } from '@/hooks/animations';
import { lightFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    left: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
    overflow: 'hidden',
  },
  playlistButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    right: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
    overflow: 'hidden',
  },
  button: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    minWidth: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },
  buttonIcon: {
    alignSelf: 'center',
  },
});

export const FloatingButton: React.FC<FloatingButtonProps & { style?: StyleProp<ViewStyle> }> = ({
  position,
  top,
  animatedStyle,
  onPress,
  iconName,
  accessibilityLabel,
  colors,
  isDarkMode,
  style,
}) => {
  // Use standardized press animation
  const {
    animatedStyle: pressAnimatedStyle,
    handlePressIn,
    handlePressOut,
  } = usePressAnimation({
    type: 'button',
    scaleAmount: 0.95,
  });

  // Simple handler for button press with haptic feedback only for non-back buttons
  const handlePress = () => {
    if (onPress) {
      // Only provide haptic feedback if it's not a back button (left position)
      if (position !== 'left') {
        lightFeedback();
      }
      onPress();
    }
  };

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

  return (
    <Animated.View
      style={[
        position === 'left' ? styles.backButton : styles.playlistButton,
        { top },
        combinedAnimatedStyle as any,
        style,
      ]}
    >
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
        <Ionicons name={iconName} size={24} color={colors.text} style={styles.buttonIcon} />
      </Pressable>
    </Animated.View>
  );
};

export default FloatingButton;
