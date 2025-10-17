import { useLocalSearchParams } from 'expo-router';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { createRef, useEffect, useRef } from 'react';
import type { LayoutRectangle, Pressable, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ArabicWord } from '@/components/article/ArabicWord';
import { FONTS, LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
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
  renderWord?: (word: SentenceWord) => ReactNode;
  onWordPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  settings: {
    showEnglish: boolean;
  };
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  currentHighlightedWord?: SentenceWord | null;
}

function renderWordWithProps(
  word: SentenceWord,
  index: number,
  wordRefs: RefObject<ComponentRef<typeof Pressable>>[],
  renderWord: ((word: SentenceWord, isHighlighted: boolean) => ReactNode) | undefined,
  onWordPress: ((word: SentenceWord, layout?: LayoutRectangle) => void) | undefined,
  sentenceId: string | number,
  currentHighlightedWord?: SentenceWord | null
) {
  const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
  if (!wordRefs[index]) {
    wordRefs[index] = createRef<ComponentRef<typeof Pressable>>() as RefObject<
      ComponentRef<typeof Pressable>
    >;
  }
  const isHighlighted = currentHighlightedWord
    ? word.id === currentHighlightedWord.id && word.word_form === currentHighlightedWord.word_form
    : false;

  return renderWord ? (
    renderWord(word, isHighlighted)
  ) : (
    <ArabicWord
      key={`word-${wordId}-${word.position}-${index}-${sentenceId}`}
      word={word}
      onTooltipOpen={layout => onWordPress?.(word, layout)}
      wordRef={wordRefs[index]}
      position={index}
      isHighlighted={isHighlighted}
    />
  );
}

export function ArticleSentence({
  sentence,
  words,
  renderWord,
  onWordPress,
  settings,
  colors: propColors,
  containerStyle,
  currentHighlightedWord,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
  const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();

  const wordRefs = useRef<RefObject<ComponentRef<typeof Pressable>>[]>([]);
  const {
    animatedStyle: animatedHighlightStyle,
    startAnimation,
    reverseAnimation,
  } = useOpacityAnimation({ initialOpacity: 0 });

  useEffect(() => {
    wordRefs.current = words.map(() =>
      createRef<ComponentRef<typeof Pressable>>()
    ) as RefObject<ComponentRef<typeof Pressable>>[];
  }, [words]);

  useEffect(() => {
    if (isHighlighted) {
      startAnimation(0, reverseAnimation);
    }
  }, [isHighlighted, startAnimation, reverseAnimation]);

  // Style calculations
  const englishTextStyle = {
    ...styles.englishText,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    color: colors.englishText,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  };

  const backgroundStyle = Object.assign(
    {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
      backgroundColor: colors.tint ? `${colors.tint}40` : colors.transparent,
    },
    animatedHighlightStyle
  ) as AnimatedStyle<ViewStyle>;

  // Rendered words
  const renderedWords = words.map((word, index) => {
    return renderWordWithProps(
      word,
      index,
      wordRefs.current,
      renderWord,
      onWordPress,
      sentence.id,
      currentHighlightedWord
    );
  });

  // Use Animated.View directly - it's properly imported from react-native-reanimated
  const AnimatedView = Animated.View;

  return (
    <View style={[styles.container, containerStyle]}>
      <AnimatedView style={backgroundStyle} />
      {settings.showEnglish && sentence.english && (
        <ThemedText style={englishTextStyle}>{sentence.english}</ThemedText>
      )}
      <View style={styles.wordsContainer}>{renderedWords}</View>
    </View>
  );
}

ArticleSentence.displayName = 'ArticleSentence';

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    overflow: 'visible',
    position: 'relative',
  },
  englishText: {
    fontFamily: FONTS.ENGLISH,
    paddingTop: LAYOUT.SPACING.XXLARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    ...createPadding({ horizontal: 'MEDIUM', vertical: 'MEDIUM' }),
    width: '100%',
  },
});
