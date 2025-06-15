import { useLocalSearchParams } from 'expo-router';
import {
  createRef,
  useEffect,
  useRef,
  useMemo,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  StyleSheet,
  View,
  type TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, FONTS } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
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
  renderWord?: (word: SentenceWord) => ReactNode;
  onWordPress?: (word: SentenceWord) => void;
  settings: {
    showEnglish: boolean;
    fontScale: number;
  };
  colors: ThemeColors;
  containerStyle?: StyleProp<ViewStyle>;
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
  dueWordRootIds = EMPTY_DUE_WORDS_SET,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
  const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();

  // Store refs to each word for highlighting and playback control
  // Use ComponentRef to correctly type React Native component instances
  // Each ref may hold a TouchableOpacity instance or null
  const wordRefs = useRef<RefObject<ComponentRef<typeof TouchableOpacity>>[]>([]);
  const {
    animatedStyle: animatedHighlightStyle,
    startAnimation,
    reverseAnimation,
  } = useOpacityAnimation({ initialOpacity: 0 });

  useEffect(() => {
    // Recreate refs when the word list changes
    wordRefs.current = words.map(
      () =>
        createRef<ComponentRef<typeof TouchableOpacity>>() as RefObject<
          ComponentRef<typeof TouchableOpacity>
        >
    );
  }, [words]);

  useEffect(() => {
    if (isHighlighted) {
      startAnimation(0, reverseAnimation);
    }
  }, [isHighlighted, startAnimation, reverseAnimation]);

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
    () =>
      [
        styles.sentenceBackground,
        {
          backgroundColor: colors.tint ? `${colors.tint}40` : colors.transparent,
        },
        animatedHighlightStyle,
      ] as AnimatedStyleProp<ViewStyle>,
    [colors.tint, colors.transparent, animatedHighlightStyle]
  );

  const renderedWords = useMemo(() => {
    const renderWordWithProps = (word: SentenceWord, index: number) => {
      const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
      if (!wordRefs.current[index]) {
        wordRefs.current[index] = createRef<
          ComponentRef<typeof TouchableOpacity>
        >() as RefObject<ComponentRef<typeof TouchableOpacity>>;
      }
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;
      return renderWord ? (
        renderWord(word)
      ) : (
        <ArabicWord
          key={`word-${wordId}-${word.position || sentence.id}`}
          word={word}
          onPress={word => onWordPress?.(word)}
          settings={{ fontScale: settings.fontScale }}
          wordRef={wordRefs.current[index]}
          position={index}
          isDueWord={isDueWord}
        />
      );
    };

    return words.map((word, index) => {
      return renderWordWithProps(word, index);
    });
  }, [renderWord, words, sentence.id, settings, onWordPress, dueWordRootIds]);

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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
