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
    english?: string;
    arabic?: string;
    audio_url?: string | null;
    arabic_audio_url?: string | null;
  };
  words: SentenceWord[];
  renderWord?: (
    word: SentenceWord,
    isAudioHighlighted?: boolean,
    wordRef?: React.RefObject<ComponentRef<typeof TouchableOpacity>>
  ) => React.ReactNode;
  onWordPress?: (word: SentenceWord) => void;
  settings: {
    showEnglish: boolean;
    fontScale: number;
    showTransliteration?: boolean;
    showWordType?: boolean;
  };
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
  currentPlayingSentenceId?: number | null;
  currentPlayingWordId?: number | null;
  currentPlayingPosition?: number | null;
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
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
  const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();
  const isPlaying = currentPlayingSentenceId === Number(sentence.id);

  const previousWordIdRef = useRef<number | null>(null);

  const wordRefs = useRef<React.RefObject<ComponentRef<typeof TouchableOpacity>>[]>(
    words.map(() => createRef<ComponentRef<typeof TouchableOpacity>>())
  );

  const highlightOpacity = useSharedValue(0);

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

  previousWordIdRef.current = currentPlayingWordId || null;

  // Pre-calculate text styles since font size never changes
  const englishTextStyle = useMemo(
    () => [
      styles.englishText,
      {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * (settings.fontScale || 1),
        color: colors.text,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6 * (settings.fontScale || 1),
      },
    ],
    [colors.text, settings.fontScale]
  );

  // Memoize sentence background style to prevent recalculation
  const backgroundStyle = useMemo(
    () => [
      styles.sentenceBackground,
      {
        backgroundColor: colors.tint ? `${colors.tint}40` : Colors.light.transparent,
      },
      animatedHighlightStyle,
      isPlaying && styles.playingBackground,
    ],
    [colors.tint, animatedHighlightStyle, isPlaying]
  );

  // Memoize word rendering to prevent unnecessary re-renders
  const renderedWords = useMemo(() => {
    if (renderWord) {
      return words.map((word, index) => {
        const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
        const isWordHighlighted =
          currentPlayingWordId === wordId && currentPlayingPosition === index && isPlaying;
        return renderWord(word, isWordHighlighted, wordRefs.current[index]);
      });
    }

    return words.map((word, index) => {
      const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
      const isWordHighlighted =
        currentPlayingWordId === wordId && currentPlayingPosition === index && isPlaying;
      return (
        <ArabicWord
          key={`word-${word.id}-${word.position || sentence.id}`}
          word={word}
          onPress={word => onWordPress?.(word)}
          settings={settings}
          isAudioHighlighted={isWordHighlighted}
          wordRef={wordRefs.current[index]}
          position={index}
        />
      );
    });
  }, [
    renderWord,
    words,
    currentPlayingWordId,
    currentPlayingPosition,
    isPlaying,
    sentence.id,
    settings,
    onWordPress,
  ]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={backgroundStyle} />

      <View style={styles.wordsContainer}>{renderedWords}</View>

      {settings?.showEnglish && sentence.english ? (
        <Animated.Text style={englishTextStyle}>{sentence.english}</Animated.Text>
      ) : null}
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
  playingBackground: {
    borderColor: Colors.light.border,
    borderWidth: 1,
  },
  sentenceBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-start',
    minHeight: 40,
    paddingRight: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
});

export const ArticleSentence = memo(ArticleSentenceComponent, (prevProps, nextProps) => {
  // Only re-render on changes that actually affect rendering
  return (
    // Check playing state
    prevProps.currentPlayingSentenceId === nextProps.currentPlayingSentenceId &&
    prevProps.currentPlayingWordId === nextProps.currentPlayingWordId &&
    prevProps.currentPlayingPosition === nextProps.currentPlayingPosition &&
    // Check sentence identity
    prevProps.sentence.id === nextProps.sentence.id &&
    // Skip font scale check since it never changes
    prevProps.settings.showEnglish === nextProps.settings.showEnglish &&
    prevProps.settings.showTransliteration === nextProps.settings.showTransliteration &&
    // If words array changed - we need to re-render
    prevProps.words === nextProps.words
  );
});
