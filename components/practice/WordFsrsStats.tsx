import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

// Direct path, not the practice barrel: the root-level word sheet renders this
// and has no business loading this folder's swipeable dictionary rows.
import { StatRow } from '@/components/practice/StatRow';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { WordMemory } from '@/hooks/vocabulary/useWordMemory';
import type { StudyWord } from '@/types/vocabulary.types';
import { getNextReviewLabel } from '@/utils/fsrsUtils';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getWordDifficultyLevel } from '@/utils/urgencyScore';

/**
 * Where this renders, which decides how much of the model it shows.
 *
 * One axis rather than separate flags, mirroring `RootExplanation`: they never
 * vary independently, because they are one decision about which surface you are
 * on.
 *
 * - `screen`: the full account, including the feedforward row.
 * - `sheet`: drops it. The sheet is a glance at a word pulled off a rail, and
 *   what a successful recall would *buy* is a reason to start reviewing, which
 *   is the screen's job rather than the card's.
 */
type WordFsrsStatsVariant = 'screen' | 'sheet';

interface WordFsrsStatsProps {
  word: StudyWord;
  memory: WordMemory | null;
  variant?: WordFsrsStatsVariant;
}

/**
 * What the scheduler currently thinks of one saved word: how hard it is, when
 * it comes back, how much of it has been earned.
 *
 * Shared because two surfaces report the same four numbers off the same row —
 * the practice word screen and the root-level word sheet — and they were two
 * copies of the same JSX, down to the lapse-aware reps string. Two copies of a
 * reading is two readings waiting to disagree.
 */
export const WordFsrsStats: FC<WordFsrsStatsProps> = ({ word, memory, variant = 'screen' }) => {
  const colors = useColors();
  const difficultyLevel = getWordDifficultyLevel(word);

  return (
    <View style={[styles.stats, { borderTopColor: colors.border }]}>
      <StatRow
        colorName={DIFFICULTY_COLORS[difficultyLevel]}
        label={STRINGS.WORD_STAT_DIFFICULTY}
        value={DIFFICULTY_LABELS[difficultyLevel]}
      />

      <StatRow label={STRINGS.WORD_STAT_NEXT_REVIEW} value={getNextReviewLabel(word.fsrs_due)} />

      {/* Feedforward: what recalling it would buy, stated before the learner
          spends the effort. The figure comes from the same ts-fsrs call the
          review screen's grade bar previews with, so it cannot promise an
          interval that grading would not give. */}
      {variant === 'screen' && memory?.nextHorizonLabel ? (
        <StatRow
          label={STRINGS.WORD_STAT_NEXT_GAIN}
          value={STRINGS.WORD_STAT_NEXT_GAIN_VALUE.replace('{horizon}', memory.nextHorizonLabel)}
        />
      ) : null}

      {memory && memory.reps > 0 ? (
        <StatRow
          label={STRINGS.WORD_STAT_REVIEWS}
          value={
            memory.lapses > 0
              ? STRINGS.WORD_REVIEWS_WITH_LAPSES.replace('{count}', String(memory.reps)).replace(
                  '{lapses}',
                  String(memory.lapses),
                )
              : STRINGS.WORD_REVIEWS_VALUE.replace('{count}', String(memory.reps))
          }
        />
      ) : null}
    </View>
  );
};

WordFsrsStats.displayName = 'WordFsrsStats';

const styles = StyleSheet.create({
  stats: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});
