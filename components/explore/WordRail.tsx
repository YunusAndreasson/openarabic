import { memo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { BaseCard, SnapRail } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import { WordRailCard } from './WordRailCard';

/**
 * Narrower than the article rails' 0.7/0.8, because the content is: a headword
 * and a short gloss. At ~2.3 cards to a screen the rail reads as
 * something to swipe rather than as a row that happens to overflow.
 */
const CARD_WIDTH_RATIO = 0.44;

interface SeeAllTarget {
  /** The uncapped leech count, not the number of cards shown. */
  count: number;
  onPress: () => void;
}

interface WordRailProps {
  words: StudyWord[];
  onWordPress: (word: StudyWord) => void;
  /** Rendered as a terminal card. Omit when the rail is showing everything. */
  seeAll?: SeeAllTarget;
}

/**
 * The way out of a capped rail, as the last card rather than a header link.
 *
 * The app has no "see all" affordance on a section header — `SectionLabel` is a
 * title and an optional subtitle — and inventing one for a single caller would
 * put a new interactive element on every section that ever adopts it. A
 * terminal card is reached by the same swipe the learner is already making, and
 * it is the same shape as the `SeeAllRow` that ends the revisit sheet.
 */
const SeeAllCard = ({ count, onPress }: SeeAllTarget) => {
  const colors = useColors();
  const label = STRINGS.WORDS_TO_REVISIT_SEE_ALL.replace('{count}', String(count));

  return (
    <BaseCard
      accessibilityLabel={STRINGS.HARDEST_WORDS_SEE_ALL_A11Y.replace('{count}', String(count))}
      accessibilityRole="button"
      contentStyle={styles.seeAllContent}
      style={styles.card}
      surface="card"
      onPress={onPress}
    >
      {/* Label then chevron, reading left to right — the same order and the same
          disclosure glyph as the `SeeAllRow` that ends the revisit sheet. Stacked
          with the chevron on top it read as an arrow with a caption rather than
          as a row you can follow. */}
      <ThemedText align="center" colorName="secondaryText" numberOfLines={2} type="caption">
        {label}
      </ThemedText>
      <Icon
        color={colors.textTertiary}
        name="chevron-forward"
        size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
      />
    </BaseCard>
  );
};

SeeAllCard.displayName = 'SeeAllCard';

/**
 * Horizontal snap rail of saved words — the vocabulary counterpart to
 * `ArticleRail`.
 *
 * Not a variant of `ArticleRail`: that component is typed to `Article`, builds
 * `PlaylistItemCard`s and prefetches article bodies on press-in, none of which
 * a word has. What the two genuinely share is the scroll recipe below, and it
 * is copied verbatim so the two rails on Explore behave identically under the
 * finger — same `decelerationRate`, same single-interval snap, same full-bleed
 * padding on `contentContainerStyle` rather than on the container.
 *
 * Full-bleed is load-bearing on this tab: Explore's scroll view has NO
 * horizontal padding, deliberately, so each section supplies its own 12px inset
 * and cards scroll under the screen edges. Padding the container instead would
 * clip the rail 12px early.
 */
const WordRailComponent = ({ words, onWordPress, seeAll }: WordRailProps) => {
  const { width } = useWindowDimensions();

  return (
    <SnapRail itemWidth={width * CARD_WIDTH_RATIO}>
      {words.map(word => (
        <WordRailCard key={word.root_id} word={word} onPress={() => onWordPress(word)} />
      ))}

      {seeAll ? <SeeAllCard count={seeAll.count} onPress={seeAll.onPress} /> : null}
    </SnapRail>
  );
};

const styles = StyleSheet.create({
  /**
   * Every card fills the slot `SnapRail` gave it, and the slots are already
   * equal: a horizontal content container stretches its children to the tallest
   * one. Without this the cards were only as tall as their own text, so the "see
   * all" card — an icon and one line against a headword, a gloss and a count —
   * sat a third shorter than the words beside it and read as a different kind of
   * object rather than the end of the same row.
   */
  card: {
    flex: 1,
  },
  seeAllContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },
});

export const WordRail = memo(WordRailComponent);
WordRail.displayName = 'WordRail';
