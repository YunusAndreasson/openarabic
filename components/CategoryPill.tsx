import React, { useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { LAYOUT } from '@/constants/layout';
import { createBasePillStyles, basePillStyles } from './pills/BasePill';
import { CategoryPillBaseProps } from '../types/ui.types';
import { capitalizeFirstLetter } from '../utils/stringUtils';

export function CategoryPill({
  category,
  absolute = true,
}: CategoryPillBaseProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Capitalize the first letter of the category
  const displayCategory = useMemo(() => {
    if (!category) return '';
    return capitalizeFirstLetter(category);
  }, [category]);

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
