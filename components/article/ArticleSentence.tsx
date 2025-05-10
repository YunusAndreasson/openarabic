import { useLocalSearchParams } from 'expo-router';
import type { ComponentRef } from 'react';
import React, { createRef, memo, useEffect, useRef, useMemo } from 'react';
import type { ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Colors } from '../../constants/Colors';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { ThemeColors } from '../../types/ui/theme.types';
import type { SentenceWord } from '../../types/vocabulary.types';

import { ArabicWord } from './ArabicWord';

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
  currentPlayingSentenceId: number | null;
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
  currentPlayingSentenceId,
  currentPlayingWordId,
  currentPlayingPosition,
  isPlaying,
  dueWordRootIds = new Set(),
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
  const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();

  const previousWordIdRef = useRef<number | null>(null);

  const wordRefs = useRef<Array<React.RefObject<any>>>([]);

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
        color: colors.text,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6 * settings.fontScale,
      },
    ],
    [colors.text, settings.fontScale]
  );

  const backgroundStyle = useMemo(
    () => [
      styles.sentenceBackground,
      {
        backgroundColor: colors.tint ? `${colors.tint}40` : Colors.light.transparent,
      },
      animatedHighlightStyle,
    ],
    [colors.tint, animatedHighlightStyle]
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
      <View style={styles.wordsContainer}>{renderedWords}</View>
      {settings.showEnglish && sentence.english && (
        <Animated.Text style={englishTextStyle}>{sentence.english}</Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: LAYOUT.SPACING.SMALL,
    overflow: 'visible',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  englishText: {
    fontFamily: 'Philosopher',
    opacity: 0.8,
    paddingBottom: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.SPACING.TINY,
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
    minHeight: LAYOUT.SPACING.XLARGE * 2,
    paddingRight: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
});

export const ArticleSentence = memo(ArticleSentenceComponent, (prevProps, nextProps) => {
  if (prevProps.currentPlayingSentenceId !== nextProps.currentPlayingSentenceId) return false;
  if (prevProps.currentPlayingWordId !== nextProps.currentPlayingWordId) return false;
  if (prevProps.currentPlayingPosition !== nextProps.currentPlayingPosition) return false;
  if (prevProps.sentence.id !== nextProps.sentence.id) return false;
  if (prevProps.settings.showEnglish !== nextProps.settings.showEnglish) return false;
  if (prevProps.settings.showTransliteration !== nextProps.settings.showTransliteration)
    return false;
  if (prevProps.words !== nextProps.words) return false;
  return true;
});
