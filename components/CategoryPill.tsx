import React, { useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { LAYOUT } from '@/constants/layout';
import { createBasePillStyles, basePillStyles } from './pills/BasePill';

interface CategoryPillProps {
  category: string;
  absolute?: boolean;
}

export function CategoryPill({ category, absolute = true }: CategoryPillProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Convert the category to uppercase for better visual hierarchy
  const displayCategory = category.toUpperCase();

  // Use the shared base pill styles with isSelected=true since CategoryPill is always "selected" in terms of styling
  const pillStyles = useMemo(() => {
    return createBasePillStyles({
      isSelected: true,
      isDarkMode,
      colors,
    });
  }, [colors, isDarkMode]);

  return (
    <View
      style={[
        styles.container,
        pillStyles.container,
        absolute && basePillStyles.absoluteContainer,
        !absolute && styles.nonAbsoluteContainer,
      ]}
    >
      <ThemedText
        style={[styles.text, pillStyles.text]}
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
    maxWidth: '70%',
    zIndex: 15,
  },
  nonAbsoluteContainer: {
    position: 'relative',
    top: 0,
    left: 0,
    marginTop: Platform.OS === 'ios' ? LAYOUT.SPACING.LARGE : 0,
  },
  text: {
    textAlign: 'center',
  },
});
