import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { WordMemoryCurve } from '@/components/practice/WordMemoryCurve';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { WordMemory } from '@/hooks/vocabulary/useWordMemory';

interface WordMemoryPanelProps {
  memory: WordMemory;
  /** Human next-review label, e.g. "In 12 days" — announced with the curve. */
  dueLabel: string;
}

/**
 * How far this word's memory currently reaches, and the decay it is reaching
 * across.
 *
 * Replaces a `Strength: Weak | Medium | Strong` row. Three buckets over a value
 * that runs to a year meant the label froze about a week into a word's life —
 * a word held for 8 days and one held for 8 months both read "Strong" — so the
 * screen stopped reporting progress exactly where progress starts. A horizon in
 * days keeps moving for as long as the learner keeps earning it.
 */
export const WordMemoryPanel = memo<WordMemoryPanelProps>(({ memory, dueLabel }) => {
  const { curve, recallNow, stageLabel, horizonLabel } = memory;

  return (
    <View style={styles.section}>
      <ThemedText type="overline" colorName="subtleLabelText">
        {STRINGS.WORD_MEMORY_TITLE}
      </ThemedText>

      {curve && recallNow != null ? (
        <>
          <WordMemoryCurve
            curve={curve}
            accessibilityLabel={STRINGS.WORD_MEMORY_CURVE_A11Y.replace(
              '{percent}',
              String(recallNow),
            ).replace('{due}', dueLabel.toLowerCase())}
          />
          <View style={styles.captionRow}>
            <ThemedText type="caption" colorName="captionText" style={styles.captionLead}>
              {STRINGS.WORD_MEMORY_SUMMARY.replace('{stage}', stageLabel).replace(
                '{horizon}',
                horizonLabel,
              )}
            </ThemedText>
            {/* Sits on the right, under the end of the curve, because it is a
                reading of this moment rather than a property of the word. */}
            <ThemedText type="caption" colorName="captionText">
              {STRINGS.WORD_RECALL_NOW.replace('{percent}', String(recallNow))}
            </ThemedText>
          </View>
        </>
      ) : (
        // No review behind it means no curve — and a flat line at zero would be
        // a lie about a word that simply hasn't started.
        <ThemedText type="body" colorName="secondaryText" style={styles.emptyLine}>
          {STRINGS.WORD_NOT_PRACTISED}
        </ThemedText>
      )}
    </View>
  );
});

WordMemoryPanel.displayName = 'WordMemoryPanel';

const styles = StyleSheet.create({
  section: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  captionLead: {
    flexShrink: 1,
  },
  emptyLine: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
