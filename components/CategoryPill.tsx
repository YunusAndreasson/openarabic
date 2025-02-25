import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { LAYOUT } from '@/constants/layout';

interface CategoryPillProps {
  category: string;
}

export function CategoryPill({ category }: CategoryPillProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Convert the category to uppercase instead of just capitalizing
  const displayCategory = category.toUpperCase();

  const themedStyles = useMemo(() => {
    return {
      container: {
        backgroundColor: isDarkMode ? colors.elevation2 : colors.tint + '90',
        borderColor: isDarkMode ? colors.cardBorder : 'transparent',
        shadowColor: colors.cardShadow,
      },
      text: {
        color: isDarkMode ? colors.text : colors.white,
        textShadowColor: isDarkMode ? colors.textShadowDark : colors.textShadowLight,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
      },
    };
  }, [colors, isDarkMode]);

  return (
    <View style={[styles.container, themedStyles.container]}>
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
    top: LAYOUT.SPACING.SMALL,
    left: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM - 2,
    paddingVertical: LAYOUT.SPACING.TINY + 1,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    maxWidth: '80%',
    borderWidth: 1,
    ...LAYOUT.SHADOW.SMALL,
    elevation: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    lineHeight: 14,
  },
});
