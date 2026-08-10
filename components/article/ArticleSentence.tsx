import { Ionicons } from '@/components/ui/Icon';
import { memo, useMemo } from 'react';
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
// Gesture-handler Pressable — see FloatingActionButtons for why. The article
// screen's RNGH background-tap wrapper swallows JS-responder touchables, which
// is why this card's close button did nothing at all.
import { Pressable } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SkiaArabicWord as ArabicWord } from '@/components/article/SkiaArabicWord';
import { FONTS } from '@/constants/fonts';
import { getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withAlpha } from '@/utils/colorUtils';
import type { RootId } from '@/types/branded.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';

interface ArticleSentenceProps {
  sentence: {
    id: string | number;
    english: string;
    arabic: string;
    audio_url: string | null;
  };
  words: SentenceWord[];
  onWordPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  /** Long-press: instant save to practice (toggle) */
  onWordLongPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  showTutorialCard?: boolean;
  onDismissTutorial?: () => void;
  /** SharedValue tracking the active word ID — drives opacity on UI thread without re-renders */
  activeWordIdSV?: SharedValue<string | number | null>;
  /** Root ID to highlight as target word (used in dictionary sentence examples) */
  highlightRootId?: RootId | null;
}

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
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const isDarkMode = useIsDarkMode();

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

  // Memoize rendered words to prevent unnecessary recreations.
  // Position-based keys keep word instances reusable when FlashList recycles
  // this sentence for another one (words measure themselves via an internal ref).
  const renderedWords = useMemo(() => {
    return words.map((word, index) => {
      // Highlight the first word when tutorial is showing
      const isFirstWord = index === 0;

      // Check if this word is the target word (for dictionary sentence examples)
      const isTargetWord = highlightRootId != null && word.root_id === highlightRootId;

      return (
        <ArabicWord
          key={`word-${word.position}`}
          word={word}
          onTooltipOpen={onWordPress}
          onWordLongPress={onWordLongPress}
          isHighlighted={isFirstWord && showTutorialCard}
          activeWordIdSV={activeWordIdSV}
          isTargetWord={isTargetWord}
        />
      );
    });
  }, [words, onWordPress, onWordLongPress, showTutorialCard, activeWordIdSV, highlightRootId]);

  return (
    <View style={[styles.container, containerStyle]}>
      {sentence.english && <ThemedText style={englishTextStyle}>{sentence.english}</ThemedText>}

      {/* Tutorial card below summary */}
      {showTutorialCard && (
        <View style={styles.tutorialContainer}>
          <View
            style={[
              styles.tutorialCard,
              {
                backgroundColor: colors.tint,
                shadowColor: colors.shadow,
              },
              // Theme-aware, like every other raised surface in the app: dark
              // mode carries no shadow (it would sit invisibly on near-black)
              // and separates by colour alone.
              getThemeAwareElevation('CARD', isDarkMode),
            ]}
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
                <Ionicons
                  name="close"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={colors.onTint}
                />
              </Pressable>
            )}
          </View>
        </View>
      )}

      <View style={styles.wordsContainer}>{renderedWords}</View>
    </View>
  );
};

ArticleSentenceInternal.displayName = 'ArticleSentence';

export const ArticleSentence = memo(ArticleSentenceInternal);

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
  tutorialCard: {
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.HALF_TINY, // Breathing room between words (2px)
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: 0, // No gap - English and Arabic belong together
    paddingBottom: LAYOUT.SPACING.SMALL, // Minimal bottom, separation handled by next English's paddingTop
    width: '100%',
  },
});
