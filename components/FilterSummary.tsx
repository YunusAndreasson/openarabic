import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { selectActiveFiltersCount } from '@/store/filtersSlice';
import { useAppSelectorMemo } from '@/store/hooks';

interface FilterSummaryProps {
  filteredCount: number;
  totalCount?: number;
}

const FilterSummary = memo(({ filteredCount, totalCount }: FilterSummaryProps) => {
  const activeFiltersCount = useAppSelectorMemo(selectActiveFiltersCount);

  const summaryText = useMemo(() => {
    if (totalCount !== undefined && filteredCount !== totalCount) {
      return `${filteredCount} ${STRINGS.WORD_OF_LABEL} ${totalCount} ${STRINGS.ARTICLES_LABEL_PLURAL}`;
    }
    return `${filteredCount} ${
      filteredCount === 1
        ? STRINGS.ARTICLES_LABEL_SINGULAR
        : STRINGS.ARTICLES_LABEL_PLURAL
    }`;
  }, [filteredCount, totalCount]);

  // Don't show summary if no filters are active and we have total count
  if (activeFiltersCount === 0 && totalCount !== undefined) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText
        type="caption"
        weight="medium"
        colorName="secondaryText"
        style={styles.summaryText}
      >
        {summaryText}
      </ThemedText>
    </View>
  );
});

FilterSummary.displayName = 'FilterSummary';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.SMALL,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
  },
});

export default FilterSummary;
