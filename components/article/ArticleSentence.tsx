import { Ionicons } from '@expo/vector-icons';
import type { ComponentRef, RefObject } from 'react';
import { createRef, memo, useEffect, useMemo, useRef } from 'react';
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SkiaArabicWord as ArabicWord } from '@/components/article/SkiaArabicWord';
import { FONTS, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { createPadding } from '@/utils/layoutUtils';

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

  // Bouncing arrow animation for tutorial card
  const arrowTranslateY = useSharedValue(0);

  useEffect(() => {
    if (showTutorialCard) {
      // Bouncing arrow
      arrowTranslateY.value = withRepeat(
        withSequence(withTiming(-8, { duration: 600 }), withTiming(0, { duration: 600 })),
        -1,
        false,
      );
    }
  }, [showTutorialCard, arrowTranslateY]);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: arrowTranslateY.value }],
  }));

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

      return (
        <ArabicWord
          key={refKey}
          word={word}
          onTooltipOpen={onWordPress}
          wordRef={wordRef}
          position={index}
        />
      );
    });
  }, [words, onWordPress, sentence.id]);

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
                onPress={onDismissTutorial}
                style={[styles.closeButton, { backgroundColor: `${colors.background}20` }]}
                hitSlop={LAYOUT.SPACING.SMALL}
              >
                <Ionicons name="close" size={18} color={colors.background} />
              </Pressable>
            )}
          </View>

          {/* Bouncing arrow */}
          <Animated.View style={[styles.arrowContainer, animatedArrowStyle]}>
            <Ionicons name="chevron-down" size={32} color={colors.tint} />
          </Animated.View>
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
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.TINY, // Add breathing room below English text
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
    paddingRight: LAYOUT.SPACING.LARGE, // Space for close button
  },
  closeButton: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL,
    right: LAYOUT.SPACING.SMALL,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.TINY,
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    ...createPadding({ horizontal: 'MEDIUM', vertical: 'SMALL' }),
    paddingBottom: LAYOUT.SPACING.MEDIUM, // Override for better sentence pair separation (12px)
    width: '100%',
  },
});
