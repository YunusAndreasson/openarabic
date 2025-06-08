import { useLocalSearchParams } from 'expo-router';
import type { ComponentRef } from 'react';
import React, { createRef, useEffect, useRef, useMemo } from 'react';
import type { ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { LAYOUT, FONTS } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';

import { ArabicWord } from './ArabicWord';

const EMPTY_DUE_WORDS_SET = new Set<number>();

interface ArticleSentenceProps {
  sentence: {
    id: string | number;
    english: string;
    arabic: string;
    audio_url: string | null;
  };
  words: SentenceWord[];
  renderWord?: (
    word: SentenceWord,
    isAudioHighlighted: boolean,
    wordRef: React.RefObject<ComponentRef<typeof TouchableOpacity>>
  ) => React.ReactNode;
  onWordPress?: (word: SentenceWord) => void;
  settings: {
    showEnglish: boolean;
    fontScale: number;
    showTransliteration: boolean;
    showWordType: boolean;
  };
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  currentPlayingWordId: number | null;
  currentPlayingPosition: number | null;
  isPlaying?: boolean;
  dueWordRootIds?: Set<number>;
}

function ArticleSentenceComponent({
  sentence,
  words,
  renderWord,
  onWordPress,
  settings,
  colors: propColors,
  containerStyle,
  currentPlayingWordId,
  currentPlayingPosition,
  isPlaying,
  dueWordRootIds = EMPTY_DUE_WORDS_SET,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
  const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();

  const previousWordIdRef = useRef<number | null>(null);

  const wordRefs = useRef<React.RefObject<any>[]>([]);

  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    wordRefs.current = words.map(() => createRef<any>());
  }, [words]);

  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 1000 })
      );
    }
  }, [isHighlighted, highlightOpacity]);

  const animatedHighlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  previousWordIdRef.current = currentPlayingWordId;

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

  const backgroundStyle = useMemo(
    () => [
      styles.sentenceBackground,
      {
        backgroundColor: colors.tint ? `${colors.tint}40` : colors.transparent,
      },
      animatedHighlightStyle,
    ],
    [colors.tint, colors.transparent, animatedHighlightStyle]
  );

  const renderedWords = useMemo(() => {
    const renderWordWithProps = (word: SentenceWord, index: number, isWordHighlighted: boolean) => {
      const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
      if (!wordRefs.current[index]) {
        wordRefs.current[index] = createRef<any>();
      }
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;
      return renderWord ? (
        renderWord(word, isWordHighlighted, wordRefs.current[index])
      ) : (
        <ArabicWord
          key={`word-${wordId}-${word.position || sentence.id}`}
          word={word}
          onPress={word => onWordPress?.(word)}
          settings={settings}
          isAudioHighlighted={isWordHighlighted}
          wordRef={wordRefs.current[index]}
          position={index}
          isDueWord={isDueWord}
        />
      );
    };

    return words.map((word, index) => {
      const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
      const isWordHighlighted =
        currentPlayingWordId === wordId && currentPlayingPosition === index && !!isPlaying;
      return renderWordWithProps(word, index, isWordHighlighted);
    });
  }, [
    renderWord,
    words,
    currentPlayingWordId,
    currentPlayingPosition,
    !!isPlaying,
    sentence.id,
    settings,
    onWordPress,
    dueWordRootIds,
  ]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={backgroundStyle} />
      {settings.showEnglish && sentence.english && (
        <Animated.Text style={englishTextStyle}>{sentence.english}</Animated.Text>
      )}
      <View style={styles.wordsContainer}>{renderedWords}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: LAYOUT.SPACING.SMALL,
    overflow: 'visible',
    position: 'relative',
  },
  englishText: {
    fontFamily: FONTS.ENGLISH,
    paddingBottom: LAYOUT.SPACING.TINY,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  sentenceBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    paddingRight: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    width: '100%',
  },
});

export const ArticleSentence = ArticleSentenceComponent;
