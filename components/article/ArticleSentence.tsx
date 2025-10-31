import type { ComponentRef, RefObject } from 'react';
import { createRef, memo, useEffect, useMemo, useRef } from 'react';
import type { LayoutRectangle, Pressable, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SkiaArabicWord as ArabicWord } from '@/components/article/SkiaArabicWord';
import { FONTS, LAYOUT } from '@/constants/layout';
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
}

const ArticleSentenceInternal = function ArticleSentence({
  sentence,
  words,
  onWordPress,
  settings,
  colors: propColors,
  containerStyle,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;

  const wordRefs = useRef<RefObject<ComponentRef<typeof Pressable>>[]>([]);

  useEffect(() => {
    wordRefs.current = words.map(() => createRef<ComponentRef<typeof Pressable>>()) as RefObject<
      ComponentRef<typeof Pressable>
    >[];
  }, [words]);

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
  const renderedWords = useMemo(() => {
    return words.map((word, index) => {
      const wordId = typeof word.id === 'string' ? Number(word.id) : word.id;
      if (!wordRefs.current[index]) {
        wordRefs.current[index] = createRef<ComponentRef<typeof Pressable>>() as RefObject<
          ComponentRef<typeof Pressable>
        >;
      }

      return (
        <ArabicWord
          key={`word-${wordId}-${word.position}-${sentence.id}`}
          word={word}
          onTooltipOpen={onWordPress}
          wordRef={wordRefs.current[index]}
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
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    ...createPadding({ horizontal: 'MEDIUM', vertical: 'SMALL' }),
    width: '100%',
  },
});
