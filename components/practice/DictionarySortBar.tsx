import { memo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { DictionarySortField, SortDirection } from '@/hooks/vocabulary/useDictionaryList';
import { selectionFeedback } from '@/utils/haptics';

const SORT_OPTIONS: { field: DictionarySortField; label: string }[] = [
  { field: 'difficulty', label: STRINGS.SORT_DIFFICULTY },
  { field: 'strength', label: STRINGS.SORT_STRENGTH },
  { field: 'recent', label: STRINGS.SORT_RECENT },
];

const DIRECTION_ICON_SIZE = 12;

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

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.options}>
        {SORT_OPTIONS.map(({ field, label }) => {
          const isActive = field === sortField;
          return (
            <Pressable
              key={field}
              onPress={() => {
                selectionFeedback();
                onSelectField(field);
              }}
              hitSlop={LAYOUT.HIT_SLOP.SMALL}
              style={styles.option}
            >
              <ThemedText
                type="caption"
                weight={isActive ? 'semibold' : 'normal'}
                colorName={isActive ? 'text' : 'subtleLabelText'}
              >
                {label}
              </ThemedText>
              {isActive && (
                <Ionicons
                  name={sortDirection === 'desc' ? 'arrow-down' : 'arrow-up'}
                  size={DIRECTION_ICON_SIZE}
                  color={colors.secondaryText}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="caption" colorName="subtleLabelText">
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  options: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.LARGE,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.HALF_TINY,
  },
});

export const DictionarySortBar = memo(DictionarySortBarComponent);

DictionarySortBar.displayName = 'DictionarySortBar';
