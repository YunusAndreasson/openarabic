import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { getRootLemma } from '@/utils/stringUtils';

interface WordRailCardProps {
  word: StudyWord;
  onPress: () => void;
}

/**
 * One saved word the learner keeps forgetting, as a rail card.
 *
 * The word and what it means, and nothing else.
 *
 * **No forgot-count.** It was here, as plain tertiary text, and it was the sort
 * key wearing a label: "Hardest right now" above the rail has already said
 * these are the ones being lost, so a per-card "4× forgot" restates the section
 * heading on every card and turns a reading tab into a scoreboard of failures.
 * The revisit sheet keeps the number because there it IS the subject; the sheet
 * this card opens keeps it too, as one factual stat beside the memory curve.
 * That is the same argument the revisit sheet already makes for refusing to
 * paint its rows red.
 *
 * **A card here, a flat row there, and both are right.** `WordListRow` argues
 * against elevated cards because a list of hundreds should read as a list; a
 * horizontal rail of ten has the opposite problem — with no boundary between
 * items there is nothing to tell the eye that this scrolls sideways.
 *
 * The Arabic is `roots.letters` — the lemma — and deliberately uncoloured: it
 * carries no prefix and no case, so grammar colouring would have nothing true
 * to paint.
 */
const WordRailCardComponent: FC<WordRailCardProps> = ({ word, onPress }) => {
  const { arabicText: letters, englishText: meaning } = getRootLemma(word);

  return (
    <BaseCard
      accessibilityLabel={STRINGS.HARDEST_WORD_CARD_A11Y.replace('{arabic}', letters).replace(
        '{meaning}',
        meaning,
      )}
      // Explicit, because `BaseCard` has no default and the label no longer says
      // "Opens the word" — the role is what carries that now.
      accessibilityRole="button"
      bordered
      contentStyle={styles.content}
      elevation="hairline"
      // Fills the slot the rail stretched for it, so a two-line gloss cannot
      // leave the card beside it short. See the note on `WordRail.styles.card`.
      style={styles.card}
      surface="card"
      onPress={onPress}
    >
      {/* `arabicCompact` caps the size and keeps the box to one line, so the
          learner's reading-size setting cannot grow a rail card past the rail.
          The wrapper is what gives the headword its own row: Arabic is
          right-aligned inside it, so the card reads RTL at the top and LTR
          below without either language fighting its natural direction. */}
      <View style={styles.arabicRow}>
        <ThemedText align="right" numberOfLines={1} type="arabicCompact">
          {letters}
        </ThemedText>
      </View>

      <ThemedText colorName="secondaryText" numberOfLines={2} type="caption">
        {meaning}
      </ThemedText>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  arabicRow: {
    width: '100%',
  },
  card: {
    flex: 1,
  },
  content: {
    gap: LAYOUT.SPACING.TINY,
    padding: LAYOUT.SPACING.MEDIUM,
  },
});

export const WordRailCard = memo(WordRailCardComponent);
WordRailCard.displayName = 'WordRailCard';
