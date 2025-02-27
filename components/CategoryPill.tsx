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
          ? `${colors.cardBackground}90` // Lighten the card background with some transparency
          : colors.tint, // Keep solid tint color in light mode
        borderColor: isDarkMode ? `${colors.tint}50` : 'transparent',
        borderWidth: isDarkMode ? 1 : 0.5,
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
          ? colors.tint // Keep tint color for text in dark mode
          : colors.white, // Keep white in light mode
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
    marginTop: Platform.OS === 'ios' ? LAYOUT.SPACING.LARGE : 0, // Significantly increased margin on iOS
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 16,
    textAlign: 'center',
  },
});
