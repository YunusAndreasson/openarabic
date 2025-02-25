import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { LAYOUT } from '@/constants/layout';

interface CategoryPillProps {
  category: string;
  absolute?: boolean;
}

export function CategoryPill({ category, absolute = true }: CategoryPillProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Convert the category to uppercase for better visual hierarchy
  const displayCategory = category.toUpperCase();

  const themedStyles = useMemo(() => {
    return {
      container: {
        backgroundColor: isDarkMode
          ? `${colors.tint}25` // More transparent in dark mode (25% opacity)
          : `${colors.tint}85`, // Slightly more transparent in light mode (85% opacity)
        borderColor: isDarkMode ? colors.cardBorder : 'transparent',
        shadowColor: colors.cardShadow,
      },
      text: {
        color: isDarkMode
          ? colors.tint // Use tint color in dark mode for better contrast
          : colors.white, // Use white in light mode for contrast against dark background
      },
    };
  }, [colors, isDarkMode]);

  return (
    <View
      style={[styles.container, themedStyles.container, !absolute && styles.nonAbsoluteContainer]}
    >
      <ThemedText
        style={[styles.text, themedStyles.text]}
        skipDefaultColor
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayCategory}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY + 2,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM, // Using MEDIUM for the pill to create visual harmony with the LARGE card
    maxWidth: '70%', // Slightly reduced to avoid edge cases with very long categories
    borderWidth: 0.5, // Thinner border for a more elegant look
    ...LAYOUT.SHADOW.SMALL,
    elevation: 2, // Slightly reduced elevation to match card better
    zIndex: LAYOUT.Z_INDEX.CARD + 1, // Ensure it's above other card elements
  },
  nonAbsoluteContainer: {
    position: 'relative',
    top: 0,
    left: 0,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1, // Slightly larger than tiny
    fontWeight: '700', // Bolder for better visibility
    letterSpacing: 0.5, // Slightly reduced for better readability
    lineHeight: 16, // Increased for better vertical alignment
    textAlign: 'center', // Center text for better appearance
  },
});
