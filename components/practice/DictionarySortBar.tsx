import { memo, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { DictionarySortField, SortDirection } from '@/hooks/vocabulary/useDictionaryList';

const SORT_LABELS: { field: DictionarySortField; label: string }[] = [
  { field: 'difficulty', label: STRINGS.SORT_DIFFICULTY },
  { field: 'strength', label: STRINGS.SORT_STRENGTH },
  { field: 'recent', label: STRINGS.SORT_RECENT },
];

function formatWordCount(count: number): string {
  return count === 1
    ? STRINGS.WORD_COUNT_ONE
    : STRINGS.WORD_COUNT_OTHER.replace('{count}', String(count));
}

interface DictionarySortBarProps {
  sortField: DictionarySortField;
  sortDirection: SortDirection;
  /** Select a field; re-selecting the active one flips its direction */
  onSelectField: (field: DictionarySortField) => void;
  /** Currently visible word count (reflects an active search filter) */
  wordCount: number;
}

/**
 * Slim sort control above the dictionary list: three sort fields as plain
 * text options (active one carries a direction arrow) with the word count
 * on the right. Scrolls with the list.
 */
const DictionarySortBarComponent: FC<DictionarySortBarProps> = ({
  sortField,
  sortDirection,
  onSelectField,
  wordCount,
}) => {
  const colors = useColors();

  // The direction arrow rides on whichever option is active, so the option list
  // has to be rebuilt when either the field or the direction changes.
  const options = useMemo<SegmentedControlOption<DictionarySortField>[]>(
    () =>
      SORT_LABELS.map(({ field, label }) => ({
        value: field,
        label,
        activeIcon: sortDirection === 'desc' ? 'arrow-down' : 'arrow-up',
      })),
    [sortDirection],
  );

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <SegmentedControl
        accessibilityLabel={STRINGS.SORT_BY_A11Y}
        options={options}
        value={sortField}
        onChange={onSelectField}
      />

      <ThemedText colorName="subtleLabelText" type="caption">
        {formatWordCount(wordCount)}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    // Seats the control against the first row, matching the list's separators
    borderBottomWidth: LAYOUT.BORDER.WIDTH.HAIRLINE,
  },
});

export const DictionarySortBar = memo(DictionarySortBarComponent);

DictionarySortBar.displayName = 'DictionarySortBar';
