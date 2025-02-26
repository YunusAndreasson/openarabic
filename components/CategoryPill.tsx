import React, { useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
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
          : `${colors.tint}95`, // Increased opacity in light mode (from 85% to 95%)
        borderColor: isDarkMode ? colors.cardBorder : 'transparent',
        // Theme-aware shadow - only apply in dark mode
        ...Platform.select({
          ios: {
            shadowColor: isDarkMode ? colors.shadow : 'transparent',
            shadowOffset: { width: 0, height: isDarkMode ? 2 : 0 },
            shadowOpacity: isDarkMode ? 0.1 : 0,
            shadowRadius: isDarkMode ? 4 : 0,
          },
          android: {
            elevation: isDarkMode ? 2 : 0, // Only apply elevation in dark mode
          },
        }),
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

CategoryPill.displayName = 'CategoryPill';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY + 2,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    maxWidth: '70%',
    borderWidth: 0.5,
    // Remove shadow from base style - we'll apply it conditionally in the component
    zIndex: LAYOUT.Z_INDEX.CARD + 1,
  },
  nonAbsoluteContainer: {
    position: 'relative',
    top: 0,
    left: 0,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 16,
    textAlign: 'center',
  },
});
