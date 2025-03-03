import React, { useMemo } from 'react';
import { StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { LAYOUT } from '@/constants/layout';

export interface BasePillStyleProps {
  isSelected?: boolean;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

export interface BasePillStyles {
  container: ViewStyle;
  text: TextStyle;
}

export const createBasePillStyles = ({
  isSelected = false,
  isDarkMode,
  colors,
}: BasePillStyleProps): BasePillStyles => {
  return {
    container: {
      backgroundColor: isSelected
        ? isDarkMode
          ? `${colors.cardBackground}90` // Selected, dark mode (use cardBackground with 90% opacity)
          : `${colors.tint}70` // Selected, light mode (70% opacity)
        : isDarkMode
          ? `${colors.elevation2}40` // Unselected, dark mode (40% opacity)
          : `${colors.elevation1}90`, // Unselected, light mode (90% opacity)
      borderColor:
        isSelected && isDarkMode
          ? `${colors.tint}50` // Selected in dark mode (tint with 50% opacity)
          : colors.cardBorder, // Default border color
      borderWidth: isSelected && isDarkMode ? 1 : 0.5,
      borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
      paddingHorizontal: LAYOUT.SPACING.MEDIUM,
      paddingVertical: LAYOUT.SPACING.TINY + 2,
      // Enhanced shadow for better visibility against any background
      ...Platform.select({
        ios: {
          shadowColor: isDarkMode ? colors.text : colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDarkMode ? 0.2 : 0.15,
          shadowRadius: 3,
        },
        android: {
          elevation: isSelected ? 3 : 2,
        },
      }),
    },
    text: {
      color: isSelected
        ? isDarkMode
          ? colors.tint // Selected text in dark mode (use tint color)
          : colors.white // Selected text in light mode
        : isDarkMode
          ? `${colors.text}90` // Unselected text in dark mode
          : `${colors.text}80`, // Unselected text in light mode
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
      fontWeight: isSelected ? '700' : '600',
      letterSpacing: 0.5,
      lineHeight: 16,
      textAlign: 'center',
    },
  };
};

// Base styles that don't depend on theme or selection state
export const basePillStyles = StyleSheet.create({
  container: {
    maxWidth: '70%',
    zIndex: 15, // Higher z-index to ensure it stays on top of everything
  },
  absoluteContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
  },
});
