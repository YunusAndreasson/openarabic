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
          ? `${colors.tint}20` // Selected, dark mode (20% opacity)
          : `${colors.tint}70` // Selected, light mode (70% opacity)
        : isDarkMode
          ? `${colors.elevation2}40` // Unselected, dark mode (40% opacity)
          : `${colors.elevation1}90`, // Unselected, light mode (90% opacity)
      borderColor: colors.cardBorder,
      borderWidth: 0.5,
      borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
      paddingHorizontal: LAYOUT.SPACING.MEDIUM,
      paddingVertical: LAYOUT.SPACING.TINY + 2,
      // Theme-aware shadow
      ...Platform.select({
        ios: {
          shadowColor: isDarkMode ? colors.shadow : isSelected ? colors.shadow : 'transparent',
          shadowOffset: { width: 0, height: isSelected || isDarkMode ? 2 : 0 },
          shadowOpacity: isSelected || isDarkMode ? 0.1 : 0,
          shadowRadius: isSelected || isDarkMode ? 4 : 0,
        },
        android: {
          elevation: isSelected || isDarkMode ? (isSelected ? 1 : 2) : 0,
        },
      }),
    },
    text: {
      color: isSelected
        ? isDarkMode
          ? colors.white // Selected text in dark mode
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
    zIndex: LAYOUT.Z_INDEX.CARD + 1,
  },
  absoluteContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
  },
});
