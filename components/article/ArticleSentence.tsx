import { Ionicons } from '@/components/ui';
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
import { withAlpha } from '@/utils/colorUtils';
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
      {sentence.english && <ThemedText style={englishTextStyle}>{sentence.english}</ThemedText>}

      {/* Tutorial card below summary */}
      {showTutorialCard && (
        <View style={styles.tutorialContainer}>
          {/*
            A BaseCard with a tint fill. `style` lands after BaseCard's own
            surface in the style array, so the tint wins without needing a
            `surface` value for a colour only this one card uses.
          */}
          <BaseCard
            style={[styles.tutorialCard, { backgroundColor: colors.tint }]}
            contentStyle={styles.tutorialCardContent}
          >
            <ThemedText
              type="body"
              weight="bold"
              // `onTint` is the token for content ON the tint colour. This used
              // to use `background`, which only looked right by coincidence —
              // in dark the two are within a shade of each other, but in light
              // `background` is a tinted off-white rather than the white this
              // needs.
              style={[styles.tutorialText, { color: colors.onTint }]}
            >
              {STRINGS.TUTORIAL_WORD_TAP_CTA}
            </ThemedText>

            {onDismissTutorial && (
              <Pressable
                onPress={onDismissTutorial}
                // A circular scrim of the foreground colour, so the affordance
                // reads the same in both themes. It was a hand-built
                // `${colors.background}20` string, which composed a near-black
                // disc on the tint in dark mode and a near-white one in light.
                style={[styles.closeButton, { backgroundColor: withAlpha(colors.onTint, 0.18) }]}
                // 28px button + 8px slop was a 44px target only on the diagonal.
                // This is the control the learner reaches for to get the banner
                // out of the way, so it gets a real one.
                hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
                accessibilityRole="button"
                accessibilityLabel={STRINGS.ONBOARDING_SKIP}
              >
                <Ionicons name="close" size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={colors.onTint} />
              </Pressable>
            )}
          </BaseCard>
        </View>
      )}

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
  tutorialContainer: {
    // No alignment - let card fill width naturally
  },
  // BaseCard supplies the radius and the elevation; this is the card's margin.
  tutorialCard: {
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  // The padded box the close button anchors against. It fills the card exactly,
  // so `closeButton`'s absolute inset still measures from the card's own edge.
  tutorialCardContent: {
    padding: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  tutorialText: {
    textAlign: 'center',
    paddingRight: LAYOUT.SPACING.XLARGE, // Space for close button
  },
  closeButton: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL,
    right: LAYOUT.SPACING.SMALL,
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE,
    // A real circle. At radius 16 on a 28px box the corners were flattened
    // just enough to read as a rounded square that could not decide.
    borderRadius: LAYOUT.BUTTON.ICON_SIZE.XLARGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
