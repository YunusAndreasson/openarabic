import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { getRootLemma } from '@/utils/stringUtils';
import { fillTemplate } from '@/utils/fillTemplate';

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
 * key wearing a label: "Hardest words right now" above the rail has already said
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
const WordRailCardComponent = ({ word, onPress }: WordRailCardProps) => {
  const { arabicText: letters, englishText: meaning } = getRootLemma(word);

  return (
    <BaseCard
      accessibilityLabel={fillTemplate(STRINGS.HARDEST_WORD_CARD_A11Y, {
        arabic: letters,
        meaning,
      })}
      // Explicit, because `BaseCard` has no default and the label no longer says
      // "Opens the word" — the role is what carries that now.
      accessibilityRole="button"
      // BaseCard's default elevation and no stroke — the same card as the topic
      // tiles and article rails on this tab. It was the one bordered card here.
      contentStyle={styles.content}
      // Fills the slot the rail stretched for it, so a two-line gloss cannot
      // leave the card beside it short. See the note on `WordRail.styles.card`.
      style={styles.card}
      surface="card"
      onPress={onPress}
    >
      {/* `arabicCompact` caps the size and keeps the box to one line, so the
          learner's reading-size setting cannot grow a rail card past the rail.

          Both lines are centred. The headword used to sit right-aligned over a
          left-aligned gloss, each in its language's own direction, and in a
          card this narrow that put them in opposite corners: the eye crossed
          the card diagonally and read two unrelated labels. A shared axis makes
          them one word, neither direction is favoured, and it is the layout the
          reader's word sheet and the "see all" card ending this rail already
          use. */}
      <ThemedText align="center" numberOfLines={1} type="arabicCompact">
        {letters}
      </ThemedText>

      <ThemedText align="center" colorName="secondaryText" numberOfLines={2} type="caption">
        {meaning}
      </ThemedText>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  // Centred on both axes: a one-line gloss beside a two-line one would
  // otherwise hang from the top of a card the rail has stretched taller.
  content: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },
});

export const WordRailCard = memo(WordRailCardComponent);
WordRailCard.displayName = 'WordRailCard';
