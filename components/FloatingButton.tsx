import React, { useMemo } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '@/constants/layout';
import { FloatingButtonProps } from '@/types/ui.types';

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

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  position,
  top,
  animatedStyle,
  onPress,
  iconName,
  accessibilityLabel,
  colors,
  isDarkMode,
}) => {
  // Simple handler for button press
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Memoize background color to prevent recalculation
  const buttonBackgroundColor = useMemo(
    () => (isDarkMode ? colors.textOverlay : `${colors.background}E6`), // E6 = 90% opacity
    [colors.textOverlay, colors.background, isDarkMode]
  );

  return (
    <Animated.View
      style={[
        position === 'left' ? styles.backButton : styles.playlistButton,
        { top },
        animatedStyle,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: buttonBackgroundColor,
            opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1,
          },
        ]}
        onPress={handlePress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <Ionicons name={iconName} size={24} color={colors.text} style={styles.buttonIcon} />
      </Pressable>
    </Animated.View>
  );
};

export default FloatingButton;
