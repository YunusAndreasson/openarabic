import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { AnimatedStyleProp } from 'react-native-reanimated';

// Constants
import { LAYOUT } from '@/constants/layout';

interface FloatingButtonProps {
  position: 'left' | 'right';
  top: number;
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  onPress: () => void;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  colors: Record<string, string>;
  isDarkMode: boolean;
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    left: 15,
    overflow: 'hidden',
  },
  playlistButton: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.HEADER + 5,
    right: 15,
    overflow: 'hidden',
  },
  buttonBlur: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
  // Helper function to create rgba from hex color
  const getBackgroundColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  };

  const buttonStyle = {
    ...styles.buttonBlur,
    backgroundColor: getBackgroundColor(colors.background),
    opacity: LAYOUT.OPACITY.HOVER,
  };

  return (
    <Animated.View
      style={[
        position === 'left' ? styles.backButton : styles.playlistButton,
        { top },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <BlurView intensity={90} tint={isDarkMode ? 'dark' : 'light'} style={buttonStyle}>
          <Ionicons
            name={iconName}
            size={24}
            color={isDarkMode ? colors.white : colors.black}
            style={styles.buttonIcon}
          />
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default FloatingButton;
