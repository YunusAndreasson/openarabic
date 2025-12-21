import { Ionicons } from '@expo/vector-icons';
import type { ComponentRef, RefObject } from 'react';
import { createRef, memo, useMemo, useRef } from 'react';
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SkiaArabicWord as ArabicWord } from '@/components/article/SkiaArabicWord';
import { FONTS, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

interface ArticleSentenceProps {
  sentence: {
    id: string | number;
    english: string;
    arabic: string;
    audio_url: string | null;
  };
  words: SentenceWord[];
  onWordPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  settings: {
    showEnglish: boolean;
  };
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  showTutorialCard?: boolean;
  onDismissTutorial?: () => void;
}

const ArticleSentenceInternal = function ArticleSentence({
  sentence,
  words,
  onWordPress,
  settings,
  colors: propColors,
  containerStyle,
  showTutorialCard = false,
  onDismissTutorial,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;

  // Use Map to persist refs across re-renders, avoiding memory leaks
  // Only create new refs when new word IDs appear
  const wordRefs = useRef<Map<string, RefObject<ComponentRef<typeof Pressable>>>>(new Map());

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

  // Memoize rendered words to prevent unnecessary recreations
  // Use stable ref Map to avoid creating new refs on every render
  const renderedWords = useMemo(() => {
    return words.map((word, index) => {
      const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
      const refKey = `word-${wordId}-${word.position}-${sentence.id}`;

      // Get existing ref or create new one only if it doesn't exist
      let wordRef = wordRefs.current.get(refKey);
      if (!wordRef) {
        wordRef = createRef<ComponentRef<typeof Pressable>>() as RefObject<
          ComponentRef<typeof Pressable>
        >;
        wordRefs.current.set(refKey, wordRef);
      }

      // Highlight the first word when tutorial is showing
      const isFirstWord = index === 0;

      return (
        <ArabicWord
          key={refKey}
          word={word}
          onTooltipOpen={onWordPress}
          wordRef={wordRef}
          position={index}
          isHighlighted={isFirstWord && showTutorialCard}
        />
      );
    });
  }, [words, onWordPress, sentence.id, showTutorialCard]);

  return (
    <View style={[styles.container, containerStyle]}>
      {settings.showEnglish && sentence.english && (
        <ThemedText style={englishTextStyle}>{sentence.english}</ThemedText>
      )}

      {/* Tutorial card below summary */}
      {showTutorialCard && (
        <View style={styles.tutorialContainer}>
          <View
            style={[
              styles.tutorialCard,
              {
                backgroundColor: colors.tint,
                ...LAYOUT.ELEVATION.SMALL,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <ThemedText
              type="body"
              weight="bold"
              style={[styles.tutorialText, { color: colors.background }]}
            >
              {STRINGS.TUTORIAL_WORD_TAP_CTA}
            </ThemedText>

            {/* Close button */}
            {onDismissTutorial && (
              <Pressable
                onPress={() => {
                  selectionFeedback();
                  onDismissTutorial();
                }}
                style={[styles.closeButton, { backgroundColor: `${colors.background}20` }]}
                hitSlop={LAYOUT.SPACING.SMALL}
              >
                <Ionicons
                  name="close"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={colors.background}
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
    paddingTop: LAYOUT.SPACING.XLARGE, // More separation from previous Arabic sentence
    paddingBottom: 0, // Minimal gap to keep English close to its Arabic
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MICRO, // Minimal gap between words (1px)
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.TINY, // Tight coupling with English above
    paddingBottom: LAYOUT.SPACING.SMALL, // Minimal bottom, separation handled by next English's paddingTop
    width: '100%',
  },
});
