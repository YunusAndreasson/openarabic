import { Icon } from '@/components/ui';
import { memo, useMemo } from 'react';
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
// Gesture-handler Pressable — see FloatingActionButtons for why. The article
// screen's RNGH background-tap wrapper swallows JS-responder touchables, which
// is why this card's close button did nothing at all.
import { Pressable } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { SkiaSentenceWords } from '@/components/article/SkiaSentenceWords';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { RootId } from '@/types/branded.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';

export interface ArticleSentenceProps {
  sentence: {
    id: string | number;
    english: string;
    arabic: string;
  };
  words: SentenceWord[];
  onWordPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  /** Long-press: instant save to practice (toggle) */
  onWordLongPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  showTutorialCard?: boolean;
  onDismissTutorial?: () => void;
  /** SharedValue tracking the active word ID — dims that word without re-rendering other sentences */
  activeWordIdSV?: SharedValue<string | number | null>;
  /** Root ID to highlight as target word (used in dictionary sentence examples) */
  highlightRootId?: RootId | null;
  /** Screen-level selection snapshot; avoids per-word query subscriptions. */
  selectedRootIds?: ReadonlySet<number>;
}

/**
 * A selected-root set is shared by the whole reader and gets a new identity
 * whenever one word is saved. Only invalidate this sentence when membership
 * changed for one of the roots it actually renders.
 */
export const areArticleSentencePropsEqual = (
  previous: ArticleSentenceProps,
  next: ArticleSentenceProps,
): boolean => {
  if (
    previous.sentence !== next.sentence ||
    previous.words !== next.words ||
    previous.onWordPress !== next.onWordPress ||
    previous.onWordLongPress !== next.onWordLongPress ||
    previous.colors !== next.colors ||
    previous.containerStyle !== next.containerStyle ||
    previous.showTutorialCard !== next.showTutorialCard ||
    previous.onDismissTutorial !== next.onDismissTutorial ||
    previous.activeWordIdSV !== next.activeWordIdSV ||
    previous.highlightRootId !== next.highlightRootId
  ) {
    return false;
  }

  const previousSelectedRootIds = previous.selectedRootIds;
  const nextSelectedRootIds = next.selectedRootIds;

  if (previousSelectedRootIds === nextSelectedRootIds) {
    return true;
  }

  if (previousSelectedRootIds === undefined || nextSelectedRootIds === undefined) {
    return false;
  }

  return previous.words.every(
    word => previousSelectedRootIds.has(word.root_id) === nextSelectedRootIds.has(word.root_id),
  );
};

const ArticleSentenceInternal = function ArticleSentence({
  sentence,
  words,
  onWordPress,
  onWordLongPress,
  colors: propColors,
  containerStyle,
  showTutorialCard = false,
  onDismissTutorial,
  activeWordIdSV,
  highlightRootId,
  selectedRootIds,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;

  // Memoize English text style to prevent recreation
  const englishTextStyle = useMemo(
    () => ({
      ...styles.englishText,
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
      color: colors.englishText,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
    }),
    [colors.englishText],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* The word-tap hint, ABOVE the first sentence pair. It used to sit
          between the first English line and its Arabic, splitting a
          translation from the text it translates, and as a tint-filled card
          with bold white type it was the loudest thing on the reading surface.
          Now an ordinary card in the body's own quiet register: the pulsing
          marker on the first word is what points, this only explains it. */}
      {showTutorialCard && (
        <BaseCard style={styles.tutorialCard} contentStyle={styles.tutorialCardContent}>
          <ThemedText colorName="secondaryText" style={styles.tutorialText} type="body">
            {STRINGS.TUTORIAL_WORD_TAP_CTA}
          </ThemedText>

          {onDismissTutorial && (
            <Pressable
              onPress={onDismissTutorial}
              // The glyph is small; the target is not. This is the control the
              // learner reaches for to get the hint out of the way.
              hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.ONBOARDING_SKIP}
            >
              <Icon name="close" size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={colors.textTertiary} />
            </Pressable>
          )}
        </BaseCard>
      )}

      {sentence.english && <ThemedText style={englishTextStyle}>{sentence.english}</ThemedText>}

      <SkiaSentenceWords
        words={words}
        onWordPress={onWordPress}
        onWordLongPress={onWordLongPress}
        highlightFirstWord={showTutorialCard}
        activeWordIdSV={activeWordIdSV}
        highlightRootId={highlightRootId}
        selectedRootIds={selectedRootIds}
      />
    </View>
  );
};

ArticleSentenceInternal.displayName = 'ArticleSentence';

export const ArticleSentence = memo(ArticleSentenceInternal, areArticleSentencePropsEqual);

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    overflow: 'visible',
  },
  englishText: {
    fontFamily: FONTS.ENGLISH,
    paddingTop: LAYOUT.SPACING.XXLARGE, // More separation from previous Arabic sentence
    paddingBottom: LAYOUT.SPACING.TINY, // Small gap before its Arabic text
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  // BaseCard supplies the radius, surface and elevation; this is the card's
  // margin. Inset like the sentence text it sits above.
  tutorialCard: {
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  tutorialCardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  tutorialText: {
    flex: 1,
  },
});
