import type { FC } from 'react';
import { StyleSheet } from 'react-native';

// Direct path, matching the rest of this folder's imports from `common`: both
// callers already pull the `common` barrel in for other components (`ListRow`
// itself, `RootExplanation`), so this buys nothing — but importing every
// sibling one way keeps the rule visible instead of half the file going
// through the barrel and half not.
import { ListRow } from '@/components/common/ListRow';
import { ThemedText } from '@/components/primitives/ThemedText';
import type { SolidColorName } from '@/constants/colors';

interface StatRowProps {
  label: string;
  value: string;
  /** Omit for values that carry no judgement (a due date isn't good or bad) */
  colorName?: SolidColorName;
}

/**
 * One label/value pair as a hairline row.
 *
 * Replaces a three-column stat block: equal-width columns gave Strength,
 * Difficulty and Next review identical weight, and with two of the three
 * colored red a perfectly normal word read as an error state. Rows also put
 * the word screen on the same left-aligned scan axis as the dictionary list.
 *
 * Shared rather than local because two surfaces now report the same FSRS
 * numbers — the practice word screen and the root-level word sheet — and a stat
 * that reads differently depending on which one you opened is the drift this
 * whole row style exists to prevent.
 */
export const StatRow: FC<StatRowProps> = ({ label, value, colorName }) => (
  <ListRow divider style={styles.row}>
    <ThemedText colorName="secondaryText" type="body">
      {label}
    </ThemedText>
    <ThemedText colorName={colorName} type="bodyBold">
      {value}
    </ThemedText>
  </ListRow>
);

StatRow.displayName = 'StatRow';

const styles = StyleSheet.create({
  // ListRow supplies the row layout and the rule; this only spreads the
  // label and value to opposite edges.
  row: {
    justifyContent: 'space-between',
  },
});
