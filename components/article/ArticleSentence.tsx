import { useLocalSearchParams } from 'expo-router';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { createRef, memo, useEffect, useMemo, useRef } from 'react';
import type { LayoutRectangle, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { type AnimatedStyleProp } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ArabicWord } from '@/components/article/ArabicWord';
import { FONTS, LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';

// Static constants to prevent recreation
const EMPTY_DUE_WORDS_SET = new Set<number>();

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
    fontScale: number;
  };
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  dueWordRootIds?: Set<number>;
  currentHighlightedWordIndex?: number;
}

// Custom comparison function for React.memo optimization
const ArticleSentenceComparison = (
  prevProps: ArticleSentenceProps,
  nextProps: ArticleSentenceProps
): boolean => {
  // Check primitive values first for early return
  if (
    prevProps.sentence.id !== nextProps.sentence.id ||
    prevProps.sentence.english !== nextProps.sentence.english ||
    prevProps.settings.showEnglish !== nextProps.settings.showEnglish ||
    prevProps.settings.fontScale !== nextProps.settings.fontScale ||
    prevProps.words.length !== nextProps.words.length ||
    prevProps.currentHighlightedWordIndex !== nextProps.currentHighlightedWordIndex
  ) {
    return false;
  }

  // Check stable references
  if (
    prevProps.renderWord !== nextProps.renderWord ||
    prevProps.onWordPress !== nextProps.onWordPress ||
    prevProps.colors !== nextProps.colors ||
    prevProps.containerStyle !== nextProps.containerStyle ||
    prevProps.dueWordRootIds !== nextProps.dueWordRootIds
  ) {
    return false;
  }

  // Check if any word properties changed
  for (let i = 0; i < prevProps.words.length; i++) {
    const prevWord = prevProps.words[i];
    const nextWord = nextProps.words[i];
    if (
      !prevWord ||
      !nextWord ||
      prevWord.id !== nextWord.id ||
      prevWord.english !== nextWord.english ||
      prevWord.word_form !== nextWord.word_form ||
      prevWord.position !== nextWord.position ||
      prevWord.root_id !== nextWord.root_id
    ) {
      return false;
    }
  }

  return true;
};

function renderWordWithProps(
  word: SentenceWord,
  index: number,
  wordRefs: RefObject<ComponentRef<typeof TouchableOpacity>>[],
  dueWordRootIds: Set<number>,
  renderWord: ((word: SentenceWord, isHighlighted: boolean) => ReactNode) | undefined,
  onWordPress: ((word: SentenceWord, layout?: LayoutRectangle) => void) | undefined,
  settings: { fontScale: number },
  sentenceId: string | number,
  currentHighlightedWordIndex?: number
) {
  const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
  if (!wordRefs[index]) {
    wordRefs[index] = createRef<ComponentRef<typeof TouchableOpacity>>() as RefObject<
      ComponentRef<typeof TouchableOpacity>
    >;
  }
  const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;
  const isHighlighted = currentHighlightedWordIndex === index;

  return renderWord ? (
    renderWord(word, isHighlighted)
  ) : (
    <ArabicWord
      key={`word-${wordId}-${word.position}-${index}-${sentenceId}`}
      word={word}
      onTooltipOpen={layout => onWordPress?.(word, layout)}
      settings={{ fontScale: settings.fontScale }}
      wordRef={wordRefs[index]}
      position={index}
      isDueWord={isDueWord}
      isHighlighted={isHighlighted}
      testID={(word as any).testID}
    />
  );
}

const ArticleSentenceComponent = memo(
  ({
    sentence,
    words,
    renderWord,
    onWordPress,
    settings,
    colors: propColors,
    containerStyle,
    dueWordRootIds = EMPTY_DUE_WORDS_SET,
    currentHighlightedWordIndex,
  }: ArticleSentenceProps) => {
    const defaultColors = useColors();
    const colors = propColors || defaultColors;
    const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
    const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();

    const wordRefs = useRef<RefObject<ComponentRef<typeof TouchableOpacity>>[]>([]);
    const {
      animatedStyle: animatedHighlightStyle,
      startAnimation,
      reverseAnimation,
    } = useOpacityAnimation({ initialOpacity: 0 });

    useEffect(() => {
      wordRefs.current = words.map(() =>
        createRef<ComponentRef<typeof TouchableOpacity>>()
      ) as RefObject<ComponentRef<typeof TouchableOpacity>>[];
    }, [words]);

    useEffect(() => {
      if (isHighlighted) {
        startAnimation(0, reverseAnimation);
      }
    }, [isHighlighted, startAnimation, reverseAnimation]);

    // Memoize expensive style calculations
    const englishTextStyle = useMemo(
      () => [
        styles.englishText,
        {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
          color: colors.englishText,
          lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6 * settings.fontScale,
        },
      ],
      [colors.englishText, settings.fontScale]
    );

    const backgroundStyle = useMemo(() => {
      const baseStyle = {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
        backgroundColor: colors.tint ? `${colors.tint}40` : colors.transparent,
      };

      // Combine with animated style properties
      return Object.assign(baseStyle, animatedHighlightStyle) as AnimatedStyleProp<ViewStyle>;
    }, [colors.tint, colors.transparent, animatedHighlightStyle]);

    // Memoize rendered words to prevent unnecessary recreations
    const renderedWords = useMemo(() => {
      return words.map((word, index) => {
        return renderWordWithProps(
          word,
          index,
          wordRefs.current,
          dueWordRootIds,
          renderWord,
          onWordPress,
          settings,
          sentence.id,
          currentHighlightedWordIndex
        );
      });
    }, [
      renderWord,
      words,
      sentence.id,
      settings,
      onWordPress,
      dueWordRootIds,
      currentHighlightedWordIndex,
    ]);

    // Fallback for test environments where Animated.View might be undefined
    const AnimatedView: any = (Animated as any)?.View ?? View;

    return (
      <View style={[styles.container, containerStyle]}>
        <AnimatedView style={backgroundStyle} />
        {settings.showEnglish && sentence.english && (
          <ThemedText type="body" style={englishTextStyle as any}>
            {sentence.english}
          </ThemedText>
        )}
        <View style={styles.wordsContainer}>{renderedWords}</View>
      </View>
    );
  },
  ArticleSentenceComparison
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    overflow: 'visible',
    position: 'relative',
  },
  englishText: {
    fontFamily: FONTS.ENGLISH,
    paddingTop: LAYOUT.SPACING.XXXLARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    paddingLeft: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});

export const ArticleSentence = ArticleSentenceComponent;
