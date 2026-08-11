import { memo, useCallback, useMemo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Ionicons, SegmentedControl, type SegmentedControlOption } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type {
  DictionaryScope,
  DictionarySortField,
  SortDirection,
} from '@/hooks/vocabulary/useDictionaryList';
import { selectionFeedback } from '@/utils/haptics';

const SORT_LABELS: { field: DictionarySortField; label: string }[] = [
  { field: 'difficulty', label: STRINGS.SORT_DIFFICULTY },
  { field: 'strength', label: STRINGS.SORT_STRENGTH },
  { field: 'recent', label: STRINGS.SORT_RECENT },
];

export const SCOPE_LABELS: Record<DictionaryScope, string> = {
  all: STRINGS.SCOPE_ALL,
  due: STRINGS.SCOPE_DUE,
  struggling: STRINGS.SCOPE_STRUGGLING,
  mastered: STRINGS.SCOPE_MASTERED,
};

const CHEVRON_SIZE = 12;
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export function formatWordCount(count: number): string {
  return count === 1
    ? STRINGS.WORD_COUNT_ONE
    : STRINGS.WORD_COUNT_OTHER.replace('{count}', String(count));
}

interface DictionarySortBarProps {
  sortField: DictionarySortField;
  sortDirection: SortDirection;
  /** Select a field; re-selecting the active one flips its direction */
  onSelectField: (field: DictionarySortField) => void;
  /** Currently visible word count (reflects the active scope and search) */
  wordCount: number;
  scope: DictionaryScope;
  /** Opens the scope picker */
  onPressScope: () => void;
}

/**
 * Slim control bar above the dictionary list: three sort fields as plain text
 * options (the active one carries a direction arrow) on the left, and the word
 * count on the right.
 *
 * The count doubles as the scope control. It is already the element that reports
 * how many words the list is showing, so making it the thing that changes what
 * is counted keeps the filter on the object it modifies — and it means a
 * narrowed list always states its own scope in place. A filter tucked into the
 * header would let a list quietly show a third of the words with nothing on
 * screen saying so.
 */
const DictionarySortBarComponent: FC<DictionarySortBarProps> = ({
  sortField,
  sortDirection,
  onSelectField,
  wordCount,
  scope,
  onPressScope,
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

  const handlePressScope = useCallback(() => {
    selectionFeedback();
    onPressScope();
  }, [onPressScope]);

  const isScoped = scope !== 'all';
  // Scoped, the count leads with the scope's name ("Due now · 24"); unscoped it
  // is the plain total. Either way the line describes exactly what is below it.
  const countLabel = isScoped
    ? STRINGS.SCOPE_COUNT_TEMPLATE.replace('{scope}', SCOPE_LABELS[scope]).replace(
        '{count}',
        String(wordCount),
      )
    : formatWordCount(wordCount);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <SegmentedControl
        accessibilityLabel={STRINGS.SORT_BY_A11Y}
        options={options}
        value={sortField}
        onChange={onSelectField}
      />

      <Pressable
        accessibilityHint={STRINGS.FILTER_WORDS_A11Y}
        accessibilityLabel={countLabel}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        style={styles.scopeButton}
        onPress={handlePressScope}
      >
        <ThemedText colorName={isScoped ? 'tint' : 'subtleLabelText'} type="caption">
          {countLabel}
        </ThemedText>
        <Ionicons
          color={isScoped ? colors.tint : colors.textTertiary}
          name="chevron-down"
          size={CHEVRON_SIZE}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    // Seats the control against the first row, matching the list's separators
    borderBottomWidth: LAYOUT.BORDER.WIDTH.HAIRLINE,
  },
  scopeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
});

export const DictionarySortBar = memo(DictionarySortBarComponent);

DictionarySortBar.displayName = 'DictionarySortBar';
