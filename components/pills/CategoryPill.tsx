import React, { useMemo } from 'react';
import { View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { createBasePillStyles, basePillStyles } from './BasePill';
import { CategoryPillBaseProps } from '../../types/ui.types';

export function CategoryPill({
  category,
  absolute = true,
}: CategoryPillBaseProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Convert the category to uppercase for better visual hierarchy
  const displayCategory = category.toUpperCase();

  // Use the shared base pill styles
  const pillStyles = useMemo(() => {
    return createBasePillStyles({
      isDarkMode,
      colors,
      // CategoryPill is always "selected" in terms of styling
      isSelected: true,
    });
  }, [colors, isDarkMode]);

  return (
    <View
      style={[
        basePillStyles.container,
        absolute && basePillStyles.absoluteContainer,
        pillStyles.container,
      ]}
    >
      <ThemedText style={pillStyles.text} skipDefaultColor numberOfLines={1} ellipsizeMode="tail">
        {displayCategory}
      </ThemedText>
    </View>
  );
}

CategoryPill.displayName = 'CategoryPill';
