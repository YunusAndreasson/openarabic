import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { createBasePillStyles } from './BasePill';
import type { Tables } from '../../types/database.types';

interface HorizontalCategoryPillProps {
  category: Tables<'categories'> | null;
  isSelected: boolean;
  onPress: () => void;
}

function HorizontalCategoryPillComponent({
  category,
  isSelected,
  onPress,
}: HorizontalCategoryPillProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const displayText = category ? category.name.toUpperCase() : 'ALL';

  // Use the shared base pill styles
  const pillStyles = useMemo(() => {
    return createBasePillStyles({
      isSelected,
      isDarkMode,
      colors,
    });
  }, [isSelected, colors, isDarkMode]);

  return (
    <TouchableOpacity style={pillStyles.container} onPress={onPress} activeOpacity={0.7}>
      <ThemedText style={pillStyles.text} skipDefaultColor>
        {displayText}
      </ThemedText>
    </TouchableOpacity>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const HorizontalCategoryPill = React.memo(HorizontalCategoryPillComponent);
HorizontalCategoryPill.displayName = 'HorizontalCategoryPill';
